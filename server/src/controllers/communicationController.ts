import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const logCommunication = async (
  organizationId: string,
  userId: string,
  type: string,
  recipientCount: number,
  content: string
) => {
  return await prisma.communicationLog.create({
    data: {
      organizationId,
      sentBy: userId,
      type,
      recipientCount,
      content,
      status: 'sent',
    }
  });
};

export const sendBulkEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subject, message, recipientCount, filters } = req.body;
  
  // TODO: In the future, integrate with SendGrid or AWS SES here
  
  const log = await logCommunication(
    req.user.organizationId!,
    req.user.id,
    'email',
    recipientCount || 0,
    JSON.stringify({ subject, message, filters })
  );

  res.status(200).json({ success: true, data: log, message: 'Email campaign started successfully' });
});

export const sendBulkSms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { message, recipientCount, filters } = req.body;
  
  // TODO: In the future, integrate with Twilio or similar SMS provider here
  
  const log = await logCommunication(
    req.user.organizationId!,
    req.user.id,
    'sms',
    recipientCount || 0,
    JSON.stringify({ message, filters })
  );

  res.status(200).json({ success: true, data: log, message: 'SMS campaign started successfully' });
});

export const sendBulkWhatsApp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { message, recipientCount, filters } = req.body;
  
  // TODO: In the future, integrate with WhatsApp Business API here
  
  const log = await logCommunication(
    req.user.organizationId!,
    req.user.id,
    'whatsapp',
    recipientCount || 0,
    JSON.stringify({ message, filters })
  );

  res.status(200).json({ success: true, data: log, message: 'WhatsApp campaign started successfully' });
});

export const getCommunicationLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type } = req.query;
  const where: any = { organizationId: req.user.organizationId };
  if (type) where.type = type as string;

  const logs = await prisma.communicationLog.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, data: logs });
});
