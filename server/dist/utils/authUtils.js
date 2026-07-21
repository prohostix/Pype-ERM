import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
/**
 * Hash a plain text password
 */
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};
/**
 * Compare plain text password with hashed password
 */
export const comparePassword = async (password, hashed) => {
    return await bcrypt.compare(password, hashed);
};
export const generateUserId = async () => {
    const lastUser = await prisma.user.findFirst({
        where: {
            userId: {
                startsWith: 'PYPEERM',
            },
        },
        orderBy: {
            userId: 'desc',
        },
    });
    let nextNum = 1;
    if (lastUser && lastUser.userId) {
        const numPart = lastUser.userId.replace('PYPEERM', '');
        const num = parseInt(numPart, 10);
        if (!isNaN(num)) {
            nextNum = num + 1;
        }
    }
    // Fallback / safety loop to prevent collisions
    let userId = `PYPEERM${String(nextNum).padStart(4, '0')}`;
    let exists = await prisma.user.findUnique({ where: { userId } });
    while (exists) {
        nextNum++;
        userId = `PYPEERM${String(nextNum).padStart(4, '0')}`;
        exists = await prisma.user.findUnique({ where: { userId } });
    }
    return userId;
};
//# sourceMappingURL=authUtils.js.map