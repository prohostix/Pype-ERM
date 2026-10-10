import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        name: {
          contains: 'TIMS',
          mode: 'insensitive',
        },
      },
    });

    if (orgs.length === 0) {
      console.log('Organization not found.');
      return;
    }

    let totalLeads = 0;
    for (const org of orgs) {
      const count = await prisma.lead.count({
        where: {
          organizationId: org.id,
        },
      });
      console.log(`Organization: ${org.name} (ID: ${org.id})`);
      console.log(`Lead Count: ${count}`);
      totalLeads += count;
    }
    console.log(`Total Leads: ${totalLeads}`);
  } catch (e) {
    console.error(e);
  }
}

main();
