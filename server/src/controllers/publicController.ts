import { Response, Request } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const validateInviteToken = asyncHandler(async (req: Request, res: Response) => {
  const invite = await prisma.studyCenterInvite.findUnique({ where: { token: req.params.token } });
  res.json({ success: true, data: invite });
});

export const publicRegister = asyncHandler(async (req: Request, res: Response) => {
  const center = await prisma.studyCenter.create({ data: { ...req.body, status: 'active' } });
  res.status(201).json({ success: true, data: center });
});

export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'pending' } });
});

export const submitPaymentProof = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Payment proof submitted' });
});

export const getPublicUniversities = asyncHandler(async (req: Request, res: Response) => {
  const universities = await prisma.university.findMany({ where: { status: 'active' } });
  res.json({ success: true, count: universities.length, data: universities });
});

export const getPublicPrograms = asyncHandler(async (req: Request, res: Response) => {
  const programs = await prisma.program.findMany({ where: { status: 'active' }, include: { university: true } });
  res.json({ success: true, count: programs.length, data: programs });
});

export const createOrgInquiry = asyncHandler(async (req: Request, res: Response) => {
  const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const orgName = clean(req.body?.orgName, 150);
  const adminName = clean(req.body?.adminName, 100);
  const email = clean(req.body?.email, 150).toLowerCase();
  const phone = clean(req.body?.phone, 20);
  const message = clean(req.body?.message, 1000) || undefined;

  if (!orgName || !adminName || !email || !phone) {
    res.status(400).json({ success: false, message: 'All standard fields are required.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    return;
  }
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
    res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
    return;
  }

  const inquiry = await prisma.orgInquiry.create({
    data: { orgName, adminName, email, phone, message }
  });
  // Don't echo the stored record back to an unauthenticated caller.
  res.status(201).json({ success: true, data: { id: inquiry.id } });
});

export const getCountries = asyncHandler(async (req: Request, res: Response) => {
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,flag');
    if (!response.ok) throw new Error('Failed to fetch countries');
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch countries' });
  }
});

/**
 * Publicly serves the official branded PDF receipt for download / view
 * Accessible by students and WhatsApp/Email delivery links without login
 */
export const getPublicReceiptPdf = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { getReceiptData, generateReceiptPdfBuffer } = await import('../utils/receiptPdfService.js');

  const receiptData = await getReceiptData(id);
  if (!receiptData) {
    res.status(404).json({ success: false, message: 'Payment receipt not found' });
    return;
  }

  const pdfBuffer = await generateReceiptPdfBuffer(receiptData);
  const safeFilename = `Receipt-${receiptData.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.end(pdfBuffer);
});
