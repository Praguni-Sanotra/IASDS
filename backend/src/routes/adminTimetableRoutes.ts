import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import {
  generateAITimetable,
  getTimetableHistory,
  deleteTimetable,
  updateTimetableSlot,
  addTimetableSlot,
  deleteTimetableSlot,
  sendTimetableToHOD,
} from '../controllers/adminTimetableController';

const router = Router();

// All routes require ADMIN role
router.use(verifyToken, requireRole('ADMIN'));

/**
 * Timetable Management
 */
router.post('/timetable/:id/send-to-hod', sendTimetableToHOD);


/**
 * POST /api/admin/generate-timetable
 * Synchronous AI timetable generation.
 */
router.post('/generate-timetable', generateAITimetable);

/**
 * GET /api/admin/timetable-history
 * Full history of generated timetables.
 */
router.get('/timetable-history', getTimetableHistory);

/**
 * DELETE /api/admin/timetable/:id
 * Hard-delete a timetable document.
 */
router.delete('/timetable/:id', deleteTimetable);

/**
 * Slots Manual Editing Routes
 */
router.post('/timetable/:id/slots', addTimetableSlot);
router.put('/timetable/:id/slots/:slotId', updateTimetableSlot);
router.delete('/timetable/:id/slots/:slotId', deleteTimetableSlot);

export default router;
