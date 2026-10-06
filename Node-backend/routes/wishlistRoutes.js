const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, wishlistController.getWishlist);
router.get('/ids', authMiddleware, wishlistController.getWishlistIds);
router.post('/', authMiddleware, wishlistController.addToWishlist);
router.post('/toggle', authMiddleware, wishlistController.toggleWishlist);
router.delete('/:productId', authMiddleware, wishlistController.removeFromWishlist);

module.exports = router;
