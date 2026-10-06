const db = require('../config/db');

// Map DB product row into product object
function mapWishlistProduct(p) {
  if (!p) return null;
  const imageUrl = p.image && (p.image.startsWith('http://') || p.image.startsWith('https://'))
    ? p.image
    : p.image
      ? `http://localhost:5000/${p.image.replace(/\\/g, '/')}`
      : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500';

  const images = [imageUrl];
  if (p.image_2) {
    const img2 = p.image_2.startsWith('http') ? p.image_2 : `http://localhost:5000/${p.image_2.replace(/\\/g, '/')}`;
    images.push(img2);
  }
  if (p.image_3) {
    const img3 = p.image_3.startsWith('http') ? p.image_3 : `http://localhost:5000/${p.image_3.replace(/\\/g, '/')}`;
    images.push(img3);
  }

  return {
    wishlist_id: p.wishlist_id,
    id: p.id,
    title: p.name,
    name: p.name,
    description: p.description || '',
    price: parseFloat(p.price) || 0,
    category: p.category,
    stock: p.stock || 0,
    thumbnail: imageUrl,
    images: images,
    brand: 'MobBuyLab',
    availabilityStatus: p.stock > 0 ? 'In Stock' : 'Out of Stock'
  };
}

exports.getWishlist = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT w.id as wishlist_id, p.* 
       FROM wishlist w 
       JOIN products p ON w.product_id = p.id 
       WHERE w.user_id = ? 
       ORDER BY w.created_at DESC`,
      [userId]
    );

    const items = rows.map(mapWishlistProduct);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving wishlist.' });
  }
};

exports.getWishlistIds = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      'SELECT product_id FROM wishlist WHERE user_id = ?',
      [userId]
    );
    const ids = rows.map(r => r.product_id);
    res.json(ids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving wishlist IDs.' });
  }
};

exports.addToWishlist = async (req, res) => {
  const userId = req.user.id;
  const productId = parseInt(req.body.product_id, 10);

  if (!productId || isNaN(productId)) {
    return res.status(400).json({ message: 'Valid product ID is required.' });
  }

  try {
    // Check if product exists
    const [prod] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (prod.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if already in wishlist
    const [existing] = await db.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing.length > 0) {
      return res.json({ message: 'Product already in wishlist.', inWishlist: true });
    }

    await db.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );

    res.status(201).json({ message: 'Product added to wishlist.', inWishlist: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error adding to wishlist.' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  const userId = req.user.id;
  const productId = parseInt(req.params.productId, 10);

  if (!productId || isNaN(productId)) {
    return res.status(400).json({ message: 'Valid product ID is required.' });
  }

  try {
    await db.query(
      'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    res.json({ message: 'Product removed from wishlist.', inWishlist: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error removing from wishlist.' });
  }
};

exports.toggleWishlist = async (req, res) => {
  const userId = req.user.id;
  const productId = parseInt(req.body.product_id, 10);

  if (!productId || isNaN(productId)) {
    return res.status(400).json({ message: 'Valid product ID is required.' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.json({ message: 'Removed from wishlist.', inWishlist: false });
    } else {
      await db.query('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [userId, productId]);
      return res.json({ message: 'Added to wishlist.', inWishlist: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error toggling wishlist.' });
  }
};
