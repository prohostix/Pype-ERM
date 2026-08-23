import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const uni = await prisma.university.findFirst();
  if (!uni) { console.log("No uni"); return; }
  console.log("Updating uni:", uni.id);
  try {
    const res = await prisma.university.update({
      where: { id: uni.id },
      data: {
        name: uni.name + " Test",
        allowedBranches: { set: [] }
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Prisma error:", err);
  }
}
main().finally(() => prisma.$disconnect());
