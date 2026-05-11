import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import * as roomController from '../controllers/roomController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken);
router.use(requireRole('ADMIN'));

router.get('/template', roomController.downloadTemplate);
router.delete('/bulk', roomController.bulkDeleteRooms);
router.post('/bulk-upload', upload.single('file'), roomController.bulkUploadRooms);

router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);
router.post(
  '/',
  [
    body('roomNumber').notEmpty().withMessage('Room number is required'),
    body('building').notEmpty().withMessage('Building is required'),
    body('floor').isInt().withMessage('Floor must be a number'),
    body('type').isIn(['LECTURE', 'LAB', 'SEMINAR', 'CONFERENCE']).withMessage('Invalid room type'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  ],
  roomController.createRoom
);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

export default router;
