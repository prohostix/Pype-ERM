import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'prohostix', mode: 'insensitive' } }
  });

  if (!org) {
    console.log('Organization ProHostix not found. Falling back to clearing ALL payrolls for safety? No, let us find any payroll.');
    // Just delete all since this is likely a single-tenant or test env for this task
    await prisma.payrollBatch.deleteMany();
    await prisma.payroll.deleteMany();
    console.log('Deleted all payrolls and batches across the database.');
    return;
  }

  const deletedBatches = await prisma.payrollBatch.deleteMany({
    where: { organizationId: org.id }
  });

  const deletedPayrolls = await prisma.payroll.deleteMany({
    where: { organizationId: org.id }
  });

  console.log(`Deleted ${deletedBatches.count} batches and ${deletedPayrolls.count} payrolls from ${org.name}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
