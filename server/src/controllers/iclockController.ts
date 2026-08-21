import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

function differenceInMinutes(date1: Date, date2: Date) {
  return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / 1000 / 60));
}

// GET /iclock/cdata - Initialization & Handshake
export const iclockHandshake = async (req: Request, res: Response) => {
  const { SN } = req.query;
  console.log(`[iClock] Handshake request from device: ${SN}`);
  
  if (typeof SN === 'string') {
    try {
      // Update device lastActive if it exists in the database
      const device = await prisma.biometricDevice.findUnique({
        where: { serialNumber: SN }
      });
      
      if (device) {
        await prisma.biometricDevice.update({
          where: { id: device.id },
          data: { lastActive: new Date() }
        });
      }
    } catch (err) {
      console.error('[iClock] Error updating device lastActive:', err);
    }
  }

  // Basic settings to tell the device to operate in real-time push mode
  const responseText = `GET OPTION FROM: ${SN}\nStamp=9999\nOpStamp=9999\nErrorDelay=60\nDelay=10\nTransTimes=00:00;23:59\nTransInterval=1\nTransFlag=1111000000\nRealtime=1\nEncrypt=0`;
  
  res.type('text/plain').send(responseText);
};

// GET /iclock/getrequest - Device checking for pending commands from server
export const iclockGetRequest = (req: Request, res: Response) => {
  // We can return "OK" if there are no commands to execute on the device
  res.type('text/plain').send('OK');
};

// POST /iclock/cdata - Device pushing data (attendance logs, user info, etc)
export const iclockPushData = async (req: Request, res: Response) => {
  const { SN, table } = req.query;
  const data = req.body; // text/plain body

  if (!data || typeof data !== 'string') {
    return res.type('text/plain').send('OK');
  }

  if (typeof SN === 'string') {
    // Update lastActive timestamp
    await prisma.biometricDevice.updateMany({
      where: { serialNumber: SN },
      data: { lastActive: new Date() }
    });
  }

  // Handle Attendance Logs (ATTLOG)
  if (table === 'ATTLOG') {
    const lines = data.split('\n').filter(line => line.trim() !== '');
    
    let processedCount = 0;

    for (const line of lines) {
      // eSSL format: PIN \t Time \t Status \t VerifyType \t WorkCode
      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const biometricId = parts[0].trim(); // the userId on the machine
      const timestampStr = parts[1].trim(); // YYYY-MM-DD HH:MM:SS
      
      const punchTime = new Date(timestampStr);
      if (isNaN(punchTime.getTime())) continue;

      // 1. Map PIN to User via biometricId
      // ZKTeco sends the user's PIN in the PIN field. We map this to User.biometricId.
      let user = await prisma.user.findFirst({
        where: { biometricId }
      });
      
      // Fallback to userId if biometricId isn't found (for backwards compatibility)
      if (!user) {
        user = await prisma.user.findFirst({
          where: { userId: biometricId }
        });
      }

      if (!user || !user.organizationId) {
        console.warn(`[iClock] Punch received for unknown biometric PIN: ${biometricId}`);
        continue;
      }

      // Check for existing attendance record for this employee on this day
      const startOfDay = new Date(punchTime);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(punchTime);
      endOfDay.setHours(23, 59, 59, 999);

      let attendance = await prisma.attendance.findFirst({
        where: {
          employeeId: user.id,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      if (!attendance) {
        // First punch of the day -> Check In
        attendance = await prisma.attendance.create({
          data: {
            employeeId: user.id,
            organizationId: user.organizationId,
            date: startOfDay,
            checkIn: punchTime,
            status: 'present',
            isLate: false,
            lateMinutes: 0,
            workingHours: 0
          }
        });
      } else {
        // Subsequent punch -> Check Out (update working hours)
        const checkOutTime = punchTime;
        // Don't update if it's the exact same minute (duplicate punch prevention)
        if (attendance.checkOut && differenceInMinutes(checkOutTime, attendance.checkOut) < 1) {
          continue;
        }
        
        let workingHours = attendance.workingHours;
        const checkInTime = attendance.checkIn || startOfDay;
        const diffMinutes = differenceInMinutes(checkOutTime, checkInTime);
        workingHours = parseFloat((diffMinutes / 60).toFixed(2));

        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            checkOut: checkOutTime,
            workingHours
          }
        });
      }
      
      processedCount++;
    }

    console.log(`[iClock] Processed ${processedCount} attendance logs from device ${SN}`);
    return res.type('text/plain').send(`OK: ${processedCount}`);
  }

  // Fallback for other tables like OPERLOG, USER, etc.
  return res.type('text/plain').send('OK');
};
