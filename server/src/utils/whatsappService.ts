import axios from 'axios';
import prisma from '../lib/prisma.js';

export interface GupshupTemplateConfig {
  enabled: boolean;
  templateId: string;
  exampleText?: string;
}

export interface GupshupConfig {
  enabled: boolean;
  apiKey: string;
  appName: string;
  sourceNumber: string;
  templates?: Record<string, GupshupTemplateConfig>;
}

function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
}

/**
 * Send a plain text message via Gupshup (Session window / testing)
 */
export const sendWhatsAppMessage = async (
  recipientPhone: string,
  message: string,
  organizationId: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, metadata: true }
    });

    const wa = (org?.metadata as any)?.communicationSettings?.whatsapp as GupshupConfig | undefined;
    if (!wa || !wa.enabled) {
      console.log(`[Gupshup WhatsApp] Integration not enabled for org: ${org?.name || organizationId}.`);
      console.log(`To: ${recipientPhone} | Content: ${message}`);
      return { success: false, message: 'Gupshup WhatsApp integration is disabled or not configured for this organization' };
    }

    const { apiKey, appName, sourceNumber } = wa;

    if (!apiKey || !sourceNumber) {
      return { success: false, message: 'Gupshup API Key and Source Phone Number are required' };
    }

    const destination = cleanPhoneNumber(recipientPhone);
    const source = sourceNumber.replace(/[^0-9]/g, '');

    const payload = new URLSearchParams();
    payload.append('channel', 'whatsapp');
    payload.append('source', source);
    payload.append('destination', destination);
    payload.append('message', JSON.stringify({ type: 'text', text: message }));
    if (appName) {
      payload.append('src.name', appName);
    }

    const res = await axios.post(
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

    const data = res.data;
    const isSuccess = res.status === 200 || res.status === 202 || data?.status === 'submitted' || data?.status === 'success';

    return {
      success: isSuccess,
      message: isSuccess
        ? `WhatsApp message submitted successfully via Gupshup! Message ID: ${data?.messageId || data?.id || 'OK'}`
        : (data?.message || 'Gupshup message dispatch finished'),
      data
    };
  } catch (error: any) {
    console.error('[Gupshup WhatsApp] Error dispatching message:', error?.response?.data || error);
    const errData = error?.response?.data;
    const errMsg = errData?.message || errData?.error?.message || error?.message || 'Failed to send WhatsApp message via Gupshup';
    return {
      success: false,
      message: errMsg
    };
  }
};

/**
 * Send an approved WhatsApp Template (HSM) message via Gupshup
 * Optionally supports media header attachments (document / pdf / image)
 */
export const sendWhatsAppTemplateMessage = async (
  recipientPhone: string,
  templateId: string,
  params: string[],
  organizationId: string,
  media?: { type: 'document' | 'image' | 'video'; url: string; filename?: string }
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, metadata: true }
    });

    const wa = (org?.metadata as any)?.communicationSettings?.whatsapp as GupshupConfig | undefined;
    if (!wa || !wa.enabled) {
      return { success: false, message: 'Gupshup WhatsApp integration is disabled or not configured' };
    }

    const { apiKey, appName, sourceNumber } = wa;

    if (!apiKey || !sourceNumber) {
      return { success: false, message: 'Gupshup API Key and Source Phone Number are required' };
    }

    const destination = cleanPhoneNumber(recipientPhone);
    const source = sourceNumber.replace(/[^0-9]/g, '');

    const payload = new URLSearchParams();
    payload.append('source', source);
    payload.append('destination', destination);

    const templateObj: any = { id: templateId, params };
    if (media && media.url) {
      templateObj.media = media;
    }

    payload.append('template', JSON.stringify(templateObj));
    if (appName) {
      payload.append('src.name', appName);
    }

    const res = await axios.post(
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

    const data = res.data;
    const isSuccess = res.status === 200 || res.status === 202 || data?.status === 'submitted' || data?.status === 'success';

    return {
      success: isSuccess,
      message: isSuccess
        ? `Gupshup template message submitted successfully! Message ID: ${data?.messageId || data?.id || 'OK'}`
        : (data?.message || 'Gupshup template dispatch finished'),
      data
    };
  } catch (error: any) {
    console.error('[Gupshup WhatsApp] Error dispatching template message:', error?.response?.data || error);
    const errData = error?.response?.data;
    const errMsg = errData?.message || errData?.error?.message || error?.message || 'Failed to dispatch Gupshup template message';
    return {
      success: false,
      message: errMsg
    };
  }
};

/**
 * Send a document/PDF file attachment directly via Gupshup
 */
export const sendWhatsAppDocumentMessage = async (
  recipientPhone: string,
  documentUrl: string,
  fileName: string,
  caption: string,
  organizationId: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, metadata: true }
    });

    const wa = (org?.metadata as any)?.communicationSettings?.whatsapp as GupshupConfig | undefined;
    if (!wa || !wa.enabled) {
      return { success: false, message: 'Gupshup WhatsApp integration is disabled' };
    }

    const { apiKey, appName, sourceNumber } = wa;
    if (!apiKey || !sourceNumber) {
      return { success: false, message: 'Gupshup API Key and Source Phone Number are required' };
    }

    const destination = cleanPhoneNumber(recipientPhone);
    const source = sourceNumber.replace(/[^0-9]/g, '');

    const payload = new URLSearchParams();
    payload.append('source', source);
    payload.append('destination', destination);
    payload.append('message', JSON.stringify({
      type: 'file',
      url: documentUrl,
      filename: fileName,
      caption
    }));
    if (appName) {
      payload.append('src.name', appName);
    }

    const res = await axios.post(
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

    const isSuccess = res.status === 200 || res.status === 202;
    return {
      success: isSuccess,
      message: isSuccess ? 'Document sent via WhatsApp' : 'Failed to send WhatsApp document',
      data: res.data
    };
  } catch (error: any) {
    console.error('[Gupshup WhatsApp] Error sending document message:', error?.response?.data || error?.message);
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Document dispatch failed'
    };
  }
};

/**
 * Helper to dispatch template message by template key from organization settings
 */
export async function sendTemplateByKey(
  templateKey: 'admission_confirmation' | 'fee_receipt' | 'payment_reminder' | 'lead_welcome',
  recipientPhone: string,
  params: string[],
  organizationId: string,
  media?: { type: 'document' | 'image' | 'video'; url: string; filename?: string }
) {
  if (!recipientPhone) return { success: false, message: 'Recipient phone number is missing' };

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, metadata: true }
    });

    const wa = (org?.metadata as any)?.communicationSettings?.whatsapp as GupshupConfig | undefined;
    if (!wa || !wa.enabled) {
      console.log(`[WhatsAppService] Skipping ${templateKey}: WhatsApp disabled for ${org?.name || organizationId}`);
      return { success: false, message: 'WhatsApp integration is disabled' };
    }

    const tplConfig = wa.templates?.[templateKey];
    if (!tplConfig || !tplConfig.enabled || !tplConfig.templateId) {
      console.log(`[WhatsAppService] Skipping ${templateKey}: No Template ID configured for ${templateKey} in org settings`);
      return { success: false, message: `No Template ID configured for ${templateKey}` };
    }

    console.log(`[WhatsAppService] Dispatching ${templateKey} (ID: ${tplConfig.templateId}) to ${recipientPhone}`);
    return await sendWhatsAppTemplateMessage(recipientPhone, tplConfig.templateId, params, organizationId, media);
  } catch (err: any) {
    console.error(`[WhatsAppService] Failed to send ${templateKey}:`, err.message);
    return { success: false, message: err.message };
  }
}

export async function sendAdmissionConfirmationWhatsApp(options: {
  studentPhone: string;
  studentName: string;
  programName: string;
  admissionNo: string;
  organizationId: string;
}) {
  return sendTemplateByKey(
    'admission_confirmation',
    options.studentPhone,
    [options.studentName, options.programName, options.admissionNo],
    options.organizationId
  );
}

export async function sendFeeReceiptWhatsApp(options: {
  studentPhone: string;
  studentName: string;
  amount: number | string;
  receiptNo: string;
  organizationId: string;
  paymentId?: string;
  receiptUrl?: string;
}) {
  const formattedAmount = typeof options.amount === 'number' ? options.amount.toLocaleString('en-IN') : options.amount.toString();
  const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
  const targetId = options.paymentId || options.receiptNo;
  const directPdfUrl = options.receiptUrl || `${baseUrl}/api/v1/public/receipt/${encodeURIComponent(targetId)}/pdf`;
  const safeFilename = `Receipt_${options.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  // 1. Dispatch template message with media attachment header (if template is configured as media)
  // or with params [name, amount, receiptNo, receiptUrl]
  const templateResult = await sendTemplateByKey(
    'fee_receipt',
    options.studentPhone,
    [options.studentName, formattedAmount, options.receiptNo, directPdfUrl],
    options.organizationId,
    {
      type: 'document',
      url: directPdfUrl,
      filename: safeFilename
    }
  );

  // 2. Also attempt document message dispatch
  sendWhatsAppDocumentMessage(
    options.studentPhone,
    directPdfUrl,
    safeFilename,
    `Payment Receipt - ${options.receiptNo}`,
    options.organizationId
  ).catch(docErr => {
    // Non-blocking in case session window is closed
    console.log('[WhatsAppService] Document dispatch session note:', docErr?.message);
  });

  return templateResult;
}

export async function sendPaymentReminderWhatsApp(options: {
  studentPhone: string;
  studentName: string;
  amount: number | string;
  dueDate: string;
  organizationId: string;
}) {
  const formattedAmount = typeof options.amount === 'number' ? options.amount.toLocaleString('en-IN') : options.amount.toString();
  return sendTemplateByKey(
    'payment_reminder',
    options.studentPhone,
    [options.studentName, formattedAmount, options.dueDate],
    options.organizationId
  );
}

export async function sendLeadWelcomeWhatsApp(options: {
  studentPhone: string;
  studentName: string;
  organizationId: string;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: options.organizationId },
    select: { name: true }
  });
  return sendTemplateByKey(
    'lead_welcome',
    options.studentPhone,
    [options.studentName, org?.name || 'Our Institution'],
    options.organizationId
  );
}
