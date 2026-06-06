// AUTH SYSTEM DISABLED - To restore, uncomment all code below
/*
import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Rate limiter: 10 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules using express-validator
const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['ADMIN', 'FACULTY', 'STUDENT']).withMessage('Invalid role'),
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginLimiter, loginValidation, authController.login);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', verifyToken, authController.me);

export default router;
*/

import { Router } from 'express';
const router = Router();
export default router;
