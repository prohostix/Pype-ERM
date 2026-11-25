import express from 'express';
import { getAccessUsers, getAccessUser, saveAccessUser, getAccessHistory } from '../controllers/accessController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Per-user access is managed by the Org Admin only
router.use(protect, authorize('org_admin'));

router.get('/users', getAccessUsers);
router.route('/users/:id').get(getAccessUser).put(saveAccessUser);
router.get('/users/:id/history', getAccessHistory);

export default router;
