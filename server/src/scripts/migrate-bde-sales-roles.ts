import prisma from '../lib/prisma';

async function main() {
  console.log("Migrating bde and sales_agent roles to employee...");
  try {
    const result = await prisma.$executeRaw`UPDATE "User" SET role = 'employee' WHERE role IN ('bde', 'sales_agent')`;
    console.log(`Successfully updated ${result} users to employee role.`);
  } catch (err) {
    console.error("Error migrating users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
