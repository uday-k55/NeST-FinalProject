const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    // 1. Get total products
    const [productsCount] = await db.query('SELECT COUNT(*) as count FROM products');
    
    // 2. Get total users
    const [usersCount] = await db.query('SELECT COUNT(*) as count FROM users');

    // 3. Get total orders
    const [ordersCount] = await db.query('SELECT COUNT(*) as count FROM orders');

    // 4. Get total revenue (paid orders)
    const [revenueSum] = await db.query("SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'Paid'");

    // 5. Get latest 5 orders
    const [latestOrders] = await db.query(`
      SELECT o.id, o.total_amount, o.payment_status, o.order_status, o.created_at, u.name as customer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // 6. Get all categories count
    const [categories] = await db.query('SELECT DISTINCT category FROM products');
    const categoriesList = categories.map(c => c.category);

    res.json({
      totalProducts: productsCount[0].count,
      totalUsers: usersCount[0].count,
      totalOrders: ordersCount[0].count,
      totalRevenue: parseFloat(revenueSum[0].total) || 0.00,
      categories: categoriesList,
      latestOrders
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving admin dashboard statistics.' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving users list.' });
  }
};
