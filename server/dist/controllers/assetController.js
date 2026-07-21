import prisma from '../lib/prisma.js';
export const getAssets = async (req, res) => {
    try {
        const assets = await prisma.asset.findMany({
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
    }
    catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
export const createAsset = async (req, res) => {
    try {
        const { type, brand, model, serialNumber, imeiNumber, networkProvider, phoneNumber, userId, status, notes, assignedDate, returnedDate } = req.body;
        if (!type || !userId) {
            return res.status(400).json({ success: false, message: 'Type and Assigned User are required' });
        }
        const newAsset = await prisma.asset.create({
            data: {
                type: type,
                brand,
                model,
                serialNumber,
                imeiNumber,
                networkProvider,
                phoneNumber,
                userId,
                status: status || 'ASSIGNED',
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
    }
    catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
export const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, brand, model, serialNumber, imeiNumber, networkProvider, phoneNumber, userId, status, notes, assignedDate, returnedDate } = req.body;
        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: {
                type: type ? type : undefined,
                brand,
                model,
                serialNumber,
                imeiNumber,
                networkProvider,
                phoneNumber,
                userId,
                status: status ? status : undefined,
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
    }
    catch (error) {
        console.error('Error updating asset:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
export const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        await prisma.asset.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Asset deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
//# sourceMappingURL=assetController.js.map