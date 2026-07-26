const db = require('../config/db');

exports.createPayment = async (req, res) => {
  const { order_id, payment_method, transaction_id } = req.body;

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

    // 2. Insert payment record
    const [result] = await connection.query(
      `INSERT INTO payments (order_id, payment_method, transaction_id, payment_status) 
       VALUES (?, ?, ?, 'Paid')`,
      [order_id, payment_method, transaction_id]
    );

    // 3. Update order status: payment_status = 'Paid', order_status = 'Confirmed'
    await connection.query(
      `UPDATE orders SET payment_status = 'Paid', order_status = 'Confirmed' WHERE id = ?`,
      [order_id]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Payment recorded and order confirmed.',
      paymentId: result.insertId,
      order_id,
      transaction_id,
      payment_status: 'Paid',
      order_status: 'Confirmed'
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
