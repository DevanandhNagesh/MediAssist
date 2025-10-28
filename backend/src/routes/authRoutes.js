import express from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { body } from 'express-validator';
import validateRequest from '../middlewares/validateRequest.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, validateRequest(), register);
router.post('/login', loginValidation, validateRequest(), login);
router.get('/profile', authenticate, getProfile);

export default router;
