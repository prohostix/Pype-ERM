import prisma from './src/lib/prisma.js';

async function main() {
  const batches = await prisma.payrollBatch.findMany();
  
  for (const batch of batches) {
    if (batch.status === 'completed') {
      await prisma.payroll.updateMany({
        where: { id: { in: batch.payrollIds } },
        data: { status: 'paid', paymentDate: batch.completedAt || new Date(), paymentMethod: 'bank_transfer' }
      });
      console.log(`Updated payrolls in completed batch ${batch.id} to paid`);
    } else if (batch.status === 'approved_by_finance') {
      await prisma.payroll.updateMany({
        where: { id: { in: batch.payrollIds } },
        data: { status: 'transferred_to_finance', financeApprovedBy: batch.approvedBy, financeApprovedAt: batch.approvedAt }
      });
      console.log(`Updated payrolls in approved batch ${batch.id}`);
    } else if (batch.status === 'pending_finance_approval') {
      await prisma.payroll.updateMany({
        where: { id: { in: batch.payrollIds } },
        data: { status: 'transferred_to_finance' }
      });
      console.log(`Updated payrolls in pending batch ${batch.id}`);
    } else if (batch.status === 'rejected') {
      await prisma.payroll.updateMany({
        where: { id: { in: batch.payrollIds } },
        data: { status: 'confirmed' }
      });
      console.log(`Updated payrolls in rejected batch ${batch.id}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
