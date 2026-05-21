import { Router } from 'express';
import multer from 'multer';
import * as constraintController from '../controllers/constraintController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);
router.use(requireRole('ADMIN'));

router.get('/', constraintController.getAllConstraints);
router.post('/reset', constraintController.resetConstraints);
router.post('/import', upload.single('file'), constraintController.importConstraints);
router.put('/:id', constraintController.updateConstraint);

export default router;
