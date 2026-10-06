const db = require('../config/db');

exports.createPayment = async (req, res) => {
  const { order_id, payment_method, transaction_id, status, simulate_failure, fail } = req.body;

  if (!order_id || !payment_method || !transaction_id) {
    return res.status(400).json({ message: 'Order ID, payment method, and transaction ID are required.' });
  }

  const connection = await db.getPool().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify if the order exists
    const [orders] = await connection.query('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found.' });
    }

    const currentOrder = orders[0];

    // Check if payment method is Wallet (Wallet MUST ALWAYS result in FAILED)
    const isWallet = payment_method && payment_method.toLowerCase().includes('wallet');
    const isFailed = isWallet || status === 'FAILED' || status === 'Failed' || simulate_failure === true || fail === true;

    if (isFailed) {
      // 2. Insert payment record with status 'FAILED'
      await connection.query(
        `INSERT INTO payments (order_id, payment_method, transaction_id, payment_status) 
         VALUES (?, ?, ?, 'FAILED')`,
        [order_id, payment_method, transaction_id]
      );

      // 3. Mark order payment_status as 'FAILED' - DO NOT mark order as Confirmed or Paid
      await connection.query(
        `UPDATE orders SET payment_status = 'FAILED', payment_method = ? WHERE id = ?`,
        [payment_method, order_id]
      );

      await connection.commit();

      return res.status(400).json({
        success: false,
        payment_status: 'FAILED',
        message: 'Payment failed. Please try again or choose another payment method.'
      });
    }

    // Function to delete purchased products from user's wishlist
    const removePurchasedFromWishlist = async () => {
      const [orderItems] = await connection.query(
        'SELECT product_id FROM order_items WHERE order_id = ?',
        [order_id]
      );
      const productIds = orderItems.map(item => item.product_id);
      if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM wishlist WHERE user_id = ? AND product_id IN (${placeholders})`,
          [currentOrder.user_id, ...productIds]
        );
      }
      return productIds;
    };

    // Cash on Delivery Handling
    if (payment_method === 'Cash on Delivery' || payment_method === 'COD') {
      let updatedTotal = parseFloat(currentOrder.total_amount);
      const currentCod = parseFloat(currentOrder.cod_charge || 0);

      // Add ₹8 if not already added
      if (currentCod === 0) {
        updatedTotal = parseFloat((updatedTotal + 8.00).toFixed(2));
        await connection.query(
          `UPDATE orders SET total_amount = ?, cod_charge = 8.00 WHERE id = ?`,
          [updatedTotal, order_id]
        );
      }

      await connection.query(
        `INSERT INTO payments (order_id, payment_method, transaction_id, payment_status) 
         VALUES (?, 'Cash on Delivery', ?, 'Pending')`,
        [order_id, transaction_id]
      );

      await connection.query(
        `UPDATE orders SET payment_status = 'Pending', order_status = 'Confirmed', payment_method = 'Cash on Delivery' WHERE id = ?`,
        [order_id]
      );

      // Remove purchased products from wishlist
      const removedIds = await removePurchasedFromWishlist();

      await connection.commit();

      return res.status(201).json({
        message: 'Order confirmed with Cash on Delivery.',
        paymentId: transaction_id,
        order_id,
        transaction_id,
        payment_status: 'Pending',
        order_status: 'Confirmed',
        total_amount: updatedTotal,
        cod_charge: 8.00,
        removedWishlistProductIds: removedIds
      });
    }

    // Successful electronic payment (UPI, Credit/Debit Card)
    const [result] = await connection.query(
      `INSERT INTO payments (order_id, payment_method, transaction_id, payment_status) 
       VALUES (?, ?, ?, 'Paid')`,
      [order_id, payment_method, transaction_id]
    );

    // Update order status: payment_status = 'Paid', order_status = 'Confirmed'
    await connection.query(
      `UPDATE orders SET payment_status = 'Paid', order_status = 'Confirmed', payment_method = ? WHERE id = ?`,
      [payment_method, order_id]
    );

    // Remove purchased products from wishlist
    const removedIds = await removePurchasedFromWishlist();

    await connection.commit();

    res.status(201).json({
      message: 'Payment recorded and order confirmed.',
      paymentId: result.insertId,
      order_id,
      transaction_id,
      payment_status: 'Paid',
      order_status: 'Confirmed',
      removedWishlistProductIds: removedIds
    });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error processing payment.' });
  } finally {
    connection.release();
  }
};

exports.getPaymentById = async (req, res) => {
  const paymentId = req.params.id;
  try {
    const [payments] = await db.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }
    res.json(payments[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving payment details.' });
  }
};
