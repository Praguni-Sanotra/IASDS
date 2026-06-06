import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import * as subjectController from '../controllers/subjectController';
// import { verifyToken, requireRole } from '../middleware/auth'; // AUTH DISABLED

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// router.use(verifyToken); // AUTH DISABLED
// router.use(requireRole('ADMIN')); // AUTH DISABLED

router.get('/template', subjectController.downloadTemplate);
router.get('/mapping-template', subjectController.downloadMappingTemplate);
router.get('/export', subjectController.exportSubjects);
router.delete('/bulk', subjectController.bulkDeleteSubjects);
router.post('/bulk-delete-file', upload.single('file'), subjectController.bulkDeleteSubjectsFromFile);
router.post('/bulk-upload', upload.single('file'), subjectController.bulkUploadSubjects);
router.post('/mapping-upload', upload.single('file'), subjectController.bulkUploadMappings);

router.get('/', subjectController.getAllSubjects);
router.get('/:id', subjectController.getSubjectById);
router.post(
  '/',
  [
    body('code').notEmpty().withMessage('Subject code is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('credits').isInt({ min: 1 }).withMessage('Credits must be positive integer'),
    body('hoursPerWeek').isInt({ min: 1 }).withMessage('Hours must be positive integer'),
    body('type').isIn(['THEORY', 'LAB', 'SEMINAR', 'TUTORIAL']).withMessage('Invalid subject type'),
    body('department').notEmpty().withMessage('Department is required'),
    body('semester').isInt({ min: 1, max: 10 }).withMessage('Semester must be between 1 and 10'),
  ],
  subjectController.createSubject
);
router.put('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);

export default router;
