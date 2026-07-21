import express from 'express';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../controllers/assetController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
router.use(protect);
router.use(authorize('hr_admin', 'ceo', 'superadmin'));
router.route('/')
    .get(getAssets)
    .post(createAsset);
router.route('/:id')
    .put(updateAsset)
    .delete(deleteAsset);
export default router;
//# sourceMappingURL=assetRoutes.js.map