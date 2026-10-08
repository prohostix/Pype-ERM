import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting safe database update...');
  try {
    // Check if column exists first to be completely safe
    console.log('Adding customLoginSlug column...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customLoginSlug" TEXT UNIQUE;`);
    
    console.log('Adding loginBranding column...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "loginBranding" JSONB;`);

    console.log('✅ Successfully added the new columns without touching existing data!');
  } catch (error) {
    console.error('❌ Error updating database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
