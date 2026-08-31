import { Router } from 'express';
import { saveFCMToken, removeFCMToken, testSendAll } from '../controllers/fcm-token.controller.js';
import { protect } from '../middleware/auth.js'; 

const router = Router();

router.post('/', protect as any, saveFCMToken);
router.delete('/', protect as any, removeFCMToken);

// Dummy endpoint to broadcast a push notification to ALL users for testing purposes.
// We intentionally leave this unprotected (or you could protect it) so you can test it easily from Postman or a browser.
router.post('/test-send-all', testSendAll);

export default router;
