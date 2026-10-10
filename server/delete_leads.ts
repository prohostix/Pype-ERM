import prisma from './src/lib/prisma.js';

async function main() {
  const orgId = '12d196f2-a642-4fce-94ad-22f458d5733e';
  try {
    console.log(`Deleting all leads for organization ID: ${orgId}...`);
    const deleteResult = await prisma.lead.deleteMany({
      where: {
        organizationId: orgId,
      },
    });

    console.log(`Deleted ${deleteResult.count} leads.`);

    const countAfter = await prisma.lead.count({
      where: {
        organizationId: orgId,
      },
    });
    console.log(`Leads remaining: ${countAfter}`);
  } catch (e) {
    console.error('Error deleting leads:', e);
  }
}

main();
