import { Router } from 'express';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from '../controllers/meetingController.js';
import { protect } from '../middleware/auth.js';
import { givenContext } from '../access/pageGuard.js';

const router = Router();

router.use(protect);

router.get('/', givenContext('meetings'), getMeetings);
router.post('/', createMeeting);
router.put('/:id', givenContext('meetings'), updateMeeting);
router.delete('/:id', givenContext('meetings'), deleteMeeting);

export default router;
