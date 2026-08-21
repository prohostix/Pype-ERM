import express from 'express';
import { iclockHandshake, iclockGetRequest, iclockPushData } from '../controllers/iclockController.js';

const router = express.Router();

// Middleware to parse text/plain for /iclock routes since devices send raw text body
router.use(express.text({ type: ['text/plain', 'application/x-www-form-urlencoded'] }));

router.get('/cdata', iclockHandshake);
router.get('/getrequest', iclockGetRequest);
router.post('/cdata', iclockPushData);
// Optional fallback if device uses devicecmd
router.post('/devicecmd', (req, res) => res.type('text/plain').send('OK'));

export default router;
