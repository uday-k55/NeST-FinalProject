const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

let pool;

async function initializeDatabase() {
  try {
    // 1. Connect without database to create it
    const connection = await mysql.createConnection(dbConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'mobbuylab'}\`;`);
    await connection.end();

    // 2. Create the connection pool with database selected
    pool = mysql.createPool({
      ...dbConfig,
      database: process.env.DB_NAME || 'mobbuylab',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('MySQL Database Connected.');

    // 3. Create tables
    await createTables();

    // 4. Seed sample data
    await seedDatabase();

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

async function createTables() {
  const connection = await pool.getConnection();
  try {
    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(255) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Cart table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Orders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'Pending',
        order_status VARCHAR(50) DEFAULT 'Pending',
        address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Order Items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        payment_method VARCHAR(255) NOT NULL,
        transaction_id VARCHAR(255) NOT NULL,
        payment_status VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('Database tables verified/created successfully.');
  } finally {
    connection.release();
  }
}

async function seedDatabase() {
  const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (users[0].count === 0) {
    console.log('Seeding users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);
    
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
      'Admin User', 'admin@mobbuylab.com', adminPassword, 'admin'
    ]);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
      'Normal User', 'user@mobbuylab.com', userPassword, 'user'
    ]);
  }

  const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
  if (products[0].count === 0) {
    console.log('Seeding products...');
    const sampleProducts = [
      {
        name: 'iPhone 15 Pro',
        description: 'Experience the power of titanium with the iPhone 15 Pro, featuring an advanced camera system, high-speed A17 Pro chip, and USB-C support.',
        price: 999.00,
        category: 'smartphones',
        stock: 25,
        image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500'
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'Unleash new ways to create, connect, and more with Galaxy AI on the Galaxy S24 Ultra. Equipped with 200MP camera and built-in S Pen.',
        price: 1199.00,
        category: 'smartphones',
        stock: 20,
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500'
      },
      {
        name: 'Google Pixel 8 Pro',
        description: 'The all-pro phone engineered by Google. It has the best of Google AI, the most advanced Pixel Camera yet, and 7 years of OS updates.',
        price: 799.00,
        category: 'smartphones',
        stock: 15,
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500'
      },
      {
        name: 'OnePlus 12',
        description: 'Redefined flagship smartphone featuring Snapdragon 8 Gen 3, 4th Gen Hasselblad Camera for Mobile, and ultra-fast 100W SUPERVOOC charging.',
        price: 699.00,
        category: 'smartphones',
        stock: 30,
        image: 'https://images.unsplash.com/photo-1565630916779-e303be97b6f5?w=500'
      },
      {
        name: 'MacBook Pro 14 (M3)',
        description: 'Apple MacBook Pro with M3 chip, featuring an outstanding 14-inch Liquid Retina XDR display, up to 22 hours of battery life, and peak efficiency.',
        price: 1599.00,
        category: 'laptops',
        stock: 10,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'
      },
      {
        name: 'Dell XPS 15',
        description: 'The Dell XPS 15 balances power and portability, offering stunning Visuals with OLED display and high-performance Intel Core i9 processors.',
        price: 1449.00,
        category: 'laptops',
        stock: 12,
        image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500'
      },
      {
        name: 'Lenovo ThinkPad X1 Carbon Gen 11',
        description: 'The ultimate business laptop. Thin, lightweight, and durable laptop with Intel vPro processing, excellent keyboard, and robust security.',
        price: 1749.00,
        category: 'laptops',
        stock: 8,
        image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500'
      },
      {
        name: 'ASUS ROG Zephyrus G14',
        description: 'Powerful and portable gaming laptop powered by AMD Ryzen 9 and NVIDIA GeForce RTX 4070. Features gorgeous ROG Nebula HDR display.',
        price: 1399.00,
        category: 'laptops',
        stock: 15,
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500'
      }
    ];

    for (const prod of sampleProducts) {
      await pool.query('INSERT INTO products (name, description, price, category, stock, image) VALUES (?, ?, ?, ?, ?, ?)', [
        prod.name, prod.description, prod.price, prod.category, prod.stock, prod.image
      ]);
    }
  }
}

module.exports = {
  initializeDatabase,
  query: (text, params) => pool.query(text, params),
  getPool: () => pool
};
