import prisma from '../lib/prisma.js';
import { initializeFirebase } from '../config/firebase.config.js';
import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

async function main() {
  const rawArgs = process.argv.slice(2);
  const isDryRun = rawArgs.includes('--dry-run');
  const args = rawArgs.filter(a => a !== '--dry-run');

  const [versionName, buildNumber, ...notesArr] = args;
  const releaseNotes = notesArr.join(' ').trim();

  console.log('==================================================');
  console.log(`📢 Sending App Update Push Notification${isDryRun ? ' [DRY RUN]' : ''}`);
  console.log('==================================================');
  console.log(`Version: ${versionName || 'N/A'} (Build: ${buildNumber || 'N/A'})`);
  if (releaseNotes) {
    console.log(`Release Notes: ${releaseNotes}`);
  }

  // Ensure Firebase Admin is initialized
  initializeFirebase();

  if (getApps().length === 0) {
    console.error('❌ Error: Firebase Admin could not be initialized. Check FIREBASE_SERVICE_ACCOUNT in .env.');
    process.exit(1);
  }

  try {
    // 1. Fetch all tokens from database
    const allTokensRecord = await prisma.userFCMToken.findMany({
      select: {
        token: true,
      },
    });

    if (allTokensRecord.length === 0) {
      console.log('ℹ️ No FCM tokens found in the database. No notifications sent.');
      return;
    }

    // Deduplicate tokens
    const uniqueTokens = Array.from(new Set(allTokensRecord.map((t) => t.token)));
    console.log(`📱 Found ${uniqueTokens.length} unique FCM token(s) across all registered devices.`);

    const title = versionName 
      ? `👨‍💻 Message from the Developer (v${versionName})` 
      : '👨‍💻 Message from the Developer';

    const body = releaseNotes
      ? `Hey! Developer here. It worked on my machine, and now it will work on yours too ,tap to update 🚀 (${releaseNotes})`
      : 'Hey! Developer here. It worked on my machine, and now it will work on yours too ,tap to update 🚀';

    const payloadData: Record<string, string> = {
      type: 'app_update',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };
    if (versionName) payloadData.version = String(versionName);
    if (buildNumber) payloadData.buildNumber = String(buildNumber);
    if (releaseNotes) payloadData.releaseNotes = String(releaseNotes);

    if (isDryRun) {
      console.log('🔍 [DRY RUN] Notification Preview:');
      console.log({
        title,
        body,
        data: payloadData,
        targetTokensCount: uniqueTokens.length,
      });
      console.log('✅ Dry run completed successfully. No actual notifications were sent.');
      return;
    }

    // FCM sendEachForMulticast accepts max 500 tokens per batch
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    const tokensToRemove: string[] = [];

    for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
      const chunk = uniqueTokens.slice(i, i + CHUNK_SIZE);

      const message = {
        notification: {
          title,
          body,
        },
        data: payloadData,
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'high_importance_channel',
            sound: 'default',
            priority: 'high' as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        tokens: chunk,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // Identify invalid or expired tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(chunk[idx]);
          }
        }
      });
    }

    console.log(`✅ Push notifications dispatched! Success: ${totalSuccess}, Failed: ${totalFailure}`);
    console.log(`📢 Dispatched Message:\n   Title: "${title}"\n   Body: "${body}"`);

    // Remove expired / uninstalled tokens from the database
    if (tokensToRemove.length > 0) {
      console.log(`🧹 Cleaning up ${tokensToRemove.length} expired FCM token(s)...`);
      await prisma.userFCMToken.deleteMany({
        where: {
          token: {
            in: tokensToRemove,
          },
        },
      });
      console.log('✅ Token cleanup completed.');
    }
  } catch (error) {
    console.error('❌ Failed to send update push notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
