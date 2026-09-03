import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        name: {
          contains: 'TIMS',
          mode: 'insensitive'
        }
      }
    });

    if (orgs.length === 0) {
      console.log('No organization found matching "TIMS"');
      return;
    }

    console.log(`Found Organization: ${orgs[0].name} (${orgs[0].id})`);

    const users = await prisma.user.findMany({
      where: {
        organizationId: orgs[0].id,
        role: {
          in: ['hr_admin', 'finance_admin']
        }
      },
      select: {
        email: true,
        role: true,
        name: true
      }
    });

    console.log('Users found:');
    console.table(users);
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
