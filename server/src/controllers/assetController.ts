import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { AssetStatus, AssetType } from '../generated/client';


// Assets belong to a user, so an asset is visible to the caller only when its
// user is in the caller's organization (and, for a branch manager, branch).
const assetScope = (req: AuthRequest): any => {
  if (req.user.role === 'superadmin') return {};
  const user: any = { organizationId: req.user.organizationId };
  if (req.user.role === 'branch_manager' && req.user.branchId) user.branchId = req.user.branchId;
  return { user };
};

// Who an asset may be assigned to: any staff account in scope (not students).
const findAssignableUser = (req: AuthRequest, userId: string) =>
  prisma.user.findFirst({
    where: {
      id: userId,
      role: { not: 'student' },
      ...(req.user.role === 'superadmin' ? {} : assetScope(req).user),
    },
    select: { id: true },
  });

export const getAssets = async (req: AuthRequest, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      where: assetScope(req),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeProfile: {
              select: {
                employeeId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      type, 
      brand, 
      model, 
      serialNumber, 
      imeiNumber, 
      networkProvider, 
      phoneNumber, 
      userId, 
      status, 
      notes, 
      assignedDate, 
      returnedDate 
    } = req.body;

    if (!type || !userId) {
      return res.status(400).json({ success: false, message: 'Type and Assigned User are required' });
    }

    if (!(await findAssignableUser(req, userId))) {
      return res.status(400).json({ success: false, message: 'That user was not found in your organization.' });
    }

    const newAsset = await prisma.asset.create({
      data: {
        type: type as AssetType,
        brand,
        model,
        serialNumber,
        imeiNumber,
        networkProvider,
        phoneNumber,
        userId,
        status: (status as AssetStatus) || 'ASSIGNED',
        notes,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        returnedDate: returnedDate ? new Date(returnedDate) : null,
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({ success: true, message: 'Asset created successfully', data: newAsset });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      type, 
      brand, 
      model, 
      serialNumber, 
      imeiNumber, 
      networkProvider, 
      phoneNumber, 
      userId, 
      status, 
      notes, 
      assignedDate, 
      returnedDate 
    } = req.body;

    const asset = await prisma.asset.findFirst({ where: { id, ...assetScope(req) } });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (userId && userId !== asset.userId && !(await findAssignableUser(req, userId))) {
      return res.status(400).json({ success: false, message: 'That user was not found in your organization.' });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        type: type ? (type as AssetType) : undefined,
        brand,
        model,
        serialNumber,
        imeiNumber,
        networkProvider,
        phoneNumber,
        userId,
        status: status ? (status as AssetStatus) : undefined,
        notes,
        assignedDate: assignedDate ? new Date(assignedDate) : undefined,
        returnedDate: returnedDate ? new Date(returnedDate) : null,
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(200).json({ success: true, message: 'Asset updated successfully', data: updatedAsset });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findFirst({ where: { id, ...assetScope(req) } });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await prisma.asset.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
