import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  try {
    const deleted = await prisma.academicClass.delete({
      where: { id: '2207ce42-a325-47a9-88cc-973c7729de93' }
    });
    console.log('Successfully deleted Academic Class:', deleted.id, deleted.name);
  } catch (error) {
    console.error('Error deleting Academic Class:', error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
