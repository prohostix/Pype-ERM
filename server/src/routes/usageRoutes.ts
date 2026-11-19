import express from 'express';
import { protect } from '../middleware/auth.js';
import { heartbeat, getMyUsage } from '../controllers/usageController.js';

const router = express.Router();
router.use(protect);
router.post('/heartbeat', heartbeat);
router.get('/me', getMyUsage);

export default router;
