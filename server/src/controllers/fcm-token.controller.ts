import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export const saveFCMToken = async (req: Request, res: Response) => {
  try {
    const { token, deviceType } = req.body;
    // Assuming you have authentication middleware that sets req.user
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!token) {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    // Upsert the token to ensure we don't have duplicates for the exact same token
    // If the token exists (e.g. user logged out and logged in as someone else), we update the userId
    const savedToken = await prisma.userFCMToken.upsert({
      where: {
        token: token,
      },
      update: {
        userId: userId,
        deviceType: deviceType || null,
      },
      create: {
        userId: userId,
        token: token,
        deviceType: deviceType || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'FCM token saved successfully',
      data: savedToken,
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const removeFCMToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!token) {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    await prisma.userFCMToken.deleteMany({
      where: {
        token: token,
        userId: userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export const testSendAll = async (req: Request, res: Response) => {
  try {
    const { title, body, data } = req.body;

    const allTokens = await prisma.userFCMToken.findMany();
    
    if (allTokens.length === 0) {
      return res.status(404).json({ success: false, message: 'No FCM tokens found in the database.' });
    }

    const tokens = allTokens.map(t => t.token);

    if (getApps().length === 0) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized.' });
    }

    const message = {
      notification: {
        title: title || 'Test Notification',
        body: body || 'This is a test broadcast to all devices!',
      },
      data: data || {},
      tokens: tokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);

    return res.status(200).json({
      success: true,
      message: `Successfully sent ${response.successCount} messages. Failed: ${response.failureCount}`,
      details: response
    });
  } catch (error) {
    console.error('Error in testSendAll:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
