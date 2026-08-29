import express from 'express';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../controllers/assetController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('hr_admin', 'hr_sub_admin', 'ceo', 'general_manager', 'superadmin'));

router.route('/')
  .get(getAssets)
  .post(createAsset);

router.route('/:id')
  .put(updateAsset)
  .delete(deleteAsset);

export default router;
