import express from 'express';
import { getLatestRelease, downloadApk } from '../controllers/appReleaseController.js';

const router = express.Router();

// Both endpoints are intentionally public (no authentication required)
router.get('/latest', getLatestRelease);
router.get('/download/:platform', downloadApk);

export default router;
