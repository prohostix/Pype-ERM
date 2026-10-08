import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'xyz', mode: 'insensitive' } }
  });
  
  if (!org) {
    console.log('Organization xyz not found');
    return;
  }
  
  console.log('Found org:', org.name, 'with ID:', org.id);
  
  const enrollmentIds = await prisma.enrollment.findMany({
    where: { organizationId: org.id },
    select: { id: true }
  }).then(res => res.map(e => e.id));

  if (enrollmentIds.length > 0) {
    const epResult = await prisma.enrollmentPayment.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } }
    });
    console.log('Deleted enrollment payments count:', epResult.count);
  }

  const studentIds = await prisma.student.findMany({
    where: { organizationId: org.id },
    select: { id: true }
  }).then(res => res.map(s => s.id));

  const payResult = await prisma.paymentEntry.deleteMany({
    where: { organizationId: org.id }
  });
  console.log('Deleted payment entries count:', payResult.count);

  const invResult = await prisma.invoice.deleteMany({
    where: { organizationId: org.id }
  });
  console.log('Deleted invoices count:', invResult.count);

  const enrollmentsResult = await prisma.enrollment.deleteMany({
    where: { organizationId: org.id }
  });
  console.log('Deleted enrollments count:', enrollmentsResult.count);

  const studentsResult = await prisma.student.deleteMany({
    where: { organizationId: org.id }
  });
  console.log('Deleted students count:', studentsResult.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
