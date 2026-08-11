import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ take: 1 });
  if (orgs.length === 0) return console.log("No orgs");
  const orgId = orgs[0].id;
  console.log("Org ID:", orgId);

  const invoices = await prisma.invoice.count({ where: { organizationId: orgId } });
  const payments = await prisma.paymentEntry.count({ where: { organizationId: orgId } });
  const expenses = await prisma.expenseClaim.count({ where: { organizationId: orgId } });
  const payrolls = await prisma.payroll.count({ where: { organizationId: orgId } });
  console.log({ invoices, payments, expenses, payrolls });
}
main().finally(() => prisma.$disconnect());
