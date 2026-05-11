import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import * as facultyController from '../controllers/facultyController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Multer config for file uploads (max 10MB, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Protect all routes
router.use(verifyToken);
router.use(requireRole('ADMIN'));

// Download Template
router.get('/template', facultyController.downloadTemplate);

// Bulk Operations
router.delete('/bulk', facultyController.bulkDeleteFaculty);
router.post('/bulk-upload', upload.single('file'), facultyController.bulkUploadFaculty);

// CRUD Operations
router.get('/', facultyController.getAllFaculty);
router.get('/:id', facultyController.getFacultyById);

router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('maxHoursPerWeek').optional().isInt({ min: 1, max: 60 }).withMessage('Must be between 1 and 60'),
  ],
  facultyController.createFaculty
);

router.put(
  '/:id',
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ],
  facultyController.updateFaculty
);

router.delete('/:id', facultyController.deleteFaculty);

export default router;
