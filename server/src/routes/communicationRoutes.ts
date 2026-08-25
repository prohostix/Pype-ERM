import express from 'express';
import {
  sendBulkEmail,
  sendBulkSms,
  sendBulkWhatsApp,
  getCommunicationLogs
} from '../controllers/communicationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/email', authorize('superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'hr_admin'), sendBulkEmail);
router.post('/sms', authorize('superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'hr_admin'), sendBulkSms);
router.post('/whatsapp', authorize('superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'hr_admin'), sendBulkWhatsApp);

router.get('/logs', authorize('superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'hr_admin'), getCommunicationLogs);

export default router;
