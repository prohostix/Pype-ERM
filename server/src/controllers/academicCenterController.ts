import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export interface AcademicCenterAccessConfig {
  dailyClassLimitEnabled: boolean;
  dailyClassLimit: number;
  programLimits: Array<{
    programId: string;
    programName?: string;
    dailyClassLimit: number;
    enabled: boolean;
  }>;
  feeLocking: {
    enabled: boolean;
    lockPolicy: 'overdue_installments' | 'min_percentage' | 'strict_unpaid';
    gracePeriodDays: number;
    minPaidPercentage: number;
    lockMessage: string;
  };
}

export interface ProgramAccessConfig {
  dailyClassLimitEnabled: boolean;
  dailyClassLimit: number;
  feeLocking: {
    enabled: boolean;
    minPaidPercentage: number;
    gracePeriodDays: number;
    lockMessage: string;
    lockPolicy?: string;
  };
}

export const DEFAULT_PROGRAM_ACCESS_CONFIG: ProgramAccessConfig = {
  dailyClassLimitEnabled: false,
  dailyClassLimit: 2,
  feeLocking: {
    enabled: false,
    minPaidPercentage: 50,
    gracePeriodDays: 3,
    lockMessage: 'Video lectures are locked because you have only paid {paidPercent}% of your total course fee. A minimum payment of {requiredPercent}% is required to unlock.'
  }
};

export const DEFAULT_ACCESS_CONFIG: AcademicCenterAccessConfig = {
  dailyClassLimitEnabled: false,
  dailyClassLimit: 2,
  programLimits: [],
  feeLocking: {
    enabled: false,
    lockPolicy: 'overdue_installments',
    gracePeriodDays: 3,
    minPaidPercentage: 50,
    lockMessage: 'Video lectures are locked due to pending fee payment. Please clear your dues in the Fees section to unlock.'
  }
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

function sanitizeProgramAccessConfig(config: any): ProgramAccessConfig {
  const defaults = DEFAULT_PROGRAM_ACCESS_CONFIG;
  const fee = config?.feeLocking;
  return {
    dailyClassLimitEnabled: config?.dailyClassLimitEnabled === true,
    dailyClassLimit: clampInt(config?.dailyClassLimit, 1, 50, defaults.dailyClassLimit),
    feeLocking: {
      enabled: fee?.enabled === true,
      minPaidPercentage: clampInt(fee?.minPaidPercentage, 1, 100, defaults.feeLocking.minPaidPercentage),
      gracePeriodDays: clampInt(fee?.gracePeriodDays, 0, 90, defaults.feeLocking.gracePeriodDays),
      lockMessage: typeof fee?.lockMessage === 'string' ? fee.lockMessage.slice(0, 1000) : defaults.feeLocking.lockMessage
    }
  };
}

export const getAcademicCenters = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const [centers, org] = await Promise.all([
    prisma.academicCenter.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { metadata: true }
    })
  ]);

  const orgMetadata = (org?.metadata as any) || {};
  const configs = orgMetadata.academicCenterConfigs || {};

  const centersWithConfigs = centers.map((center) => ({
    ...center,
    accessConfig: configs[center.id]
      ? { ...DEFAULT_ACCESS_CONFIG, ...configs[center.id] }
      : DEFAULT_ACCESS_CONFIG
  }));

  res.json({ success: true, data: centersWithConfigs });
});

export const getAcademicCenterById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  const [center, org] = await Promise.all([
    prisma.academicCenter.findFirst({
      where: { id, organizationId }
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { metadata: true }
    })
  ]);

  if (!center) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  const orgMetadata = (org?.metadata as any) || {};
  const configs = orgMetadata.academicCenterConfigs || {};

  res.json({
    success: true,
    data: {
      ...center,
      accessConfig: configs[center.id]
        ? { ...DEFAULT_ACCESS_CONFIG, ...configs[center.id] }
        : DEFAULT_ACCESS_CONFIG
    }
  });
});

export const createAcademicCenter = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, type, address, programIds, status, accessConfig } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  const center = await prisma.academicCenter.create({
    data: {
      name,
      type: type || 'offline',
      address,
      programIds: programIds || [],
      status: status || 'active',
      organizationId
    }
  });

  if (accessConfig) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { metadata: true }
    });
    const orgMetadata = (org?.metadata as any) || {};
    const academicCenterConfigs = {
      ...(orgMetadata.academicCenterConfigs || {}),
      [center.id]: accessConfig
    };
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        metadata: {
          ...orgMetadata,
          academicCenterConfigs
        }
      }
    });
  }

  res.status(201).json({
    success: true,
    data: {
      ...center,
      accessConfig: accessConfig || DEFAULT_ACCESS_CONFIG
    },
    message: 'Academic center created successfully'
  });
});

export const updateAcademicCenter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { name, type, address, programIds, status, accessConfig } = req.body;

  const existingCenter = await prisma.academicCenter.findFirst({
    where: { id, organizationId }
  });

  if (!existingCenter) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  const center = await prisma.academicCenter.update({
    where: { id },
    data: {
      name,
      type,
      address,
      programIds,
      status
    }
  });

  if (accessConfig) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { metadata: true }
    });
    const orgMetadata = (org?.metadata as any) || {};
    const academicCenterConfigs = {
      ...(orgMetadata.academicCenterConfigs || {}),
      [id]: accessConfig
    };
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        metadata: {
          ...orgMetadata,
          academicCenterConfigs
        }
      }
    });
  }

  res.json({
    success: true,
    data: {
      ...center,
      accessConfig: accessConfig || DEFAULT_ACCESS_CONFIG
    },
    message: 'Academic center updated successfully'
  });
});

export const updateAcademicCenterAccessConfig = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { accessConfig } = req.body;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  if (!accessConfig) {
    return res.status(400).json({ success: false, message: 'Access configuration is required' });
  }

  const center = await prisma.academicCenter.findFirst({
    where: { id, organizationId }
  });

  if (!center) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { metadata: true }
  });

  const orgMetadata = (org?.metadata as any) || {};
  const academicCenterConfigs = {
    ...(orgMetadata.academicCenterConfigs || {}),
    [id]: accessConfig
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      metadata: {
        ...orgMetadata,
        academicCenterConfigs
      }
    }
  });

  res.json({
    success: true,
    data: {
      id,
      accessConfig
    },
    message: 'Video access & locking rules saved successfully'
  });
});

export const deleteAcademicCenter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const reason = req.body.reason || req.headers['x-delete-reason'];

  const existingCenter = await prisma.academicCenter.findFirst({
    where: { id, organizationId }
  });

  if (!existingCenter) {
    return res.status(404).json({ success: false, message: 'Academic center not found' });
  }

  if (user.role !== 'ceo' && user.role !== 'superadmin' && reason) {
    const requestData: any = {
      organization: { connect: { id: organizationId } },
      entityType: 'academic-center',
      entityId: id,
      requestType: 'delete',
      reason: reason as string
    };

    if (user.role === 'faculty') {
      requestData.faculty = { connect: { id: user.id } };
    } else {
      requestData.user = { connect: { id: user.id } };
    }

    await prisma.editDeleteRequest.create({
      data: requestData
    });
    return res.status(202).json({ success: true, message: 'Delete request sent to CEO for approval' });
  }

  await prisma.academicCenter.delete({
    where: { id }
  });

  res.json({ success: true, message: 'Academic center deleted successfully' });
});

export const getProgramAccessConfigs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { metadata: true }
  });

  const orgMetadata = (org?.metadata as any) || {};
  const configs = orgMetadata.programAccessConfigs || {};

  res.json({ success: true, data: configs });
});

export const updateProgramAccessConfigs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId;
  const { configs, programId, config } = req.body;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const incoming: Record<string, unknown> = configs && typeof configs === 'object'
    ? configs
    : programId && config ? { [programId]: config } : {};

  if (Object.keys(incoming).length === 0) {
    return res.status(400).json({ success: false, message: 'Program access rules are required' });
  }

  // These rules only apply to programs offered by an online center.
  const onlineCenters = await prisma.academicCenter.findMany({
    where: { organizationId, type: 'online' },
    select: { programIds: true }
  });
  const onlineProgramIds = new Set(onlineCenters.flatMap((center) => center.programIds));
  if (Object.keys(incoming).some((id) => !onlineProgramIds.has(id))) {
    return res.status(400).json({ success: false, message: 'Access rules can only be set for programs offered by an online center' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { metadata: true }
  });

  const orgMetadata = (org?.metadata as any) || {};
  const programAccessConfigs = { ...(orgMetadata.programAccessConfigs || {}) };

  for (const [id, programConfig] of Object.entries(incoming)) {
    programAccessConfigs[id] = sanitizeProgramAccessConfig(programConfig);
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      metadata: {
        ...orgMetadata,
        programAccessConfigs
      }
    }
  });

  res.json({
    success: true,
    data: programAccessConfigs,
    message: 'Program access and fee locking rules updated successfully'
  });
});

