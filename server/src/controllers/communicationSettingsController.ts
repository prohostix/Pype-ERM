import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import nodemailer from 'nodemailer';
import axios from 'axios';
import {
  renderBrandedEmailHtml,
  buildCredentialsEmail,
  buildAdmissionEmail,
  buildFeeReceiptEmail,
  OrganizationBrandInfo
} from '../utils/emailTemplate.js';

const DEFAULT_TEMPLATES = {
  admission_confirmation: {
    enabled: true,
    templateId: '',
    exampleText: 'Dear {{1}}, your admission for {{2}} has been confirmed. Your Student ID is {{3}}.'
  },
  fee_receipt: {
    enabled: true,
    templateId: '',
    exampleText: 'Dear {{1}}, payment of Rs. {{2}} against receipt #{{3}} was received successfully. Download official receipt: {{4}}. Thank you!'
  },
  payment_reminder: {
    enabled: true,
    templateId: '',
    exampleText: 'Dear {{1}}, your fee installment of Rs. {{2}} is due on {{3}}. Please pay to avoid late fees.'
  },
  lead_welcome: {
    enabled: true,
    templateId: '',
    exampleText: 'Hello {{1}}, thank you for inquiring with {{2}}. Our admissions team will reach out to you shortly.'
  }
};

const DEFAULT_SETTINGS = {
  smtp: {
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
  },
  whatsapp: {
    enabled: false,
    apiKey: '',
    appName: '',
    sourceNumber: '',
    templates: DEFAULT_TEMPLATES
  }
};

export const getCommunicationSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.query.organizationId
    ? (req.query.organizationId as string)
    : req.user.organizationId;

  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, metadata: true }
  });

  if (!org) {
    return res.status(404).json({ success: false, message: 'Organization not found' });
  }

  const metadata = (org.metadata as any) || {};
  const comm = metadata.communicationSettings || {};

  const smtp = {
    ...DEFAULT_SETTINGS.smtp,
    ...(comm.smtp || {}),
    hasStoredPassword: Boolean(comm.smtp?.pass),
    pass: comm.smtp?.pass ? '••••••••' : ''
  };

  const whatsapp = {
    ...DEFAULT_SETTINGS.whatsapp,
    ...(comm.whatsapp || {}),
    templates: {
      ...DEFAULT_TEMPLATES,
      ...(comm.whatsapp?.templates || {})
    },
    hasStoredApiKey: Boolean(comm.whatsapp?.apiKey),
    apiKey: comm.whatsapp?.apiKey ? '••••••••' : '',
  };

  res.status(200).json({
    success: true,
    data: { smtp, whatsapp }
  });
});

export const updateCommunicationSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.body.organizationId
    ? req.body.organizationId
    : req.user.organizationId;

  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, metadata: true }
  });

  if (!org) {
    return res.status(404).json({ success: false, message: 'Organization not found' });
  }

  const existingMetadata = (org.metadata as any) || {};
  const existingComm = existingMetadata.communicationSettings || {};
  const existingSmtp = existingComm.smtp || {};
  const existingWa = existingComm.whatsapp || {};

  const { smtp, whatsapp } = req.body;

  const newSmtp = smtp ? {
    ...DEFAULT_SETTINGS.smtp,
    ...existingSmtp,
    ...smtp,
    // Preserve password if sent as mask or empty
    pass: (smtp.pass && smtp.pass !== '••••••••') ? smtp.pass : existingSmtp.pass || ''
  } : existingSmtp;

  const newWhatsApp = whatsapp ? {
    ...DEFAULT_SETTINGS.whatsapp,
    ...existingWa,
    ...whatsapp,
    // Preserve apiKey if sent as mask or empty
    apiKey: (whatsapp.apiKey && whatsapp.apiKey !== '••••••••') ? whatsapp.apiKey : existingWa.apiKey || '',
    appName: whatsapp.appName !== undefined ? whatsapp.appName : existingWa.appName || '',
    sourceNumber: whatsapp.sourceNumber !== undefined ? whatsapp.sourceNumber : existingWa.sourceNumber || '',
    enabled: Boolean(whatsapp.enabled),
    templates: {
      ...DEFAULT_TEMPLATES,
      ...(existingWa.templates || {}),
      ...(whatsapp.templates || {})
    }
  } : existingWa;

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      metadata: {
        ...existingMetadata,
        communicationSettings: {
          smtp: newSmtp,
          whatsapp: newWhatsApp
        }
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Communication settings updated successfully'
  });
});

export const testSmtpSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.body.organizationId
    ? req.body.organizationId
    : req.user.organizationId;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      logo: true,
      email: true,
      phone: true,
      address: true,
      loginBranding: true,
      metadata: true
    }
  });

  const existingSmtp = (org?.metadata as any)?.communicationSettings?.smtp || {};

  let { host, port, secure, user, pass, fromEmail, fromName, targetEmail } = req.body;

  if (!pass || pass === '••••••••') {
    pass = existingSmtp.pass;
  }
  if (!host) host = existingSmtp.host;
  if (!user) user = existingSmtp.user;
  if (!port) port = existingSmtp.port || 587;
  if (secure === undefined) secure = existingSmtp.secure || false;
  if (!fromEmail) fromEmail = existingSmtp.fromEmail || user;
  if (!fromName) fromName = existingSmtp.fromName || org?.name || 'Pype ERM';

  if (!host || !user || !pass) {
    return res.status(400).json({
      success: false,
      message: 'SMTP Host, Username, and Password are required for testing'
    });
  }

  const portNum = Number(port);
  const isSecure = portNum === 465 ? true : (portNum === 587 || portNum === 25 ? false : Boolean(secure));
  const passSource = (req.body.pass && req.body.pass !== '••••••••') ? 'Provided in Request' : (existingSmtp.pass ? 'Loaded from Stored DB Settings' : 'MISSING');
  const maskedPass = pass ? `${pass.substring(0, 2)}***${pass.slice(-2)} (len: ${pass.length})` : 'NONE';

  console.log('================ [SMTP TEST INITIATED] ================');
  console.log(`🏢 Organization: ${org?.name || 'Unknown'} (ID: ${orgId})`);
  console.log(`🌐 Host: ${host}`);
  console.log(`🔌 Port: ${portNum}`);
  console.log(`🔒 Encryption: ${isSecure ? 'Direct SSL/TLS (Port 465)' : 'STARTTLS (Port 587/25)'}`);
  console.log(`👤 User: ${user}`);
  console.log(`🔑 Password Source: ${passSource} [${maskedPass}]`);
  console.log(`✉️ From: ${fromName ? `"${fromName}" <${fromEmail}>` : fromEmail}`);
  console.log(`🎯 Test Recipient: ${targetEmail || 'None (Connection verification only)'}`);
  console.log('-------------------------------------------------------');

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: isSecure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log(`⏳ Attempting SMTP transporter.verify() with ${host}:${portNum}...`);
    await transporter.verify();
    console.log('✅ transporter.verify() SUCCEEDED!');

    // If target email provided, send a branded test email
    if (targetEmail) {
      const fromAddr = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
      console.log(`📤 Sending test email to ${targetEmail} via ${fromAddr}...`);

      const loginBranding = org?.loginBranding as any;
      const testEmailHtml = renderBrandedEmailHtml({
        org: {
          name: org?.name || 'Educational Institution',
          logo: org?.logo || loginBranding?.logoUrl || null,
          email: org?.email,
          phone: org?.phone,
          address: org?.address,
          brandColor: loginBranding?.primaryColor || '#1e40af',
          portalUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
          fromName: fromName || org?.name || 'Educational Institution'
        },
        title: 'SMTP Mail Delivery Verified',
        subtitle: `Your organization (${org?.name || 'Pype ERM'}) has successfully configured outgoing email routing.`,
        recipientName: targetEmail.split('@')[0],
        badgeText: 'Live Delivery Verified',
        badgeType: 'success',
        contentHtml: `<p>This is a live verification email confirming that all automated institutional emails (such as student admissions, portal login credentials, and payment receipts) will be delivered cleanly from your custom SMTP server.</p>`,
        details: [
          { label: 'Outgoing Mail Server', value: host },
          { label: 'Port & Encryption', value: `${portNum} (${isSecure ? 'Direct SSL/TLS' : 'STARTTLS'})` },
          { label: 'Authenticated Mailbox', value: user },
          { label: 'From Address Header', value: fromAddr, highlight: true }
        ],
        actionButton: {
          label: 'Visit Your Organization Portal',
          url: process.env.FRONTEND_URL || 'http://localhost:5173'
        },
        secondaryNote: '<strong>Organization Note:</strong> All future notifications sent to students and parents will feature this branded design along with your official logo, contact details, and address.'
      });

      await transporter.sendMail({
        from: fromAddr,
        to: targetEmail,
        subject: `[Test] SMTP Configuration Verified - ${org?.name || 'Pype ERM'}`,
        text: `Hello!\n\nThis is a verification email from ${org?.name || 'your organization'}. Your SMTP settings are working perfectly!\n\nHost: ${host}\nPort: ${portNum}\nSender: ${fromAddr}`,
        html: testEmailHtml
      });
      console.log(`✅ Test email successfully dispatched to ${targetEmail}!`);
    }

    console.log('================ [SMTP TEST COMPLETED SUCCESSFULLY] ================');

    res.status(200).json({
      success: true,
      message: targetEmail
        ? `SMTP verified successfully! Test email delivered to ${targetEmail}.`
        : 'SMTP credentials verified successfully!'
    });
  } catch (error: any) {
    console.error('❌ SMTP verification FAILED!');
    console.error('   Error Code:', error?.code);
    console.error('   Response Code:', error?.responseCode);
    console.error('   Command:', error?.command);
    console.error('   Message:', error?.message);
    console.log('====================================================================');

    let message = error?.message || 'Failed to authenticate with SMTP server. Please verify your host, port, username, and password.';

    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
      if (host && (host.includes('gmail') || host.includes('google'))) {
        message = 'Invalid Gmail credentials (535): Google does NOT accept your normal account password for SMTP. You must enable 2-Step Verification on your Google Account and generate a 16-character "App Password" (from myaccount.google.com/apppasswords).';
      } else if (host && host.includes('zoho')) {
        if (host.includes('.com')) {
          message = 'Zoho Authentication Failed (535): If your Zoho account is hosted in India, change Host from smtp.zoho.com to smtp.zoho.in. Also make sure to use an Application-Specific Password if 2FA is active.';
        } else {
          message = 'Zoho Authentication Failed (535): Please verify your email and password. If 2FA is enabled on your Zoho account, you must generate an Application-Specific Password from accounts.zoho.in.';
        }
      } else {
        message = 'Invalid login (535): Username or password rejected by the mail server. Please check your SMTP username and password.';
      }
    } else if (error?.responseCode === 550 || error?.message?.includes('UnblockMe') || error?.message?.includes('Unusual sending activity')) {
      message = 'Zoho Outgoing Restricted (550 5.4.6): Credentials and SMTP connection verified, but Zoho has temporarily paused outgoing emails for safety. Please open https://mail.zoho.in/UnblockMe in your browser to unblock your account.';
    } else if (error?.message && (error.message.includes('wrong version number') || error.message.includes('tls_validate_record_header'))) {
      message = 'SSL/TLS Protocol Mismatch: Port 587 uses STARTTLS (SSL/TLS switch must be OFF). For direct SSL/TLS encryption, please use Port 465.';
    }

    res.status(400).json({
      success: false,
      message
    });
  }
});

export const testWhatsAppSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.body.organizationId
    ? req.body.organizationId
    : req.user.organizationId;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, metadata: true }
  });

  const existingWa = (org?.metadata as any)?.communicationSettings?.whatsapp || {};

  let apiKey = req.body.apiKey && req.body.apiKey !== '••••••••' ? req.body.apiKey : existingWa.apiKey;
  let appName = req.body.appName !== undefined ? req.body.appName : existingWa.appName;
  let sourceNumber = req.body.sourceNumber !== undefined ? req.body.sourceNumber : existingWa.sourceNumber;

  const { targetPhone, testMode, templateId, templateParams, testMessage } = req.body;

  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'Gupshup API Key is required' });
  }

  if (!sourceNumber) {
    return res.status(400).json({ success: false, message: 'Gupshup Source WhatsApp Phone Number is required' });
  }

  if (!targetPhone) {
    return res.status(400).json({ success: false, message: 'Target recipient phone number is required' });
  }

  let destination = targetPhone.replace(/[^0-9]/g, '');
  if (destination.length === 10) {
    destination = `91${destination}`;
  }

  const source = sourceNumber.replace(/[^0-9]/g, '');

  console.log('================ [GUPSHUP WHATSAPP TEST INITIATED] ================');
  console.log(`🏢 Organization: ${org?.name || 'Unknown'} (ID: ${orgId})`);
  console.log(`📱 Gupshup Source: ${source}`);
  console.log(`🎯 Destination Phone: ${destination}`);
  console.log(`🏷️ App Name: ${appName}`);
  console.log(`🧪 Test Mode: ${testMode === 'template' ? 'Template Message (HSM)' : 'Session Message (Text)'}`);
  if (testMode === 'template') {
    console.log(`📋 Template ID: ${templateId}`);
    console.log(`🔢 Template Params:`, templateParams);
  } else {
    console.log(`💬 Text Message: ${testMessage || 'Default test greeting'}`);
  }
  console.log('--------------------------------------------------------------------');

  try {
    // If testing a Template Message (HSM)
    if (testMode === 'template' && templateId) {
      const payload = new URLSearchParams();
      payload.append('source', source);
      payload.append('destination', destination);
      payload.append('template', JSON.stringify({
        id: templateId,
        params: Array.isArray(templateParams) ? templateParams : [org?.name || 'Pype ERM']
      }));
      if (appName) {
        payload.append('src.name', appName);
      }

      console.log(`⏳ Sending POST to https://api.gupshup.io/wa/api/v1/template/msg...`);
      console.log(`📦 Payload:`, payload.toString());

      const response = await axios.post(
        'https://api.gupshup.io/wa/api/v1/template/msg',
        payload.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            apikey: apiKey,
            'Cache-Control': 'no-cache'
          }
        }
      );

      const data = response.data;
      console.log('📡 Gupshup Template Response:', response.status, data);
      console.log('====================================================================');

      const isSuccess = response.status === 200 || response.status === 202 || data?.status === 'submitted' || data?.status === 'success';

      if (isSuccess) {
        return res.status(200).json({
          success: true,
          message: `Gupshup Template (${templateId}) dispatched successfully! Status: ${data?.status || 'Submitted'}, Message ID: ${data?.messageId || data?.id}`,
          data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: data?.message || 'Gupshup returned an error for this template',
          data
        });
      }
    }

    // Default: Plain Text / Session Message
    const defaultMsg = testMessage || `Hello from ${org?.name || 'Pype ERM'}! Your Gupshup WhatsApp integration is verified.`;
    const payload = new URLSearchParams();
    payload.append('channel', 'whatsapp');
    payload.append('source', source);
    payload.append('destination', destination);
    payload.append('message', JSON.stringify({ type: 'text', text: defaultMsg }));
    if (appName) {
      payload.append('src.name', appName);
    }

    console.log(`⏳ Sending POST to https://api.gupshup.io/wa/api/v1/msg (Session Message)...`);
    console.log(`📦 Payload:`, payload.toString());

    const response = await axios.post(
      'https://api.gupshup.io/wa/api/v1/msg',
      payload.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          apikey: apiKey,
          'Cache-Control': 'no-cache'
        }
      }
    );

    const data = response.data;
    console.log('📡 Gupshup Session Msg Response:', response.status, data);
    console.log('====================================================================');

    const isSuccess = response.status === 200 || response.status === 202 || data?.status === 'submitted' || data?.status === 'success';

    if (isSuccess) {
      return res.status(200).json({
        success: true,
        message: `Gupshup text message submitted (ID: ${data?.messageId || data?.id}). NOTE: WhatsApp policy blocks plain text delivery unless this phone has replied to ${source} in the last 24 hours. For guaranteed delivery, test using an approved Template.`,
        data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: data?.message || 'Gupshup returned an error response',
        data
      });
    }
  } catch (error: any) {
    console.error('❌ Gupshup WhatsApp test dispatch FAILED!');
    console.error('   Error Data:', error?.response?.data || error?.message);
    console.log('====================================================================');

    const errData = error?.response?.data;
    const errMsg = errData?.message || errData?.error?.message || error?.message || 'Failed to dispatch message via Gupshup';
    return res.status(400).json({
      success: false,
      message: errMsg
    });
  }
});

export const getEmailTemplatePreview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.query.organizationId
    ? (req.query.organizationId as string)
    : req.user.organizationId;

  const type = (req.query.type as string) || 'credentials';

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      logo: true,
      email: true,
      phone: true,
      address: true,
      loginBranding: true,
      metadata: true
    }
  });

  if (!org) {
    return res.status(404).json({ success: false, message: 'Organization not found' });
  }

  const loginBranding = org.loginBranding as any;
  const brandInfo: OrganizationBrandInfo = {
    name: org.name || 'Educational Institution',
    logo: org.logo || loginBranding?.logoUrl || null,
    email: org.email,
    phone: org.phone,
    address: org.address,
    brandColor: loginBranding?.primaryColor || '#1e40af',
    portalUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    fromName: (org.metadata as any)?.communicationSettings?.smtp?.fromName || org.name
  };

  let rendered: { subject: string; text: string; html: string };

  switch (type) {
    case 'admission':
      rendered = buildAdmissionEmail({
        org: brandInfo,
        recipientName: 'Rahul Sharma',
        programName: 'Bachelor of Computer Applications (BCA)',
        admissionNo: 'ADM-2026-0891',
        sessionName: 'Academic Year 2026 - 2027'
      });
      break;
    case 'receipt':
      rendered = buildFeeReceiptEmail({
        org: brandInfo,
        recipientName: 'Rahul Sharma',
        amount: 25000,
        receiptNo: 'REC-2026-90812',
        paymentDate: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
        paymentMode: 'Online UPI',
        balanceAmount: 15000
      });
      break;
    case 'credentials':
    default:
      rendered = buildCredentialsEmail({
        org: brandInfo,
        recipientName: 'Rahul Sharma',
        email: 'rahul.student@example.com',
        password: 'Pass•84K9L2',
        userId: 'STU-2026-042',
        roleTitle: 'Student'
      });
      break;
  }

  res.status(200).json({
    success: true,
    data: {
      type,
      brandInfo,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html
    }
  });
});

/**
 * Lists communication audit logs for the organization with filters & stats
 */
export const getOrgCommunicationLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.role === 'superadmin' && req.query.organizationId
    ? (req.query.organizationId as string)
    : req.user.organizationId;

  if (!orgId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  const { type, status, search, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { organizationId: orgId };
  if (type && type !== 'all') {
    where.type = type as string;
  }
  if (status && status !== 'all') {
    where.status = status as string;
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { recipient: { contains: q, mode: 'insensitive' } },
      { recipientName: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } }
    ];
  }

  const [total, logs, sentCount, failedCount, emailCount, whatsappCount] = await Promise.all([
    prisma.communicationLog.count({ where }),
    prisma.communicationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.communicationLog.count({ where: { organizationId: orgId, status: 'sent' } }),
    prisma.communicationLog.count({ where: { organizationId: orgId, status: 'failed' } }),
    prisma.communicationLog.count({ where: { organizationId: orgId, type: 'email' } }),
    prisma.communicationLog.count({ where: { organizationId: orgId, type: 'whatsapp' } })
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      },
      stats: {
        total: sentCount + failedCount,
        sent: sentCount,
        failed: failedCount,
        emailCount,
        whatsappCount
      }
    }
  });
});

/**
 * Resends a failed or previously sent communication message
 */
export const resendOrgCommunicationLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.role === 'superadmin' && req.query.organizationId
    ? (req.query.organizationId as string)
    : req.user.organizationId;

  const { resendCommunication } = await import('../utils/communicationAudit.js');
  const result = await resendCommunication(id, orgId);

  res.status(200).json(result);
});

