import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import {
  getPendingTimetables,
  approveTimetable,
  rejectTimetable,
} from '../controllers/hodController';

const router = Router();

router.use(verifyToken, requireRole('HOD'));

router.get('/pending-timetables', getPendingTimetables);
router.post('/timetable/:id/approve', approveTimetable);
router.post('/timetable/:id/reject', rejectTimetable);

export default router;
