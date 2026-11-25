import express from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getAssignableUsers,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import prisma from '../lib/prisma.js';
import { givenContext, type PageRequest } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

router.get('/assignable-users', getAssignableUsers);
// A task named in the URL must belong to the caller's organization
router.param('id', async (req: PageRequest, res, next, id) => {
  try {
    if (req.user.role === 'superadmin') return next();
    if (!(await prisma.task.findFirst({ where: { id, organizationId: req.user.organizationId }, select: { id: true } }))) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

router.route('/').get(givenContext('tasks'), getTasks).post(givenContext('tasks'), createTask);
router.route('/:id').get(getTask).put(givenContext('tasks'), updateTask).delete(deleteTask);
router.put('/:id/complete', upload.array('evidence', 5), completeTask);

export default router;
