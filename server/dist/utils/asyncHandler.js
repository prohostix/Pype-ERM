import { processDeleteRequest } from '../middleware/deleteApproval.js';
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        if (req.method === 'DELETE') {
            processDeleteRequest(req, res, next, fn);
        }
        else {
            Promise.resolve(fn(req, res, next)).catch(next);
        }
    };
};
// Extract the string ID from an organizationId that may be a populated object or plain ObjectId
export function resolveOrgId(orgId) {
    if (!orgId)
        return '';
    if (typeof orgId === 'object' && orgId._id)
        return orgId._id.toString();
    return orgId.toString();
}
//# sourceMappingURL=asyncHandler.js.map