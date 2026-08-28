import prisma from '../lib/prisma.js';

async function main() {
  console.log("Migrating center_admin role to employee...");
  try {
    const result = await prisma.$executeRaw`UPDATE "User" SET role = 'employee' WHERE role = 'center_admin'`;
    console.log(`Successfully updated ${result} users to employee role.`);
  } catch (err) {
    console.error("Error migrating users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
