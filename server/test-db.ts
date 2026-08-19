import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({ select: { name: true, photo: true }, take: 5 });
  console.log("Students:", students);
  const universities = await prisma.university.findMany({ select: { name: true, logo: true }, take: 5 });
  console.log("Universities:", universities);
}
main().catch(console.error).finally(() => prisma.$disconnect());
