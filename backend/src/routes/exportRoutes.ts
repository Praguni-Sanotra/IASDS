import { Router } from 'express';
import * as exportController from '../controllers/exportController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/timetable', exportController.exportTimetable);

export default router;
