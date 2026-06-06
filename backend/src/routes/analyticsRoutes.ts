import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
// import { verifyToken } from '../middleware/auth'; // AUTH DISABLED

const router = Router();

// router.use(verifyToken); // AUTH DISABLED

router.get('/workload', analyticsController.getWorkload);
router.get('/room-utilization', analyticsController.getRoomUtilization);
router.get('/conflicts', analyticsController.getConflictHistory);
router.get('/subject-distribution', analyticsController.getSubjectDistribution);
router.get('/overview', analyticsController.getOverview);

export default router;
