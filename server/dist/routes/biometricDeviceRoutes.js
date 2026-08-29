import express from 'express';
import { getDevices, getDevice, createDevice, updateDevice, deleteDevice } from '../controllers/biometricDeviceController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = express.Router();
router.use(protect);
// Assuming 'superadmin' and 'hr_admin', 'hr_sub_admin' can manage devices
router.use(authorize('superadmin', 'hr_admin', 'hr_sub_admin'));
router.get('/', getDevices);
router.get('/:id', getDevice);
router.post('/', createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);
export default router;
//# sourceMappingURL=biometricDeviceRoutes.js.map