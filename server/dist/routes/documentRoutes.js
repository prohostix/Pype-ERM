import express from 'express';
import { getDocumentLogs, getDocumentLog, createDocumentLog, updateDocumentLog, } from '../controllers/documentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
const router = express.Router();
router.use(protect);
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
    }
    // @ts-ignore
    const fileUrl = `/uploads/${req.file.key || req.file.filename}`;
    res.status(200).json({ success: true, url: fileUrl });
});
router.route('/')
    .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin'), getDocumentLogs)
    .post(authorize('superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'), createDocumentLog);
router.route('/:id')
    .get(authorize('superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin'), getDocumentLog)
    .put(authorize('superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'), updateDocumentLog);
export default router;
//# sourceMappingURL=documentRoutes.js.map