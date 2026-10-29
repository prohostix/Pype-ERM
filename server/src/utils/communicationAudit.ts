import prisma from '../lib/prisma.js';
import { sendBrandedFeeReceipt, sendBrandedStudentCredentials, sendEmail } from './emailService.js';
import {
  sendFeeReceiptWhatsApp,
  sendAdmissionConfirmationWhatsApp,
  sendPaymentReminderWhatsApp,
  sendLeadWelcomeWhatsApp
} from './whatsappService.js';

export interface RecordAuditParams {
  organizationId: string;
  type: 'email' | 'whatsapp' | 'sms';
  recipient?: string;
  recipientName?: string;
  subject?: string;
  category: 'FEE_RECEIPT' | 'STUDENT_CREDENTIALS' | 'PAYMENT_REMINDER' | 'LEAD_WELCOME' | 'CUSTOM_EMAIL' | string;
  content?: string;
  status: 'sent' | 'delivered' | 'failed';
  errorMessage?: string;
  metadata?: any;
  sentBy?: string;
}

/**
 * Creates or logs a communication audit entry in the database
 */
export async function recordCommunicationAudit(params: RecordAuditParams) {
  try {
    return await prisma.communicationLog.create({
      data: {
        organizationId: params.organizationId,
        type: params.type,
        recipient: params.recipient || null,
        recipientName: params.recipientName || null,
        subject: params.subject || null,
        category: params.category,
        content: params.content ? params.content.slice(0, 1000) : null,
        status: params.status,
        errorMessage: params.errorMessage || null,
        metadata: params.metadata || null,
        sentBy: params.sentBy || null,
        recipientCount: 1
      }
    });
  } catch (err: any) {
    console.error('[CommunicationAudit] Notice: Failed to write communication log:', err?.message);
    return null;
  }
}

/**
 * Resends a previously logged or failed communication message
 */
export async function resendCommunication(logId: string, orgId?: string) {
  const log = await prisma.communicationLog.findUnique({
    where: { id: logId }
  });

  if (!log) {
    throw new Error('Communication log not found');
  }

  if (orgId && log.organizationId !== orgId) {
    throw new Error('Access denied: Communication log belongs to another organization');
  }

  const payload = (log.metadata as any) || {};

  try {
    if (log.type === 'email') {
      if (log.category === 'FEE_RECEIPT') {
        await sendBrandedFeeReceipt({
          to: payload.to || log.recipient || '',
          recipientName: payload.recipientName || log.recipientName || 'Student',
          amount: payload.amount,
          receiptNo: payload.receiptNo,
          paymentDate: payload.paymentDate,
          paymentMode: payload.paymentMode,
          balanceAmount: payload.balanceAmount,
          organizationId: log.organizationId,
          paymentId: payload.paymentId,
          admissionNo: payload.admissionNo,
          programName: payload.programName
        });
      } else if (log.category === 'STUDENT_CREDENTIALS') {
        await sendBrandedStudentCredentials({
          to: payload.to || log.recipient || '',
          recipientName: payload.studentName || payload.recipientName || log.recipientName || 'Student',
          email: payload.email || log.recipient || '',
          password: payload.password,
          userId: payload.userId,
          loginUrl: payload.loginUrl,
          roleTitle: payload.roleTitle,
          organizationId: log.organizationId
        });
      } else {
        await sendEmail(
          payload.to || log.recipient || '',
          payload.subject || log.subject || 'Notification',
          payload.text || log.content || '',
          payload.html || `<p>${log.content || ''}</p>`,
          log.organizationId
        );
      }
    } else if (log.type === 'whatsapp') {
      if (log.category === 'FEE_RECEIPT') {
        await sendFeeReceiptWhatsApp({
          studentPhone: payload.studentPhone || log.recipient || '',
          studentName: payload.studentName || payload.recipientName || log.recipientName || 'Student',
          amount: payload.amount,
          receiptNo: payload.receiptNo,
          organizationId: log.organizationId,
          paymentId: payload.paymentId
        });
      } else if (log.category === 'STUDENT_CREDENTIALS') {
        await sendAdmissionConfirmationWhatsApp({
          studentPhone: payload.studentPhone || log.recipient || '',
          studentName: payload.studentName || payload.recipientName || log.recipientName || 'Student',
          programName: payload.programName || 'Academic Program',
          admissionNo: payload.admissionNo || payload.userId || 'Enrolled',
          organizationId: log.organizationId
        });
      } else if (log.category === 'PAYMENT_REMINDER') {
        await sendPaymentReminderWhatsApp(payload);
      } else if (log.category === 'LEAD_WELCOME') {
        await sendLeadWelcomeWhatsApp(payload);
      } else {
        throw new Error(`Unsupported WhatsApp category for resending: ${log.category}`);
      }
    }

    // Success update
    const updated = await prisma.communicationLog.update({
      where: { id: logId },
      data: {
        status: 'sent',
        errorMessage: null,
        retryCount: { increment: 1 },
        lastRetryAt: new Date()
      }
    });

    return { success: true, log: updated, message: 'Message resent successfully' };
  } catch (err: any) {
    console.error(`[CommunicationAudit] Failed to resend message ${logId}:`, err?.message);
    
    // Update log with latest error
    await prisma.communicationLog.update({
      where: { id: logId },
      data: {
        status: 'failed',
        errorMessage: err?.message || 'Resend failed',
        retryCount: { increment: 1 },
        lastRetryAt: new Date()
      }
    }).catch(() => {});

    throw err;
  }
}
