import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const student = await prisma.student.findFirst();
  console.log('typeof:', typeof student?.admissionProgress);
  console.log('value:', student?.admissionProgress);
}
main();
