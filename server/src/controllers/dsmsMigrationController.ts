import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const migrateFromDsms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { dsmsUrl, username, password } = req.body;
  const organizationId = req.user.organizationId;

  if (!dsmsUrl || !username || !password) {
    res.status(400).json({ success: false, message: 'DSMS URL, Username, and Password are required' });
    return;
  }

  // Ensure URL is properly formatted and extract origin
  let baseUrl = dsmsUrl.replace(/\/$/, '');
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  try {
    const parsed = new URL(baseUrl);
    baseUrl = parsed.origin;
  } catch (e) {
    baseUrl = baseUrl.split('/backend')[0];
  }

  const loginUrl = `${baseUrl}/backend/web/index.php?r=site%2Flogin`;
  const studentsUrl = `${baseUrl}/backend/web/index.php?r=master/students`;
  const programsUrl = `${baseUrl}/backend/web/index.php?r=master/coursemaster`;

  try {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));

    // 1. Fetch CSRF token
    const initialRes = await client.get(loginUrl);
    const $login = cheerio.load(initialRes.data);
    const csrfToken = $login('meta[name="csrf-token"]').attr('content');

    if (!csrfToken) {
      res.status(400).json({ success: false, message: 'Could not find CSRF token. Make sure the DSMS URL is correct.' });
      return;
    }

    // 2. Perform Login
    const loginData = new URLSearchParams();
    loginData.append('_csrf', csrfToken);
    loginData.append('LoginForm[username]', username);
    loginData.append('LoginForm[password]', password);
    loginData.append('LoginForm[rememberMe]', '0');
    loginData.append('login-button', '');

    const loginResponse = await client.post(loginUrl, loginData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': loginUrl
      },
      maxRedirects: 5
    });

    if (loginResponse.request.res.responseUrl.includes('site%2Flogin')) {
      const $error = cheerio.load(loginResponse.data);
      const errorText = $error('.help-block-error').text().trim() || 'Invalid credentials';
      res.status(401).json({ success: false, message: `DSMS Login Failed: ${errorText}` });
      return;
    }

    // Login Successful, begin extraction
    let programsMigrated = 0;
    let studentsMigrated = 0;
    let paymentsMigrated = 0;
    let leadsMigrated = 0;
    let errors: string[] = [];

    // --- A. Scrape Programs ---
    // Programs require a University. Create or find a generic DSMS University.
    let defaultUniversity = await prisma.university.findFirst({
      where: { name: 'DSMS Legacy University', organizationId }
    });
    if (!defaultUniversity) {
      defaultUniversity = await prisma.university.create({
        data: {
          organizationId,
          name: 'DSMS Legacy University',
          code: 'DSMS',
          status: 'active'
        }
      });
    }

    const progRes = await client.get(programsUrl);
    const $prog = cheerio.load(progRes.data);
    
    const programsMap = new Map<string, string>(); // DSMS Course Name -> Pype-ERM Program ID

    const progPromises: any[] = [];
    $prog('table.table tbody tr').each((i, el) => {
      const tds = $prog(el).find('td');
      if (tds.length >= 2) {
        const courseName = $prog(tds[1]).text().trim();
        if (courseName && courseName !== 'No results found.') {
          // Attempt to find or create program
          progPromises.push(
            (async () => {
              try {
                let p = await prisma.program.findFirst({
                  where: { name: courseName, organizationId }
                });
                if (!p) {
                  p = await prisma.program.create({
                    data: {
                      organizationId,
                      universityId: defaultUniversity.id,
                      name: courseName,
                      code: courseName.substring(0, 10).toUpperCase().replace(/\s/g, ''),
                      duration: 3, // Default
                      status: 'active'
                    }
                  });
                  programsMigrated++;
                }
                programsMap.set(courseName, p.id);
              } catch (e: any) {
                errors.push(`Program error: ${e.message}`);
              }
            })()
          );
        }
      }
    });
    await Promise.all(progPromises);


    // --- B. Scrape Students ---
    const stuRes = await client.get(studentsUrl);
    const $stu = cheerio.load(stuRes.data);
    try {
      const bcrypt = await import('bcryptjs');
      const defaultPassword = await bcrypt.hash('Student@123', 10);
      const defaultUserIdPrefix = 'DSMS-';

      const studentsUrl = `${baseUrl}/backend/web/index.php?r=master/students`;
      let page = 1;
      let hasMoreStudents = true;

      while (hasMoreStudents) {
        let pageUrl = studentsUrl;
        if (page > 1) {
          pageUrl = `${studentsUrl}&page=${page}`;
        }
        
        const pRes = await client.get(pageUrl);
        const $p = cheerio.load(pRes.data);
        
        const rows = $p('table.table tbody tr');
        if (rows.length === 0 || rows.text().includes('No results found.')) {
          hasMoreStudents = false;
          break;
        }

        // Process students sequentially to prevent race conditions on StudyCenter creation
        const rowsArray = rows.toArray();
        for (const el of rowsArray) {
        const tds = $p(el).find('td');
        if (tds.length >= 6) {
          const rawAdmissionNo = $p(tds[1]).text().trim();
          const safeAdmissionNo = rawAdmissionNo || `TMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          const name = $p(tds[2]).text().trim();
          const email = $p(tds[3]).text().trim() || `${safeAdmissionNo}@dsms-import.com`;
          const phone = $p(tds[4]).text().trim();
          const courseName = $p(tds[5]).text().trim();
          const viewHref = $p(el).find('a[title="View"]').attr('href') || $p(el).find('a').first().attr('href');
          
          if (name && name !== 'No results found.') {
            try {
              const existingStu = await prisma.student.findFirst({
                    where: { OR: [{ email }, { enrollmentNo: safeAdmissionNo }], organizationId }
                  });

                  if (!existingStu) {
                    const programId = programsMap.get(courseName);
                    if (!programId) throw new Error(`Program not mapped: ${courseName}`);

                    let meta: Record<string, string> = {};
                    let vUrl = '';
                    let $v: any = null;

                    if (viewHref) {
                      vUrl = baseUrl + (viewHref.startsWith('/') ? viewHref : '/' + viewHref);
                      const vRes = await client.get(vUrl);
                      $v = cheerio.load(vRes.data);
                      
                      $v('table').eq(1).find('tr').each((i: number, el: any) => {
                        const key = $v(el).find('th').text().trim();
                        const val = $v(el).find('td').text().trim();
                        if (key && val) {
                          meta[key] = val;
                        }
                      });
                    }

                    const enrichedName = meta['Student Name'] ? meta['Student Name'].replace(/^(Mr|Ms|Mrs)\s+/i, '').trim() : name;
                    const enrichedEmail = meta['Email'] || email;
                    const enrichedPhone = meta['Mobile'] || meta['Phone'] || phone;
                    const address = meta['Present Address'] || meta['Permanent Address'] || 'Imported from DSMS';
                    
                    let centerId: string | undefined = undefined;
                    const centerName = meta['Place Or Subcenter'];
                    if (centerName) {
                      let center = await prisma.studyCenter.findFirst({
                        where: { name: centerName, organizationId }
                      });
                      if (!center) {
                        center = await prisma.studyCenter.create({
                          data: {
                            organizationId,
                            name: centerName,
                            code: `${centerName.substring(0, 5).toUpperCase().replace(/\s/g, '')}_${Math.floor(Math.random()*10000)}`,
                            status: 'active'
                          }
                        });
                      }
                      centerId = center.id;
                    }

                    const user = await prisma.user.create({
                      data: {
                        organizationId,
                        userId: `${defaultUserIdPrefix}${Date.now()}${Math.floor(Math.random()*1000)}`,
                        email: enrichedEmail,
                        password: defaultPassword,
                        name: enrichedName,
                        role: 'staff', // Student role
                        phone: enrichedPhone,
                        status: 'active'
                      }
                    });

                    const student = await prisma.student.create({
                      data: {
                        organizationId,
                        name: enrichedName,
                        email: enrichedEmail,
                        phone: enrichedPhone,
                        admissionNo: rawAdmissionNo || null,
                        enrollmentNo: safeAdmissionNo,
                        programId,
                        centerId,
                        status: 'active',
                        address,
                        enrolledBy: req.user.id,
                        credentials: { email: enrichedEmail, password: 'Student@123' },
                        admissionProgress: {
                          documents: 'approved',
                          studentPhoto: 'approved',
                          applicationForm: 'approved'
                        }
                      }
                    });

                    await prisma.enrollment.create({
                      data: {
                        organizationId,
                        studentId: student.id,
                        studentName: student.name,
                        studentEmail: student.email,
                        studentPhone: student.phone,
                        studentAddress: student.address || '',
                        programId,
                        status: 'active'
                      }
                    });
                    
                    studentsMigrated++;
                    
                    // --- Parse Payments from Student Detail Page ---
                    if ($v) {
                      
                      // Payment history is typically in the 5th table (index 4)
                      const payments: any[] = [];
                      $v('table').eq(4).find('tbody tr').each((pi: any, pel: any) => {
                        const pTds = $v(pel).find('td');
                        if (pTds.length >= 8) {
                          const recNo = $v(pTds[4]).text().trim();
                          const dateStr = $v(pTds[5]).text().trim(); // DD-MM-YYYY
                          const amount = parseFloat($v(pTds[8]).text().trim().replace(/,/g, '')) || 0;
                          
                          if (recNo && amount > 0) {
                            payments.push({ recNo, dateStr, amount });
                          }
                        }
                      });

                      for (const p of payments) {
                        try {
                          // Convert DD-MM-YYYY to valid ISO date
                          let parsedDate = new Date();
                          if (p.dateStr) {
                            const parts = p.dateStr.split('-');
                            if (parts.length === 3) {
                              parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                            }
                          }
                          
                          // Create placeholder invoice to attach payment
                          const safeInvoiceNo = `INV-DSMS-${p.recNo}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                          const invoice = await prisma.invoice.create({
                            data: {
                              organizationId,
                              studentId: student.id,
                              invoiceNo: safeInvoiceNo,
                              amount: p.amount,
                              total: p.amount,
                              status: 'paid',
                              paidAt: parsedDate,
                              createdAt: parsedDate
                            }
                          });

                          await prisma.paymentEntry.create({
                            data: {
                              organizationId,
                              invoiceId: invoice.id,
                              amount: p.amount,
                              method: 'import',
                              referenceNo: p.recNo,
                              receivedBy: req.user.id,
                              receivedAt: parsedDate,
                              createdAt: parsedDate
                            }
                          });
                          
                          paymentsMigrated++;
                        } catch (pe) {
                          // Skip if invoice already exists or error
                        }
                      }
                    }

                  }
            } catch (e: any) {
              errors.push(`Student ${name} error: ${e.message}`);
            }
          }
        }
        }
      await sleep(200); // polite delay
      page++;
    }
    } catch (e: any) {
      errors.push(`Students scrape error: ${e.message}`);
    }

    // --- D. Scrape Enquiries (Leads) ---
    try {
      const enquiryBaseUrl = `${baseUrl}/backend/web/index.php?r=enquiry/enquiry`;
      let leadPage = 1;
      let hasMoreLeads = true;

      while (hasMoreLeads) {
        let pageUrl = enquiryBaseUrl;
        if (leadPage > 1) {
          pageUrl = `${enquiryBaseUrl}&page=${leadPage}`;
        }

        const eRes = await client.get(pageUrl);
        const $e = cheerio.load(eRes.data);
        
        const rows = $e('table.table tbody tr');
        if (rows.length === 0 || rows.text().includes('No results found.')) {
          hasMoreLeads = false;
          break;
        }

        const leadRowsArray = rows.toArray();
        for (const el of leadRowsArray) {
        const tds = $e(el).find('td');
        if (tds.length >= 8) {
          const centerName = $e(tds[1]).text().trim();
          const contactName = $e(tds[6]).text().trim() || 'Unknown';
          const phone = $e(tds[7]).text().trim() || '0000000000';
          
          if (contactName !== 'No results found.') {
            try {
              const existingLead = await prisma.lead.findFirst({
                    where: { phone, organizationId }
                  });
                  if (!existingLead) {
                    await prisma.lead.create({
                      data: {
                        organizationId,
                        centerName,
                        contactName,
                        email: `${phone}@dsms-enquiry.com`,
                        phone,
                        address: 'Imported from DSMS Enquiry',
                        source: 'DSMS Migration',
                        status: 'new'
                      }
                    });
                    leadsMigrated++;
                  }
            } catch (e: any) {
              errors.push(`Lead error: ${e.message}`);
            }
          }
        }
        }
      await sleep(200);
      leadPage++;
    } // End of while loop
    } catch (e: any) {
      errors.push(`Failed to fetch enquiries: ${e.message}`);
    }

    res.json({
      success: true,
      data: {
        programsMigrated,
        studentsMigrated,
        paymentsMigrated,
        leadsMigrated,
        errors
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
