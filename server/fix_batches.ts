import prisma from './src/lib/prisma.js';

async function main() {
  const batches = await prisma.payrollBatch.findMany({
    where: { month: { startsWith: 'undefined-' } }
  });

  for (const b of batches) {
    const fixedMonth = b.month.replace('undefined-', '');
    await prisma.payrollBatch.update({
      where: { id: b.id },
      data: { month: fixedMonth }
    });
    console.log(`Updated ${b.id} from ${b.month} to ${fixedMonth}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
