import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import type { PageRequest } from '../access/pageGuard.js';

/** Someone given this page manages the devices of their own branch */
const givenBranch = (req: Request): string | undefined => {
  const { ownBranchOnly, user } = req as PageRequest;
  return (ownBranchOnly && user.branchId) || undefined;
};

export const getDevices = async (req: Request, res: Response) => {
  try {
    const { organizationId } = (req as any).user!;
    const devices = await prisma.biometricDevice.findMany({
      where: { organizationId, branchId: givenBranch(req) },
      include: { branch: true }
    });
    res.json(devices);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch devices', details: error.message });
  }
};

export const getDevice = async (req: Request, res: Response) => {
  try {
    const { organizationId } = (req as any).user!;
    const { id } = req.params;
    const device = await prisma.biometricDevice.findFirst({
      where: { id, organizationId, branchId: givenBranch(req) },
      include: { branch: true }
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch device', details: error.message });
  }
};

export const createDevice = async (req: Request, res: Response) => {
  try {
    const { organizationId } = (req as any).user!;
    const { name, serialNumber, ipAddress, branchId } = req.body;
    
    // Ensure SN is unique globally
    const existing = await prisma.biometricDevice.findUnique({
      where: { serialNumber }
    });
    if (existing) return res.status(400).json({ error: 'Device with this Serial Number already exists' });

    const device = await prisma.biometricDevice.create({
      data: {
        organizationId,
        name,
        serialNumber,
        ipAddress,
        branchId: givenBranch(req) || branchId,
        status: 'active'
      }
    });
    res.status(201).json(device);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create device', details: error.message });
  }
};

export const updateDevice = async (req: Request, res: Response) => {
  try {
    const { organizationId } = (req as any).user!;
    const { id } = req.params;
    const { name, serialNumber, ipAddress, branchId, status } = req.body;

    const device = await prisma.biometricDevice.findFirst({
      where: { id, organizationId, branchId: givenBranch(req) }
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const updated = await prisma.biometricDevice.update({
      where: { id },
      data: { name, serialNumber, ipAddress, branchId: givenBranch(req) || branchId, status }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update device', details: error.message });
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const { organizationId } = (req as any).user!;
    const { id } = req.params;

    const device = await prisma.biometricDevice.findFirst({
      where: { id, organizationId, branchId: givenBranch(req) }
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    await prisma.biometricDevice.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete device', details: error.message });
  }
};
