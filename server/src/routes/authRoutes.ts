import express from 'express';
import {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

// Generic upload endpoint for photos and documents
router.post('/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, url: fileUrl });
});

export default router;
