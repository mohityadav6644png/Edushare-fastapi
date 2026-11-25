const express = require('express');
const { register, login, getMe, logout, updateProfile } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Public routes
router.post('/register', validate(schemas.register), register);
router.post('/login', validate(schemas.login), login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, validate(schemas.updateProfile), updateProfile);
router.post('/logout', protect, logout);

module.exports = router;
