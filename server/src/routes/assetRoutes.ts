import express from 'express';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../controllers/assetController.js';
import { protect } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);
const ASSET_ROLES = ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager', 'branch_manager', 'org_admin', 'superadmin'];

router.route('/')
  .get(pageAction('assets', 'view', ASSET_ROLES), getAssets)
  .post(pageAction('assets', 'create', ASSET_ROLES), createAsset);

router.route('/:id')
  .put(pageAction('assets', 'edit', ASSET_ROLES), updateAsset)
  .delete(pageAction('assets', 'delete', ASSET_ROLES), deleteAsset);

export default router;
