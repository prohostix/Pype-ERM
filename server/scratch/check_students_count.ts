import prisma from '../src/lib/prisma';

async function check() {
  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    const studentCount = await prisma.student.count({
      where: { organizationId: org.id }
    });
    console.log(`Org: ${org.name} (${org.id}) - Students: ${studentCount}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
