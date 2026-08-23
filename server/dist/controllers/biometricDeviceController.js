import prisma from '../lib/prisma.js';
export const getDevices = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const devices = await prisma.biometricDevice.findMany({
            where: { organizationId },
            include: { branch: true }
        });
        res.json(devices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch devices', details: error.message });
    }
};
export const getDevice = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const device = await prisma.biometricDevice.findFirst({
            where: { id, organizationId },
            include: { branch: true }
        });
        if (!device)
            return res.status(404).json({ error: 'Device not found' });
        res.json(device);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch device', details: error.message });
    }
};
export const createDevice = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { name, serialNumber, ipAddress, branchId } = req.body;
        // Ensure SN is unique globally
        const existing = await prisma.biometricDevice.findUnique({
            where: { serialNumber }
        });
        if (existing)
            return res.status(400).json({ error: 'Device with this Serial Number already exists' });
        const device = await prisma.biometricDevice.create({
            data: {
                organizationId,
                name,
                serialNumber,
                ipAddress,
                branchId,
                status: 'active'
            }
        });
        res.status(201).json(device);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create device', details: error.message });
    }
};
export const updateDevice = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const { name, serialNumber, ipAddress, branchId, status } = req.body;
        const device = await prisma.biometricDevice.findFirst({
            where: { id, organizationId }
        });
        if (!device)
            return res.status(404).json({ error: 'Device not found' });
        const updated = await prisma.biometricDevice.update({
            where: { id },
            data: { name, serialNumber, ipAddress, branchId, status }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update device', details: error.message });
    }
};
export const deleteDevice = async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const device = await prisma.biometricDevice.findFirst({
            where: { id, organizationId }
        });
        if (!device)
            return res.status(404).json({ error: 'Device not found' });
        await prisma.biometricDevice.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete device', details: error.message });
    }
};
//# sourceMappingURL=biometricDeviceController.js.map