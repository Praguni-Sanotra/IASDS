import { Router } from 'express';
import * as constraintController from '../controllers/constraintController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.use(requireRole('ADMIN'));

router.get('/', constraintController.getAllConstraints);
router.post('/reset', constraintController.resetConstraints);
router.put('/:id', constraintController.updateConstraint);

export default router;
