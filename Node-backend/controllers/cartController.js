const db = require('../config/db');

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    // Join with products table to get product info
    const [cartItems] = await db.query(
      `SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image, p.category, p.stock 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [userId]
    );

    // Map each item so the frontend gets cleanly formatted product details
    const mapped = cartItems.map(item => {
      const imageUrl = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'))
        ? item.image
        : item.image
          ? `http://localhost:5000/${item.image.replace(/\\/g, '/')}`
          : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500';

      return {
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        product: {
          id: item.product_id,
          title: item.name,
          name: item.name,
          price: parseFloat(item.price),
          thumbnail: imageUrl,
          images: [imageUrl],
          category: item.category,
          stock: item.stock
        }
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving cart.' });
  }
};

exports.addToCart = async (req, res) => {
  const { product_id, quantity } = req.body;
  const userId = req.user.id;
  const qty = parseInt(quantity) || 1;

  try {
    // Check if product exists and check stock
    const [products] = await db.query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const product = products[0];
    if (product.stock < qty) {
      return res.status(400).json({ message: `Insufficient stock. Only ${product.stock} left.` });
    }

    // Check if item is already in cart
    const [existing] = await db.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, product_id]);
    if (existing.length > 0) {
      const newQty = existing[0].quantity + qty;
      if (product.stock < newQty) {
        return res.status(400).json({ message: `Cannot add more. Stock limit (${product.stock}) reached.` });
      }

      await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
      res.json({ message: 'Cart item quantity updated.', cartId: existing[0].id });
    } else {
      const [result] = await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [
        userId, product_id, qty
      ]);
      res.status(201).json({ message: 'Product added to cart successfully.', cartId: result.insertId });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error adding to cart.' });
  }
};

exports.updateCartQty = async (req, res) => {
  const cartId = req.params.id;
  const { quantity } = req.body;
  const qty = parseInt(quantity);

  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive integer.' });
  }

  try {
    // Get cart item details
    const [items] = await db.query('SELECT * FROM cart WHERE id = ? AND user_id = ?', [cartId, req.user.id]);
    if (items.length === 0) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    // Check product stock
    const [products] = await db.query('SELECT stock FROM products WHERE id = ?', [items[0].product_id]);
    if (products[0].stock < qty) {
      return res.status(400).json({ message: `Cannot update quantity. Only ${products[0].stock} items left in stock.` });
    }

    await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [qty, cartId]);
    res.json({ message: 'Cart updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating cart.' });
  }
};

exports.removeFromCart = async (req, res) => {
  const cartId = req.params.id;

  try {
    const [existing] = await db.query('SELECT * FROM cart WHERE id = ? AND user_id = ?', [cartId, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    await db.query('DELETE FROM cart WHERE id = ?', [cartId]);
    res.json({ message: 'Cart item removed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error removing cart item.' });
  }
};
