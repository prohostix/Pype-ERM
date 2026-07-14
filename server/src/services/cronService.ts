import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { startEscalationCron } from './escalationService.js';

export const startAllCronJobs = () => {
  startInviteExpiryCron();
  startEscalationCron();
  startAutoPunchOutCron();
  console.log('✅ All cron jobs started');
};

const startInviteExpiryCron = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 Running invite token expiry check...');
    try {
      const result = await prisma.studyCenterInvite.updateMany({
        where: {
          status: 'pending',
          expiresAt: { lt: new Date() }
        },
        data: { status: 'expired' }
      });
      console.log(`✅ Expired ${result.count} invite tokens`);
    } catch (error) {
      console.error('❌ Invite expiry cron error:', error);
    }
  });
};

const startAutoPunchOutCron = () => {
  // Run at 12:01 AM every day
  cron.schedule('1 0 * * *', async () => {
    console.log('🔄 Running auto punch-out for unclosed attendances...');
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const pendingAttendances = await prisma.attendance.findMany({
        where: {
          checkOut: null,
          date: { lt: todayStart }
        }
      });

      let updatedCount = 0;
      for (const record of pendingAttendances) {
        if (!record.checkIn) continue;

        const checkOutTime = new Date(record.date);
        checkOutTime.setHours(23, 59, 59, 999);

        const checkInTime = new Date(record.checkIn).getTime();
        const workingHours = Number(((checkOutTime.getTime() - checkInTime) / 3600000).toFixed(2));

        const existingNotes = record.notes ? record.notes + '\n' : '';

        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            checkOut: checkOutTime,
            workingHours,
            notes: existingNotes + 'Auto-punched out by system at midnight.'
          }
        });
        updatedCount++;
      }
      
      console.log(`✅ Auto-punched out ${updatedCount} employees`);
    } catch (error) {
      console.error('❌ Auto punch-out cron error:', error);
    }
  });
};
