import prisma from '../lib/prisma.js';
export const auditLog = (action, entityType) => {
    return async (req, res, next) => {
        try {
            const originalSend = res.json;
            res.json = function (data) {
                if (data.success && req.user) {
                    const entityId = req.params.id || data.data?.id;
                    if (entityId) {
                        prisma.auditLog.create({
                            data: {
                                organizationId: req.user.organizationId,
                                userId: req.user.id,
                                action,
                                entityType,
                                entityId: entityId.toString(),
                                newValue: req.body,
                                ipAddress: req.ip || '0.0.0.0',
                            }
                        }).catch(err => console.error('Audit log error:', err));
                    }
                }
                return originalSend.call(this, data);
            };
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
//# sourceMappingURL=auditLog.js.map