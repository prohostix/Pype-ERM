import nodemailer from 'nodemailer';
import prisma from '../lib/prisma.js';
import {
  OrganizationBrandInfo,
  renderBrandedEmailHtml,
  buildCredentialsEmail,
  buildAdmissionEmail,
  buildFeeReceiptEmail
} from './emailTemplate.js';

/**
 * Retrieves the full branding details for an organization
 */
export async function getOrganizationBrandInfo(organizationId: string): Promise<OrganizationBrandInfo> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
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

  const commSettings = (org?.metadata as any)?.communicationSettings;
  const smtp = commSettings?.smtp;
  const loginBranding = org?.loginBranding as any;

  return {
    name: org?.name || 'Educational Institution',
    logo: org?.logo || loginBranding?.logoUrl || null,
    email: org?.email,
    phone: org?.phone,
    address: org?.address,
    brandColor: loginBranding?.primaryColor || '#1e40af',
    portalUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    fromName: smtp?.fromName || org?.name || 'Educational Institution'
  };
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

/**
 * Core sendEmail function with automatic organization SMTP routing
 * and branded HTML layout wrapper
 */
export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string,
  organizationId?: string,
  attachments?: EmailAttachment[]
) => {
  let host = process.env.SMTP_HOST;
  let port = Number(process.env.SMTP_PORT) || 587;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let from = process.env.SMTP_FROM || 'noreply@pypeerm.com';
  let orgName = '';
  let finalHtml = html;

  if (organizationId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
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

      orgName = org?.name || '';
      const commSettings = (org?.metadata as any)?.communicationSettings;
      const smtp = commSettings?.smtp;

      if (smtp && smtp.enabled && smtp.host && smtp.user) {
        host = smtp.host;
        port = Number(smtp.port) || 587;
        user = smtp.user;
        pass = smtp.pass;
        from = smtp.fromName
          ? `"${smtp.fromName}" <${smtp.fromEmail || smtp.user}>`
          : (smtp.fromEmail || smtp.user);
        console.log(`[EmailService] Using organization custom SMTP (${orgName})`);
      }

      // Automatically wrap plain snippets in branded institutional HTML template
      if (org && html && !html.includes('<!DOCTYPE') && !html.includes('<html')) {
        const loginBranding = org.loginBranding as any;
        finalHtml = renderBrandedEmailHtml({
          org: {
            name: org.name,
            logo: org.logo || loginBranding?.logoUrl || null,
            email: org.email,
            phone: org.phone,
            address: org.address,
            brandColor: loginBranding?.primaryColor || '#1e40af',
            portalUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
            fromName: smtp?.fromName || org.name
          },
          title: subject,
          contentHtml: html
        });
      }
    } catch (e) {
      console.error('[EmailService] Failed to retrieve organization SMTP settings, using default:', e);
    }
  }

  console.log('----------------------------------------');
  console.log(`✉️ Sending Email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`From: ${from}`);
  if (attachments && attachments.length > 0) {
    console.log(`📎 Attachments: ${attachments.map(a => a.filename).join(', ')}`);
  }
  console.log('----------------------------------------');

  if (!host || !user || !pass) {
    console.log('⚠️ SMTP host, user, or pass not configured. Email logged to console.');
    return;
  }

  try {
    const isSecure = port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: finalHtml,
      attachments
    });
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (err: any) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
  }
};

/**
 * Dispatches a Student Account Credentials Email with full Organization branding
 */
export async function sendBrandedStudentCredentials(options: {
  to: string;
  recipientName: string;
  email: string;
  password: string;
  userId?: string;
  loginUrl?: string;
  roleTitle?: string;
  organizationId: string;
}) {
  const brand = await getOrganizationBrandInfo(options.organizationId);
  const emailContent = buildCredentialsEmail({
    org: brand,
    recipientName: options.recipientName,
    email: options.email,
    password: options.password,
    userId: options.userId,
    loginUrl: options.loginUrl,
    roleTitle: options.roleTitle
  });

  return sendEmail(
    options.to,
    emailContent.subject,
    emailContent.text,
    emailContent.html,
    options.organizationId
  );
}

/**
 * Dispatches a Student Admission Confirmation Email with full Organization branding
 */
export async function sendBrandedAdmissionConfirmation(options: {
  to: string;
  recipientName: string;
  programName: string;
  admissionNo: string;
  sessionName?: string;
  loginUrl?: string;
  organizationId: string;
}) {
  const brand = await getOrganizationBrandInfo(options.organizationId);
  const emailContent = buildAdmissionEmail({
    org: brand,
    recipientName: options.recipientName,
    programName: options.programName,
    admissionNo: options.admissionNo,
    sessionName: options.sessionName,
    loginUrl: options.loginUrl
  });

  return sendEmail(
    options.to,
    emailContent.subject,
    emailContent.text,
    emailContent.html,
    options.organizationId
  );
}

/**
 * Dispatches a Fee Payment Receipt Email with full Organization branding and PDF receipt attachment
 */
export async function sendBrandedFeeReceipt(options: {
  to: string;
  recipientName: string;
  amount: string | number;
  receiptNo: string;
  paymentDate?: string;
  paymentMode?: string;
  balanceAmount?: string | number;
  organizationId: string;
  paymentId?: string;
  admissionNo?: string;
  programName?: string;
  pdfBuffer?: Buffer;
}) {
  const brand = await getOrganizationBrandInfo(options.organizationId);
  const emailContent = buildFeeReceiptEmail({
    org: brand,
    recipientName: options.recipientName,
    amount: options.amount,
    receiptNo: options.receiptNo,
    paymentDate: options.paymentDate,
    paymentMode: options.paymentMode,
    balanceAmount: options.balanceAmount
  });

  // Generate PDF receipt attachment
  const attachments: EmailAttachment[] = [];
  try {
    const { generateReceiptPdfBuffer, getReceiptData } = await import('./receiptPdfService.js');
    let buffer = options.pdfBuffer;

    if (!buffer && options.paymentId) {
      const receiptData = await getReceiptData(options.paymentId);
      if (receiptData) {
        buffer = await generateReceiptPdfBuffer(receiptData);
      }
    }

    if (!buffer) {
      buffer = await generateReceiptPdfBuffer({
        receiptNo: options.receiptNo,
        date: options.paymentDate || new Date(),
        studentName: options.recipientName,
        studentEmail: options.to,
        admissionNo: options.admissionNo,
        programName: options.programName,
        amount: options.amount,
        paymentMode: options.paymentMode || 'Online',
        balanceDue: options.balanceAmount !== undefined ? Number(options.balanceAmount) : undefined,
        organization: {
          name: brand.name,
          logo: brand.logo,
          address: brand.address,
          phone: brand.phone,
          email: brand.email
        }
      });
    }

    if (buffer && buffer.length > 0) {
      attachments.push({
        filename: `Fee-Receipt-${options.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        content: buffer,
        contentType: 'application/pdf'
      });
    }
  } catch (pdfErr: any) {
    console.error('[EmailService] Notice: Could not generate PDF attachment for receipt:', pdfErr?.message);
  }

  return sendEmail(
    options.to,
    emailContent.subject,
    emailContent.text,
    emailContent.html,
    options.organizationId,
    attachments
  );
}
