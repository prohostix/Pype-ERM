import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }
        try {
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret)
                throw new Error('JWT_SECRET not configured');
            const decoded = jwt.verify(token, jwtSecret);
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true, userId: true, email: true, name: true, role: true,
                    phone: true, designation: true, status: true, lastLogin: true,
                    avatar: true, reportingTo: true, createdAt: true, updatedAt: true,
                    organizationId: true, departmentId: true, subDepartmentId: true,
                    branchId: true, studyCenterId: true, ceoPanelId: true,
                    allowSystemPunchIn: true, requireSelfiePunchIn: true, allowAnywherePunchIn: true,
                    organization: true, department: true, branch: true, studyCenter: true,
                }
            });
            if (!user) {
                res.status(401).json({ success: false, message: 'User not found' });
                return;
            }
            req.user = user;
            next();
        }
        catch (error) {
            res.status(401).json({ success: false, message: 'Invalid token' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Auth error' });
    }
};
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }
        next();
    };
};
//# sourceMappingURL=auth.js.map