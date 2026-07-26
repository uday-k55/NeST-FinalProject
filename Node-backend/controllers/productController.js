const db = require('../config/db');

// Helper to map DB product model to the shape expected by the frontend templates
function mapProduct(p) {
  if (!p) return null;
  const imageUrl = p.image && (p.image.startsWith('http://') || p.image.startsWith('https://'))
    ? p.image
    : p.image
      ? `http://localhost:5000/${p.image.replace(/\\/g, '/')}`
      : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500';

  return {
    id: p.id,
    title: p.name,          // Maps name -> title
    name: p.name,
    description: p.description || '',
    price: parseFloat(p.price) || 0,
    discountPercentage: 10,  // Seed defaults to avoid template errors
    rating: 4.5,
    stock: p.stock || 0,
    brand: 'MobBuyLab',
    category: p.category,
    thumbnail: imageUrl,     // Maps image -> thumbnail
    images: [imageUrl],      // Maps image -> images array
    availabilityStatus: p.stock > 0 ? 'In Stock' : 'Out of Stock',
    shippingInformation: 'Ships in 1-2 business days',
    returnPolicy: '30-day return policy',
    warrantyInformation: '1 year warranty',
    minimumOrderQuantity: 1,
    sku: `MBL-PROD-${p.id}`,
    weight: 0.4,
    dimensions: {
      width: 10,
      height: 15,
      depth: 1.2
    },
    tags: [p.category],
    meta: {
      barcode: '123456789012',
      createdAt: p.created_at,
      updatedAt: p.created_at,
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MobBuyLab'
    },
    reviews: [
      {
        reviewerName: 'John Doe',
        rating: 5,
        comment: 'Excellent product, highly recommended!',
        reviewerEmail: 'john@example.com',
        date: p.created_at
      },
      {
        reviewerName: 'Jane Smith',
        rating: 4,
        comment: 'Very good quality for the price.',
        reviewerEmail: 'jane@example.com',
        date: p.created_at
      }
    ],
    created_at: p.created_at
  };
}

exports.getProducts = async (req, res) => {
  try {
    const { category, search, sort, order } = req.query;
    let queryStr = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      queryStr += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      queryStr += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'price') {
      const direction = order && order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      queryStr += ` ORDER BY price ${direction}`;
    } else {
      queryStr += ' ORDER BY id DESC';
    }

    const [rows] = await db.query(queryStr, params);
    const mapped = rows.map(mapProduct);

    res.json({
      products: mapped,
      total: mapped.length,
      skip: 0,
      limit: mapped.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving products.' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(mapProduct(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving product.' });
  }
};

exports.createProduct = async (req, res) => {
  const { name, description, price, category, stock } = req.body;
  
  // Use file path if image is uploaded, or default seeded link if provided
  let imagePath = '';
  if (req.file) {
    imagePath = `uploads/${req.file.filename}`;
  } else if (req.body.image) {
    imagePath = req.body.image;
  }

  try {
    const [result] = await db.query(
      'INSERT INTO products (name, description, price, category, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, price, category, stock, imagePath]
    );

    const [newProd] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({
      message: 'Product created successfully.',
      product: mapProduct(newProd[0])
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating product.' });
  }
};

exports.updateProduct = async (req, res) => {
  const { name, description, price, category, stock } = req.body;
  const productId = req.params.id;

  try {
    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    let imagePath = existing[0].image;
    if (req.file) {
      imagePath = `uploads/${req.file.filename}`;
    } else if (req.body.image) {
      imagePath = req.body.image;
    }

    await db.query(
      'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image = ? WHERE id = ?',
      [
        name || existing[0].name,
        description !== undefined ? description : existing[0].description,
        price || existing[0].price,
        category || existing[0].category,
        stock !== undefined ? stock : existing[0].stock,
        imagePath,
        productId
      ]
    );

    const [updatedProd] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    res.json({
      message: 'Product updated successfully.',
      product: mapProduct(updatedProd[0])
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating product.' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting product.' });
  }
};
