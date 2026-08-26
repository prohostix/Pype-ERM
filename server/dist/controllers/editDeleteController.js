import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from './notificationController.js';
import { NotificationType } from '../generated/client/index.js';
import { resolveTargetName } from '../utils/resolveEntity.js';
export const submitEditDeleteRequest = asyncHandler(async (req, res) => {
    const request = await prisma.editDeleteRequest.create({
        data: { ...req.body, organizationId: req.user.organizationId, userId: req.user.id, status: 'pending_manager' }
    });
    res.status(201).json({ success: true, data: request });
});
export const getEditDeleteRequests = asyncHandler(async (req, res) => {
    const role = req.user.role;
    const orgId = req.user.organizationId;
    // Build status filter based on role
    let statusFilter = [];
    if (role === 'superadmin' || role === 'org_admin') {
        // Superadmin/org_admin see everything
        statusFilter = ['pending_manager', 'pending_ceo', 'approved', 'rejected'];
    }
    else if (role === 'ceo' || role === 'general_manager') {
        // CEO sees both pending_manager and pending_ceo
        statusFilter = ['pending_manager', 'pending_ceo', 'approved', 'rejected'];
    }
    else {
        // Managers / finance see pending_manager
        statusFilter = ['pending_manager', 'approved', 'rejected'];
    }
    const requests = await prisma.editDeleteRequest.findMany({
        where: {
            organizationId: orgId,
            status: { in: statusFilter }
        },
        include: {
            user: {
                select: { id: true, name: true, email: true, role: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    const resolvedRequests = await Promise.all(requests.map(async (r) => {
        const targetName = await resolveTargetName(r.entityId);
        return { ...r, targetName };
    }));
    res.json({ success: true, count: resolvedRequests.length, data: resolvedRequests });
});
export const getEditDeleteRequest = asyncHandler(async (req, res) => {
    const request = await prisma.editDeleteRequest.findUnique({
        where: { id: req.params.id },
        include: { user: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data: request });
});
/**
 * Execute the actual deletion using Prisma directly, based on entityType and entityId URL.
 * entityId is stored as a path like /api/v1/students/abc123
 * We parse it to determine which table and which record ID to delete.
 */
async function executeApprovedDeletion(entityId, organizationId) {
    try {
        const parts = entityId.split('?')[0].split('/').filter(Boolean);
        // Strip /api/v1 prefix
        if (parts[0] === 'api' && parts[1] === 'v1')
            parts.splice(0, 2);
        const id = parts[parts.length - 1];
        const endpoint = parts[0];
        const sub = parts[1];
        if (!id)
            return { success: false, error: 'Cannot parse entity ID from URL' };
        if (endpoint === 'students') {
            await prisma.student.delete({ where: { id } });
        }
        else if (endpoint === 'users') {
            await prisma.user.update({ where: { id }, data: { status: 'resigned' } });
        }
        else if (endpoint === 'departments') {
            await prisma.department.delete({ where: { id } });
        }
        else if (endpoint === 'sub-departments') {
            await prisma.subDepartment.delete({ where: { id } });
        }
        else if (endpoint === 'tasks') {
            await prisma.task.delete({ where: { id } });
        }
        else if (endpoint === 'assets') {
            await prisma.asset.delete({ where: { id } });
        }
        else if (endpoint === 'org') {
            if (sub === 'branches') {
                await prisma.branch.delete({ where: { id } });
            }
            else if (sub === 'designations') {
                await prisma.designation.delete({ where: { id } });
            }
        }
        else if (endpoint === 'hr') {
            if (sub === 'holidays') {
                await prisma.holiday.delete({ where: { id } });
            }
            else if (sub === 'vacancies') {
                await prisma.vacancy.delete({ where: { id } });
            }
            else if (sub === 'announcements') {
                await prisma.announcement.delete({ where: { id } });
            }
            else if (sub === 'polls') {
                await prisma.poll.delete({ where: { id } });
            }
            else if (sub === 'complaints') {
                await prisma.complaint.delete({ where: { id } });
            }
        }
        else if (endpoint === 'finance') {
            if (sub === 'invoices') {
                await prisma.invoice.delete({ where: { id } });
            }
            else if (sub === 'fees') {
                await prisma.feeStructure.delete({ where: { id } });
            }
            else if (sub === 'payments') {
                await prisma.paymentEntry.delete({ where: { id } });
            }
        }
        else if (endpoint === 'operations') {
            if (sub === 'centers') {
                await prisma.studyCenter.delete({ where: { id } });
            }
            else if (sub === 'programs') {
                await prisma.program.delete({ where: { id } });
            }
            else if (sub === 'universities') {
                await prisma.university.delete({ where: { id } });
            }
            else if (sub === 'sessions') {
                await prisma.admissionSession.delete({ where: { id } });
            }
        }
        else if (endpoint === 'sales') {
            if (sub === 'leads') {
                await prisma.lead.delete({ where: { id } });
            }
        }
        else {
            return { success: false, error: `Unknown entity type: ${endpoint}` };
        }
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
export const respondToEditDeleteRequest = asyncHandler(async (req, res) => {
    const { status, responseRemarks } = req.body;
    const requestId = req.params.id;
    const role = req.user.role;
    let request = await prisma.editDeleteRequest.findUnique({ where: { id: requestId } });
    if (!request)
        return res.status(404).json({ success: false, message: 'Request not found' });
    // Determine next status in approval chain
    let newStatus = status;
    if (status === 'approved') {
        if (request.status === 'pending_manager') {
            // Manager approved — escalate to CEO
            newStatus = 'pending_ceo';
        }
        else if (request.status === 'pending_ceo') {
            // CEO/Org Admin final approval
            newStatus = 'approved';
        }
        // If superadmin/org_admin/ceo/general_manager directly approves at any stage — fully approve
        if (['superadmin', 'org_admin', 'ceo', 'general_manager'].includes(role)) {
            newStatus = 'approved';
        }
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
    // Send appropriate notifications
    if (newStatus === 'rejected') {
        await createNotification(request.organizationId, request.userId, NotificationType.general, 'Delete Request Rejected', `Your delete request was rejected. ${responseRemarks ? `Reason: ${responseRemarks}` : ''}`, '/dashboard');
    }
    else if (newStatus === 'pending_ceo') {
        await createNotification(request.organizationId, request.userId, NotificationType.general, 'Delete Request Advanced', `Your delete request was approved by management and is now pending final approval.`, '/dashboard');
    }
    else if (newStatus === 'approved') {
        // Execute the actual deletion via Prisma (not fragile loopback fetch)
        const deleteResult = await executeApprovedDeletion(request.entityId, request.organizationId);
        if (deleteResult.success) {
            await createNotification(request.organizationId, request.userId, NotificationType.general, 'Delete Request Approved & Executed', `Your delete request was approved and the record has been permanently deleted.`, '/dashboard');
        }
        else {
            // Mark as approved but log the failure — record may already be deleted
            console.error(`[DeleteRequest] Deletion failed for ${request.entityId}: ${deleteResult.error}`);
            await createNotification(request.organizationId, request.userId, NotificationType.general, 'Delete Request Approved', `Your delete request was approved. Note: ${deleteResult.error || 'Record may already have been removed.'}`, '/dashboard');
        }
    }
    res.json({ success: true, data: request });
});
export const getEditDeleteStats = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const [pendingManager, pendingCeo, approved, rejected, total] = await Promise.all([
        prisma.editDeleteRequest.count({ where: { organizationId: orgId, status: 'pending_manager' } }),
        prisma.editDeleteRequest.count({ where: { organizationId: orgId, status: 'pending_ceo' } }),
        prisma.editDeleteRequest.count({ where: { organizationId: orgId, status: 'approved' } }),
        prisma.editDeleteRequest.count({ where: { organizationId: orgId, status: 'rejected' } }),
        prisma.editDeleteRequest.count({ where: { organizationId: orgId } }),
    ]);
    res.json({ success: true, data: { pendingManager, pendingCeo, approved, rejected, total } });
});
//# sourceMappingURL=editDeleteController.js.map