import prisma from '../lib/prisma.js';

/**
 * Script to normalize and fix inflated lateMinutes on half-day attendance records.
 * Specifically corrects records where an afternoon half-day check-in was measured
 * against the morning shift start (adding ~270 minutes of excused leave time).
 */
async function fixHalfDayLateMinutes() {
  console.log('[Fix] Starting half-day late minutes audit and remediation...');

  try {
    // 1. Find all attendance records marked as 'half_day' with abnormal lateMinutes
    const affectedRecords = await prisma.attendance.findMany({
      where: {
        status: 'half_day',
        lateMinutes: { gte: 180 }
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    console.log(`[Fix] Found ${affectedRecords.length} half-day records with unadjusted morning offset (>= 180 mins).`);

    let updatedCount = 0;
    for (const record of affectedRecords) {
      const oldLate = record.lateMinutes || 0;
      // Excused morning half-day offset is ~270 minutes (4.5 hrs)
      const newLate = Math.max(0, oldLate - 270);
      const isLate = newLate > 0;

      await prisma.attendance.update({
        where: { id: record.id },
        data: {
          lateMinutes: newLate,
          isLate
        }
      });

      console.log(`[Fix] Updated ${record.user?.name} (${record.user?.email}) for date ${record.date.toISOString().slice(0, 10)}: ${oldLate}m -> ${newLate}m (isLate: ${isLate})`);
      updatedCount++;
    }

    console.log(`[Fix] Completed successfully! Fixed ${updatedCount} records.`);
  } catch (error) {
    console.error('[Fix] Error fixing half-day late minutes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHalfDayLateMinutes();
