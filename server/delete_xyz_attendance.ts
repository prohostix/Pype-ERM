import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { contains: 'xyz', mode: 'insensitive' } },
        { email: { contains: 'xyz', mode: 'insensitive' } }
      ]
    }
  });

  if (!org) {
    console.log('No organization found matching xyz');
    return;
  }

  console.log('Found organization:', org.name, org.id);

  const result = await prisma.attendance.deleteMany({
    where: { organizationId: org.id }
  });

  console.log('Deleted', result.count, 'attendance records for organization', org.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
