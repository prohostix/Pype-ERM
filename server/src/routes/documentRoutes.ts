import express from 'express';
import {
  getDocumentLogs,
  getDocumentLog,
  createDocumentLog,
  updateDocumentLog,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { pageAction, anyPageAction, ownedBy, type PageRequest } from '../access/pageGuard.js';
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

const DOCUMENT_PAGES = ['document_received', 'document_dispatch', 'courier_tracking', 'delivery_confirmation'];
const DOCUMENT_READERS = ['superadmin', 'org_admin', 'ops_admin', 'center_admin', 'employee', 'ops_sub_admin'];
const DOCUMENT_WRITERS = ['superadmin', 'org_admin', 'ops_admin', 'employee', 'ops_sub_admin'];
const record = pageAction('document_received', 'create', DOCUMENT_WRITERS);
const dispatch = pageAction('document_dispatch', 'create', DOCUMENT_WRITERS);

router.route('/')
  .get(anyPageAction(DOCUMENT_PAGES, 'view', DOCUMENT_READERS), getDocumentLogs)
  .post((req: PageRequest, res, next) => (req.body?.type === 'dispatched' ? dispatch : record)(req, res, next), createDocumentLog);

router.route('/:id')
  .get(anyPageAction(DOCUMENT_PAGES, 'view', DOCUMENT_READERS), getDocumentLog)
  .put(pageAction('delivery_confirmation', 'edit', DOCUMENT_WRITERS, { inOrganization: ownedBy('documentLog') }), updateDocumentLog);

export default router;
