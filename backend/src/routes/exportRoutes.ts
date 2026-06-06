import { Router } from 'express';
import * as exportController from '../controllers/exportController';
// import { verifyToken } from '../middleware/auth'; // AUTH DISABLED

const router = Router();

// router.use(verifyToken); // AUTH DISABLED

router.get('/timetable', exportController.exportTimetable);

export default router;
