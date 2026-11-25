import express from 'express';
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice
} from '../controllers/biometricDeviceController.js';
import { protect } from '../middleware/auth.js';
import { pageAction } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);
// Assuming 'superadmin' and 'hr_admin', 'hr_sub_admin' can manage devices
const DEVICE_ROLES = ['superadmin', 'hr_admin', 'hr_sub_admin'];

router.get('/', pageAction('biometric_devices', 'view', DEVICE_ROLES), getDevices);
router.get('/:id', pageAction('biometric_devices', 'view', DEVICE_ROLES), getDevice);
router.post('/', pageAction('biometric_devices', 'create', DEVICE_ROLES), createDevice);
router.put('/:id', pageAction('biometric_devices', 'edit', DEVICE_ROLES), updateDevice);
router.delete('/:id', pageAction('biometric_devices', 'delete', DEVICE_ROLES), deleteDevice);

export default router;
