import { Router } from 'express';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from '../controllers/meetingController.js';
import { protect } from '../middleware/auth.js';
const router = Router();
router.use(protect);
router.get('/', getMeetings);
router.post('/', createMeeting);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);
export default router;
//# sourceMappingURL=meetingRoutes.js.map