import { Router } from 'express';
import * as scheduleController from '../controllers/scheduleController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Public/All Roles
router.get('/latest', verifyToken, scheduleController.getLatestTimetable);

// Admin Only
router.post('/generate', verifyToken, requireRole('ADMIN'), scheduleController.generateSchedule);
router.get('/status/:jobId', verifyToken, requireRole('ADMIN'), scheduleController.getStatus);
router.get('/history', verifyToken, requireRole('ADMIN'), scheduleController.getHistory);
router.post('/publish/:timetableId', verifyToken, requireRole('ADMIN'), scheduleController.publishTimetable);
router.post('/reschedule', verifyToken, requireRole('ADMIN'), scheduleController.rescheduleTimetable);
router.post('/ai-query', verifyToken, scheduleController.llmQuery);

// Internal (No global auth middleware, handled inside controller via secret)
router.post('/internal/progress', scheduleController.handleInternalProgress);

export default router;
