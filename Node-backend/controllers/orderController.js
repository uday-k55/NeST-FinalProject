const db = require('../config/db');

exports.createOrder = async (req, res) => {
  const { address, cod_charge, payment_method } = req.body;
  const userId = req.user.id;

  if (!address || (typeof address === 'string' && !address.trim())) {
    return res.status(400).json({ message: 'Shipping address is required.' });
  }

  const connection = await db.getPool().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch user's cart items
    const [cartItems] = await connection.query(
      `SELECT c.product_id, c.quantity, p.price, p.stock, p.name 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Cart is empty. Cannot checkout.' });
    }

    // 2. Validate stock and calculate total amount
    let subtotal = 0;
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({ message: `Product "${item.name}" has insufficient stock. Only ${item.stock} left.` });
      }
      subtotal += parseFloat(item.price) * item.quantity;
    }

    // Apply 10% discount consistent with frontend
    const discount = parseFloat((subtotal * 0.1).toFixed(2));
    let totalAmount = parseFloat((subtotal - discount).toFixed(2));

    const codAmount = (payment_method === 'Cash on Delivery' || parseFloat(cod_charge || 0) === 8) ? 8.00 : 0.00;
    if (codAmount > 0) {
      totalAmount = parseFloat((totalAmount + codAmount).toFixed(2));
    }

    // 3. Create order entry
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, total_amount, payment_status, order_status, address, cod_charge, payment_method) 
       VALUES (?, ?, 'Pending', 'Pending', ?, ?, ?)`,
      [userId, totalAmount, address, codAmount, payment_method || null]
    );
    const orderId = orderResult.insertId;

    // 4. Create order items and decrement product stocks
    for (const item of cartItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) 
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    // 5. Clear cart
    await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    await connection.commit();

    res.status(201).json({
      message: 'Order created successfully.',
      orderId,
      subtotal,
      discount,
      cod_charge: codAmount,
      totalAmount
    });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error processing checkout.' });
  } finally {
    connection.release();
  }
};

exports.getOrders = async (req, res) => {
  try {
    let queryStr = '';
    const params = [];

    if (req.user.role === 'admin') {
      // Admin sees all orders with customer names
      queryStr = `
        SELECT o.id, o.user_id, o.total_amount, o.cod_charge, o.payment_method, o.payment_status, o.order_status, o.address, o.created_at, u.name as customer_name, u.email as customer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `;
    } else {
      // Regular user sees only their orders
      queryStr = `
        SELECT id, user_id, total_amount, cod_charge, payment_method, payment_status, order_status, address, created_at
        FROM orders o
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;
      params.push(req.user.id);
    }

    const [orders] = await db.query(queryStr, params);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving orders.' });
  }
};

exports.getOrderById = async (req, res) => {
  const orderId = req.params.id;
  try {
    let orderQuery = '';
    const params = [orderId];

    if (req.user.role === 'admin') {
      orderQuery = `
        SELECT o.id, o.user_id, o.total_amount, o.cod_charge, o.payment_method, o.payment_status, o.order_status, o.address, o.created_at, u.name as customer_name, u.email as customer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `;
    } else {
      orderQuery = `
        SELECT id, user_id, total_amount, cod_charge, payment_method, payment_status, order_status, address, created_at
        FROM orders
        WHERE id = ? AND user_id = ?
      `;
      params.push(req.user.id);
    }

    const [orders] = await db.query(orderQuery, params);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Fetch order items
    const [items] = await db.query(
      `SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name as product_name, p.image as product_image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const formattedItems = items.map(item => {
      const imageUrl = item.product_image && (item.product_image.startsWith('http://') || item.product_image.startsWith('https://'))
        ? item.product_image
        : item.product_image
          ? `http://localhost:5000/${item.product_image.replace(/\\/g, '/')}`
          : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500';

      return {
        id: item.id,
        productId: item.product_id,
        name: item.product_name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        image: imageUrl
      };
    });

    res.json({
      ...orders[0],
      items: formattedItems
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving order details.' });
  }
};

// Admin endpoint to update order status
exports.updateOrderStatus = async (req, res) => {
  const orderId = req.params.id;
  const { order_status } = req.body;

  if (!order_status) {
    return res.status(400).json({ message: 'Order status is required.' });
  }

  try {
    const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    await db.query('UPDATE orders SET order_status = ? WHERE id = ?', [order_status, orderId]);
    res.json({ message: 'Order status updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating order status.' });
  }
};
