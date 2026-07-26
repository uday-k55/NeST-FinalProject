const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.get('/stats', authMiddleware, isAdmin, adminController.getStats);
router.get('/users', authMiddleware, isAdmin, adminController.getUsers);

module.exports = router;
