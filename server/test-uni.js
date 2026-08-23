import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const uni = await prisma.university.findUnique({
    where: { id: "d6fd61f4-ac56-4e1f-86de-c11f4042eddd" },
    include: { admissionSessions: true }
  });
  console.log("Uni:", uni ? JSON.stringify(uni, null, 2) : "NOT FOUND");
}
main().finally(() => prisma.$disconnect());
