import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from 'fs';
import path from 'path';

interface ReleaseManifest {
  versionName: string;
  versionCode: number;
  releaseNotes: string;
  apkFileName: string;
  releasedAt: string;
}

/**
 * @route   GET /api/v1/app-releases/latest?platform=<key>
 * @desc    Get the latest release manifest for the given platform
 * @access  Public
 */
export const getLatestRelease = asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.query;

  if (!platform || typeof platform !== 'string') {
    res.status(400).json({ success: false, message: 'Platform query parameter is required' });
    return;
  }

  const settingKey = `app_release_${platform}`;

  const setting = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  if (!setting || !setting.value) {
    res.status(404).json({ success: false, message: `No release published yet for platform "${platform}"` });
    return;
  }

  res.status(200).json(setting.value);
});

/**
 * @route   GET /api/v1/app-releases/download/:platform
 * @desc    Download the latest APK for the given platform
 * @access  Public
 */
export const downloadApk = asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params;

  const settingKey = `app_release_${platform}`;

  const setting = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  if (!setting || !setting.value) {
    res.status(404).json({ success: false, message: `No release published yet for platform "${platform}"` });
    return;
  }

  const manifest = setting.value as unknown as ReleaseManifest;
  
  if (!manifest.apkFileName) {
    res.status(404).json({ success: false, message: 'APK file name not found in manifest' });
    return;
  }

  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  const releasesFolder = path.join(uploadPath, 'releases');
  const filePath = path.join(releasesFolder, manifest.apkFileName);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: 'APK file not found on server' });
    return;
  }

  const absolutePath = path.resolve(filePath);

  res.download(absolutePath, manifest.apkFileName, (err) => {
    if (err) {
      if (res.headersSent) {
        // Headers already sent, stream closed or client aborted
        return;
      }
      console.error('Error sending APK file:', err);
      res.status(500).json({ success: false, message: 'Failed to download APK file' });
    }
  });
});
