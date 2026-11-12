import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isUserInScope } from '../utils/branchScope.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Loads the target user and enforces tenant isolation (superadmin may cross orgs) and, for
 * branch-restricted HR, branch isolation.
 */
async function loadTargetUser(req: AuthRequest, res: Response, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (
    !user ||
    (req.user.role !== 'superadmin' &&
      (user.organizationId !== req.user.organizationId || !(await isUserInScope(req, userId))))
  ) {
    res.status(404).json({ success: false, message: 'User not found' });
    return null;
  }
  return user;
}

const PROFILE_STRING_FIELDS = [
  'gender', 'bloodGroup', 'address', 'city', 'state', 'pincode', 'employeeCode',
  'employmentType', 'workLocation', 'bankName', 'bankAccountNo', 'ifscCode', 'panNumber',
  'reviewRemarks', 'jdFile', 'offerLetterFile', 'sopFile',
] as const;
const PROFILE_DATE_FIELDS = [
  'dateOfBirth', 'joinDate', 'confirmationDate', 'probationEndDate', 'lastReviewDate', 'nextReviewDate',
] as const;
const PROFILE_NUMBER_FIELDS = ['ctc', 'basicSalary', 'overallRating'] as const;

const isBlank = (v: any) => v === null || v === undefined || v === '';

/**
 * Builds a Prisma-safe profile payload from an untrusted body.
 * Only whitelisted keys are copied; `undefined` = leave untouched, blank/null = clear.
 * Returns an error string on invalid input.
 */
function buildProfileData(body: any): { data?: Record<string, any>; error?: string } {
  const data: Record<string, any> = {};

  for (const f of PROFILE_STRING_FIELDS) {
    if (body[f] === undefined) continue;
    data[f] = isBlank(body[f]) ? null : String(body[f]);
  }
  for (const f of PROFILE_DATE_FIELDS) {
    if (body[f] === undefined) continue;
    if (isBlank(body[f])) { data[f] = null; continue; }
    const d = new Date(body[f]);
    if (isNaN(d.getTime())) return { error: `Invalid date for ${f}` };
    data[f] = d;
  }
  for (const f of PROFILE_NUMBER_FIELDS) {
    if (body[f] === undefined) continue;
    if (isBlank(body[f])) { data[f] = null; continue; }
    const n = Number(body[f]);
    if (!isFinite(n) || n < 0) return { error: `Invalid number for ${f}` };
    if (f === 'overallRating' && n > 5) return { error: 'overallRating must be between 0 and 5' };
    data[f] = n;
  }
  if (body.emergencyContact !== undefined) {
    const ec = body.emergencyContact;
    data.emergencyContact = ec && typeof ec === 'object'
      ? { name: ec.name || '', phone: ec.phone || '', relation: ec.relation || '' }
      : null;
  }
  if (data.panNumber) {
    data.panNumber = String(data.panNumber).toUpperCase().trim();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.panNumber)) return { error: 'Invalid PAN number format' };
  }
  if (data.ifscCode) {
    data.ifscCode = String(data.ifscCode).toUpperCase().trim();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode)) return { error: 'Invalid IFSC code format' };
  }
  return { data };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId || req.user.id;
  if (!(await loadTargetUser(req, res, userId))) return;

  const [user, profile, salaryConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      omit: { password: true },
      include: { organization: true, department: true },
    }),
    prisma.employeeProfile.findUnique({ where: { userId } }),
    prisma.salaryConfig.findUnique({ where: { userId } }),
  ]);
  res.json({ success: true, data: { user, profile, salaryConfig } });
});

export const upsertEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const user = await loadTargetUser(req, res, userId);
  if (!user) return;

  const { data, error } = buildProfileData(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });

  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: data!,
    create: { ...data!, userId, organizationId: user.organizationId || req.user.organizationId },
  });
  res.json({ success: true, data: profile });
});

export const updateKPIs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const user = await loadTargetUser(req, res, userId);
  if (!user) return;
  if (!Array.isArray(req.body.kpis)) {
    return res.status(400).json({ success: false, message: 'kpis must be an array' });
  }
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kpis: req.body.kpis },
    create: { userId, organizationId: user.organizationId || req.user.organizationId, kpis: req.body.kpis },
  });
  res.json({ success: true, data: profile });
});

export const updateKRAs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const user = await loadTargetUser(req, res, userId);
  if (!user) return;
  if (!Array.isArray(req.body.kras)) {
    return res.status(400).json({ success: false, message: 'kras must be an array' });
  }
  const profile = await prisma.employeeProfile.upsert({
    where: { userId },
    update: { kras: req.body.kras },
    create: { userId, organizationId: user.organizationId || req.user.organizationId, kras: req.body.kras },
  });
  res.json({ success: true, data: profile });
});

/**
 * Saves the Salary tab. The body mixes two things:
 *  - EmployeeProfile fields (ctc, basicSalary, bank + PAN details)
 *  - a nested `salaryConfig` object for payroll (SalaryConfig table)
 * approvalStatus / approvedBy / approvedAt are never accepted from the client.
 */
export const updateSalaryDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const user = await loadTargetUser(req, res, userId);
  if (!user) return;

  const { salaryConfig: sc, ...profileBody } = req.body || {};
  const organizationId = user.organizationId || req.user.organizationId;

  // 1. Profile-level salary/bank fields
  const salaryProfileKeys = ['ctc', 'basicSalary', 'bankName', 'bankAccountNo', 'ifscCode', 'panNumber'];
  const picked: any = {};
  for (const k of salaryProfileKeys) if (profileBody[k] !== undefined) picked[k] = profileBody[k];
  const { data: profileData, error } = buildProfileData(picked);
  if (error) return res.status(400).json({ success: false, message: error });

  // 2. Payroll config (validate before writing anything)
  let configData: Record<string, any> | null = null;
  if (sc && typeof sc === 'object') {
    configData = {};
    const numeric = ['basicSalary', 'lateDeductionPerMinute', 'earlyExitDeductionPerMinute', 'wfhDeductionPerDay'];
    for (const f of numeric) {
      if (sc[f] === undefined) continue;
      const n = Number(sc[f]);
      if (!isFinite(n) || n < 0) return res.status(400).json({ success: false, message: `Invalid number for ${f}` });
      configData[f] = n;
    }
    for (const f of ['allowances', 'deductions', 'unpaidLeaveRule']) {
      if (sc[f] !== undefined && sc[f] !== null && typeof sc[f] === 'object') configData[f] = sc[f];
    }
    if (sc.effectiveFrom) {
      const d = new Date(sc.effectiveFrom);
      if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid effectiveFrom date' });
      configData.effectiveFrom = d;
    }
  }

  const existingConfig = configData
    ? await prisma.salaryConfig.findUnique({ where: { userId } })
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const profile = Object.keys(profileData!).length
      ? await tx.employeeProfile.upsert({
          where: { userId },
          update: profileData!,
          create: { ...profileData!, userId, organizationId },
        })
      : null;

    let config = existingConfig;
    if (configData) {
      if (existingConfig) {
        config = await tx.salaryConfig.update({ where: { userId }, data: configData });
      } else if ((configData.basicSalary ?? 0) > 0) {
        // New configs start as pending_approval (schema default) and need approval before payroll uses them.
        config = await tx.salaryConfig.create({
          data: { ...(configData as any), basicSalary: configData.basicSalary, userId, organizationId, createdBy: req.user.id },
        });
      }
    }
    return { profile, config };
  });

  res.json({ success: true, data: result });
});
