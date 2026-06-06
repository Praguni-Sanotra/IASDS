import { Router } from 'express';
import * as constraintController from '../controllers/constraintController';
// import { verifyToken, requireRole } from '../middleware/auth'; // AUTH DISABLED

const router = Router();

// router.use(verifyToken); // AUTH DISABLED
// router.use(requireRole('ADMIN')); // AUTH DISABLED

router.get('/', constraintController.getAllConstraints);
router.post('/reset', constraintController.resetConstraints);
router.put('/:id', constraintController.updateConstraint);

export default router;
