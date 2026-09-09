import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'medgare@gmail.com' } }).then(u => console.log('ROLE IS:', u?.role)).finally(() => prisma.$disconnect());
