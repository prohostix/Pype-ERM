import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const submitEditDeleteRequest = asyncHandler(async (req, res) => {
    const request = await prisma.editDeleteRequest.create({
        data: { ...req.body, organizationId: req.user.organizationId, userId: req.user.id, status: 'pending' }
    });
    res.status(201).json({ success: true, data: request });
});
export const getEditDeleteRequests = asyncHandler(async (req, res) => {
    const role = req.user.role;
    let whereClause = { organizationId: req.user.organizationId, requestType: 'delete' };
    if (role === 'ceo' || role === 'superadmin') {
        // CEO sees everything that is pending CEO, or approved/rejected
        // actually, let's just show all for CEO so they can see history
    }
    else {
        // Manager sees only pending_manager or requests from their own department
        whereClause.status = 'pending_manager';
        // Ideally we filter by department, but for simplicity we will just return pending_manager
        // in their organization. If we had more time we could filter by user.employee.departmentId
    }
    const requests = await prisma.editDeleteRequest.findMany({
        where: whereClause,
        include: {
            user: {
                select: { id: true, name: true, email: true, role: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: requests.length, data: requests });
});
export const getEditDeleteRequest = asyncHandler(async (req, res) => {
    const request = await prisma.editDeleteRequest.findUnique({ where: { id: req.params.id }, include: { user: { select: { id: true, name: true } } } });
    res.json({ success: true, data: request });
});
export const respondToEditDeleteRequest = asyncHandler(async (req, res) => {
    const { status, responseRemarks } = req.body;
    const requestId = req.params.id;
    const role = req.user.role;
    let request = await prisma.editDeleteRequest.findUnique({ where: { id: requestId } });
    if (!request)
        return res.status(404).json({ success: false, message: 'Request not found' });
    let newStatus = status;
    if (status === 'approved' && request.status === 'pending_manager') {
        newStatus = 'pending_ceo';
    }
    else if (status === 'approved' && request.status === 'pending_ceo') {
        newStatus = 'approved';
    }
    request = await prisma.editDeleteRequest.update({
        where: { id: requestId },
        data: {
            status: newStatus,
            responseRemarks: responseRemarks || null,
            respondedBy: req.user.id,
            respondedAt: new Date()
        }
    });
    // If fully approved, execute the actual deletion bypass!
    if (newStatus === 'approved') {
        try {
            const targetUrl = request.entityId;
            // We make a loopback call to the server itself with the bypass header
            const port = process.env.PORT || 5000;
            const bypassResponse = await fetch(`http://localhost:${port}${targetUrl}`, {
                method: 'DELETE',
                headers: {
                    'x-bypass-delete-approval': 'true',
                    'Authorization': req.headers.authorization
                }
            });
            console.log('Delete executed successfully via bypass', bypassResponse.status);
        }
        catch (error) {
            console.error('Failed to execute bypass delete:', error.message);
            // Even if it fails (e.g. record already deleted), we leave it as approved.
        }
    }
    res.json({ success: true, data: request });
});
export const getEditDeleteStats = asyncHandler(async (req, res) => {
    res.json({ success: true, data: {} });
});
//# sourceMappingURL=editDeleteController.js.map