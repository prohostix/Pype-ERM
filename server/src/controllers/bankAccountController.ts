import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ACCOUNT_TYPES = ['savings', 'current', 'other'];

const fields = {
  id: true, accountName: true, bankName: true, accountNumber: true, ifscCode: true,
  branchName: true, accountType: true, upiId: true, isPrimary: true, isActive: true,
} as const;

const text = (value: unknown) => String(value ?? '').trim().slice(0, 120);

/** Cleans the submitted form; returns a message instead when something is wrong. */
const readAccount = (body: any) => {
  const data = {
    accountName: text(body.accountName),
    bankName: text(body.bankName),
    accountNumber: text(body.accountNumber).replace(/[\s-]/g, '').toUpperCase(),
    ifscCode: text(body.ifscCode).toUpperCase() || null,
    branchName: text(body.branchName) || null,
    accountType: ACCOUNT_TYPES.includes(body.accountType) ? String(body.accountType) : 'current',
    upiId: text(body.upiId) || null,
    isPrimary: body.isPrimary === true,
    isActive: body.isActive !== false,
  };
  if (!data.accountName || !data.bankName || !data.accountNumber) {
    return { error: 'Account holder name, bank name and account number are required' };
  }
  if (!/^[A-Z0-9]{5,34}$/.test(data.accountNumber)) {
    return { error: 'Account number must be 5 to 34 letters or digits' };
  }
  if (data.isPrimary && !data.isActive) {
    return { error: 'An inactive account cannot be the primary account' };
  }
  return { data };
};

/** Saves an account, taking the primary mark off any other account when this one takes it. */
const save = (organizationId: string, isPrimary: boolean, write: (tx: any) => Promise<any>) =>
  prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.orgBankAccount.updateMany({ where: { organizationId, isPrimary: true }, data: { isPrimary: false } });
    }
    return write(tx);
  });

const duplicate = (res: Response) =>
  res.status(409).json({ success: false, message: 'This account number is already added' });

export const getBankAccounts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
  const search = String(req.query.search || '').trim();

  const scope = { organizationId: req.user.organizationId };
  const contains = { contains: search, mode: 'insensitive' as const };
  const where = {
    ...scope,
    ...(search && {
      OR: [
        { accountName: contains },
        { bankName: contains },
        { accountNumber: contains },
        { ifscCode: contains },
        { branchName: contains },
      ],
    }),
  };

  const [accounts, total, overall] = await Promise.all([
    prisma.orgBankAccount.findMany({
      where,
      select: fields,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.orgBankAccount.count({ where }),
    prisma.orgBankAccount.count({ where: scope }),
  ]);

  res.json({ success: true, data: accounts, total, overall });
});

export const createBankAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data, error } = readAccount(req.body);
  if (!data) {
    res.status(400).json({ success: false, message: error });
    return;
  }
  const organizationId = req.user.organizationId;
  try {
    const account = await save(organizationId, data.isPrimary, (tx) =>
      tx.orgBankAccount.create({ data: { ...data, organizationId }, select: fields }));
    res.status(201).json({ success: true, data: account });
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err;
    duplicate(res);
  }
});

export const updateBankAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data, error } = readAccount(req.body);
  if (!data) {
    res.status(400).json({ success: false, message: error });
    return;
  }
  const organizationId = req.user.organizationId;
  const existing = await prisma.orgBankAccount.findFirst({ where: { id: req.params.id, organizationId }, select: { id: true } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Bank account not found' });
    return;
  }
  try {
    const account = await save(organizationId, data.isPrimary, (tx) =>
      tx.orgBankAccount.update({ where: { id: existing.id }, data, select: fields }));
    res.json({ success: true, data: account });
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err;
    duplicate(res);
  }
});

export const deleteBankAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { count } = await prisma.orgBankAccount.deleteMany({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!count) {
    res.status(404).json({ success: false, message: 'Bank account not found' });
    return;
  }
  res.json({ success: true });
});
