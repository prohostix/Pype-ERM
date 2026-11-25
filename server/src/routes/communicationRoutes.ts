import express from 'express';
import {
  sendBulkEmail,
  sendBulkSms,
  sendBulkWhatsApp,
  getCommunicationLogs
} from '../controllers/communicationController.js';
import { protect } from '../middleware/auth.js';
import { pageAction, anyPageAction } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

router.post('/email', pageAction('email_notifications', 'create', ['superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'hr_admin', 'hr_sub_admin']), sendBulkEmail);
router.post('/sms', pageAction('bulk_sms', 'create', ['superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'hr_admin', 'hr_sub_admin']), sendBulkSms);
router.post('/whatsapp', pageAction('bulk_whatsapp', 'create', ['superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'hr_admin', 'hr_sub_admin']), sendBulkWhatsApp);

router.get('/logs', anyPageAction(['bulk_sms', 'bulk_whatsapp', 'email_notifications'], 'view', ['superadmin', 'org_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'hr_admin', 'hr_sub_admin']), getCommunicationLogs);

export default router;
