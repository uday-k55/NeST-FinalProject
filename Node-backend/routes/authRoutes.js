const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const nameRegex = /^[a-zA-Z\s]{2,50}$/;

const validatePasswordComplexity = (val) => {
  if (!val) throw new Error('Password is required.');
  if (val.length < 8 || val.length > 32) {
    throw new Error('Password must be between 8 and 32 characters long.');
  }
  if (!/[A-Z]/.test(val)) {
    throw new Error('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(val)) {
    throw new Error('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(val)) {
    throw new Error('Password must contain at least one number.');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val)) {
    throw new Error('Password must contain at least one special character.');
  }
  return true;
};

// Validation rules for registration
const registerValidation = [
  check('name')
    .trim()
    .notEmpty().withMessage('Full Name is required.')
    .matches(nameRegex).withMessage('Name must contain only letters and spaces (2-50 characters), no numbers or special symbols.'),
  check('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .matches(emailRegex).withMessage('Please enter a valid email address (e.g. name@example.com).'),
  check('password').custom(validatePasswordComplexity)
];

const loginValidation = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .matches(emailRegex).withMessage('Please enter a valid email address.'),
  check('password')
    .notEmpty().withMessage('Password is required.')
];

const profileValidation = [
  check('name')
    .optional()
    .trim()
    .matches(nameRegex).withMessage('Name must contain only letters and spaces.'),
  check('email')
    .optional()
    .trim()
    .matches(emailRegex).withMessage('Please enter a valid email address.'),
  check('password')
    .optional({ checkFalsy: true })
    .custom(validatePasswordComplexity)
];

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, profileValidation, authController.updateProfile);

module.exports = router;
