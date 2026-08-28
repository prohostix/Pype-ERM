import { prisma } from '../config/database.js';
export const processDeleteRequest = async (req, res, next, originalFn) => {
    try {
        const authReq = req;
        // Ignore if not a DELETE request or if it's already bypassing
        if (req.method !== 'DELETE' || req.headers['x-bypass-delete-approval'] === 'true' || !authReq.user) {
            return Promise.resolve(originalFn(req, res, next)).catch(next);
        }
        // Ignore specific routes that shouldn't require approval (e.g. auth logout if it was a delete)
        if (req.originalUrl.includes('/edit-delete-requests')) {
            return Promise.resolve(originalFn(req, res, next)).catch(next);
        }
        const reason = req.headers['x-delete-reason'] || req.body?.reason;
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Delete reason is mandatory for all deletion requests.' });
        }
        const role = authReq.user.role;
        // If CEO, just process immediately (or they also need a request?)
        // "all delete process must have department mangers approval and ceo approval" 
        // If CEO is doing it, bypass since they are CEO.
        if (role === 'ceo') {
            return Promise.resolve(originalFn(req, res, next)).catch(next);
        }
        // Otherwise, create request
        let status = 'pending_manager';
        // If they are a department manager (e.g., hr_admin, operations_admin, finance_admin, etc.)
        // or if they are superadmin, skip manager step.
        const managerRoles = ['hr_admin', 'operations_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'superadmin'];
        if (managerRoles.includes(role)) {
            status = 'pending_ceo';
        }
        const request = await prisma.editDeleteRequest.create({
            data: {
                organizationId: authReq.user.organizationId,
                userId: authReq.user.id,
                entityType: 'api_delete',
                entityId: req.originalUrl,
                requestType: 'delete',
                reason: reason,
                status: status
            }
        });
        return res.status(202).json({
            success: true,
            message: 'Delete request submitted for approval',
            isDeleteRequest: true,
            data: request
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=deleteApproval.js.map