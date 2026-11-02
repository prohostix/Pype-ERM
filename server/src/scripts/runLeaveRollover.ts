import prisma from '../lib/prisma.js';
import { runLeaveAllocationRollover } from '../services/cronService.js';

async function main() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  console.log(`🗑️ Deleting current month (${currentMonth}/${currentYear}) leave allocations...`);
  const del = await prisma.leaveAllocation.deleteMany({
    where: { year: currentYear, month: currentMonth }
  });
  console.log(`✅ Deleted ${del.count} existing records for ${currentMonth}/${currentYear}.`);

  console.log('🚀 Triggering fresh leave allocation rollover from previous month...');
  const result = await runLeaveAllocationRollover(currentYear, currentMonth);
  console.log(`✅ Completed! Rolled over ${result.allocatedCount} allocations into Month ${result.month}/${result.year} from Month ${result.prevMonth}/${result.prevYear}.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error executing rollover:', err);
  process.exit(1);
});
