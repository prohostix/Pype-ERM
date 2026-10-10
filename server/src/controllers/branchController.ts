import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branches = await prisma.branch.findMany({
    where: { organizationId: req.user.organizationId },
    include: {
      branchManager: {
        select: { id: true, name: true, email: true, role: true, designation: true }
      },
      salesDept: true,
      operationsDept: true
    },
    orderBy: { name: 'asc' }
  });

  const mapped = branches.map((b: any) => ({
    ...b,
    additionalDeptIds: b.additionalDeptIds || [],
    branchManagerId: b.branchManagerId
  }));

  res.json({ success: true, count: mapped.length, data: mapped });
});

export const getBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch: any = await prisma.branch.findUnique({
    where: { id: req.params.id },
    include: {
      branchManager: true,
      salesDept: true,
      operationsDept: true
    }
  });
  if (!branch) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  res.json({ success: true, data: { ...branch, additionalDeptIds: branch.additionalDeptIds || [], branchManagerId: branch.branchManagerId } });
});

export const createBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, address, city, branchManagerId } = req.body;

  // 1. Create the branch
  const branch = await prisma.branch.create({
    data: {
      name,
      code,
      address,
      city,
      organizationId: req.user.organizationId,
      branchManagerId: branchManagerId || undefined
    }
  });

  // 2. Create default departments for this branch
  const deptTypes = [
    'operations', 'finance', 'hr', 'sales', 'collections', 'staff', 'study_center'
  ];

  const createdDepts = await Promise.all(
    deptTypes.map(type => 
      prisma.department.create({
        data: {
          name: `${name} ${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`,
          type: type as any,
          organizationId: req.user.organizationId
        }
      })
    )
  );

  const sales = createdDepts.find(d => d.type === 'sales');
  const ops = createdDepts.find(d => d.type === 'operations');
  const additionalDepts = createdDepts.filter(d => d.type !== 'sales' && d.type !== 'operations');

  // 3. Link them back to the branch
  const additionalDeptObjects = additionalDepts.map(d => ({ id: d.id, name: d.name, type: d.type }));
  
  const updated = await prisma.branch.update({
    where: { id: branch.id },
    data: {
      salesDeptId: sales?.id,
      operationsDeptId: ops?.id,
      additionalDeptIds: additionalDeptObjects
    },
    include: { salesDept: true, operationsDept: true }
  });

  // 4. If branchManagerId is provided, grant them access to all these departments
  if (branchManagerId) {
    const allNewDeptIds = createdDepts.map(d => d.id);
    const user = await prisma.user.findUnique({ where: { id: branchManagerId } });
    if (user) {
      const existingDepts = (user.additionalDepartmentIds as string[]) || [];
      const mergedDepts = Array.from(new Set([...existingDepts, ...allNewDeptIds]));
      
      await prisma.user.update({
        where: { id: branchManagerId },
        data: { additionalDepartmentIds: mergedDepts }
      });
    }
  }

  res.status(201).json({ success: true, data: updated });
});

export const updateBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, address, city, contact, status } = req.body;
  const branch = await prisma.branch.update({
    where: { id: req.params.id },
    data: { name, code, address, city, contact, status }
  });
  res.json({ success: true, data: branch });
});

export const deleteBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.branch.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const assignBranchManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId, additionalDeptIds } = req.body;
  
  let additionalDeptObjects: any[] = [];
  if (Array.isArray(additionalDeptIds) && additionalDeptIds.length > 0) {
    const isStrings = typeof additionalDeptIds[0] === 'string';
    if (isStrings) {
      const depts = await prisma.department.findMany({
        where: { id: { in: additionalDeptIds } }
      });
      additionalDeptObjects = depts.map(d => ({ id: d.id, name: d.name, type: d.type }));
    } else {
      additionalDeptObjects = additionalDeptIds;
    }
  }

  const branch: any = await prisma.branch.update({
    where: { id: req.params.id },
    data: {
      branchManagerId: userId || null,
      additionalDeptIds: additionalDeptObjects
    }
  });

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const existingDepts = (user?.additionalDepartmentIds as string[]) || [];
    
    // Collect all dept IDs for this branch
    const branchDeptIds = [];
    if (branch.salesDeptId) branchDeptIds.push(branch.salesDeptId);
    if (branch.operationsDeptId) branchDeptIds.push(branch.operationsDeptId);
    const addDepts = branch.additionalDeptIds || [];
    if (Array.isArray(addDepts)) {
      addDepts.forEach((d: any) => {
        if (d && d.id) branchDeptIds.push(d.id);
      });
    }

    const mergedDepts = Array.from(new Set([...existingDepts, ...branchDeptIds]));

    await prisma.user.update({
      where: { id: userId },
      data: { 
        branchId: req.params.id,
        additionalDepartmentIds: mergedDepts
      }
    });
  }

  res.json({ success: true, data: { ...branch, additionalDeptIds: branch.additionalDeptIds || [], branchManagerId: branch.branchManagerId } });
});

export const updateBranchDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { additionalDeptIds } = req.body;
  
  let additionalDeptObjects: any[] = [];
  if (Array.isArray(additionalDeptIds) && additionalDeptIds.length > 0) {
    const isStrings = typeof additionalDeptIds[0] === 'string';
    if (isStrings) {
      const depts = await prisma.department.findMany({
        where: { id: { in: additionalDeptIds } }
      });
      additionalDeptObjects = depts.map(d => ({ id: d.id, name: d.name, type: d.type }));
    } else {
      additionalDeptObjects = additionalDeptIds;
    }
  }

  const branch: any = await prisma.branch.update({
    where: { id: req.params.id },
    data: {
      additionalDeptIds: additionalDeptObjects
    }
  });
  res.json({ success: true, data: { ...branch, additionalDeptIds: branch.additionalDeptIds || [], branchManagerId: branch.branchManagerId } });
});

export const getMyBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch: any = await prisma.branch.findUnique({
    where: { id: req.user.branchId || '' },
    include: { salesDept: true, operationsDept: true }
  });
  res.json({ success: true, data: { ...branch, additionalDeptIds: branch?.additionalDeptIds || [] } });
});
