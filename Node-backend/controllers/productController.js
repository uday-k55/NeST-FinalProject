const db = require('../config/db');

function formatImageUrl(img) {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `http://localhost:5000/${img.replace(/\\/g, '/')}`;
}

// Helper to map DB product model to the shape expected by the frontend templates
function mapProduct(p) {
  if (!p) return null;
  const mainImage = formatImageUrl(p.image) || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500';
  const img2 = formatImageUrl(p.image_2);
  const img3 = formatImageUrl(p.image_3);

  const images = [mainImage];
  if (img2) images.push(img2);
  if (img3) images.push(img3);

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
    thumbnail: mainImage,     // Maps image -> thumbnail
    image: mainImage,
    image_2: img2,
    image_3: img3,
    images: images,          // Multi-image array for carousel
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
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Valid product name is required.' });
  }
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return res.status(400).json({ message: 'Price must be a positive number.' });
  }
  const numStock = parseInt(stock, 10);
  if (isNaN(numStock) || numStock < 0) {
    return res.status(400).json({ message: 'Stock must be a non-negative number.' });
  }
  if (!category || !['smartphones', 'laptops'].includes(category)) {
    return res.status(400).json({ message: 'Category must be either smartphones or laptops.' });
  }

  let imagePath = req.body.image || '';
  let image2Path = req.body.image2 || req.body.image_2 || null;
  let image3Path = req.body.image3 || req.body.image_3 || null;

  if (req.files && Array.isArray(req.files)) {
    const f1 = req.files.find(f => f.fieldname === 'image');
    const f2 = req.files.find(f => f.fieldname === 'image2' || f.fieldname === 'image_2');
    const f3 = req.files.find(f => f.fieldname === 'image3' || f.fieldname === 'image_3');
    if (f1) imagePath = `uploads/${f1.filename}`;
    if (f2) image2Path = `uploads/${f2.filename}`;
    if (f3) image3Path = `uploads/${f3.filename}`;
  } else if (req.file) {
    imagePath = `uploads/${req.file.filename}`;
  }

  try {
    const [result] = await db.query(
      'INSERT INTO products (name, description, price, category, stock, image, image_2, image_3) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), description || '', numPrice, category, numStock, imagePath, image2Path, image3Path]
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
    let image2Path = existing[0].image_2;
    let image3Path = existing[0].image_3;

    if (req.files && Array.isArray(req.files)) {
      const f1 = req.files.find(f => f.fieldname === 'image');
      const f2 = req.files.find(f => f.fieldname === 'image2' || f.fieldname === 'image_2');
      const f3 = req.files.find(f => f.fieldname === 'image3' || f.fieldname === 'image_3');
      if (f1) imagePath = `uploads/${f1.filename}`;
      if (f2) image2Path = `uploads/${f2.filename}`;
      if (f3) image3Path = `uploads/${f3.filename}`;
    } else if (req.file) {
      imagePath = `uploads/${req.file.filename}`;
    }

    if (req.body.image && !(req.files && req.files.some(f => f.fieldname === 'image'))) {
      imagePath = req.body.image;
    }
    if ((req.body.image2 || req.body.image_2) && !(req.files && req.files.some(f => f.fieldname === 'image2' || f.fieldname === 'image_2'))) {
      image2Path = req.body.image2 || req.body.image_2;
    }
    if ((req.body.image3 || req.body.image_3) && !(req.files && req.files.some(f => f.fieldname === 'image3' || f.fieldname === 'image_3'))) {
      image3Path = req.body.image3 || req.body.image_3;
    }

    await db.query(
      'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image = ?, image_2 = ?, image_3 = ? WHERE id = ?',
      [
        name || existing[0].name,
        description !== undefined ? description : existing[0].description,
        price !== undefined ? parseFloat(price) : existing[0].price,
        category || existing[0].category,
        stock !== undefined ? parseInt(stock, 10) : existing[0].stock,
        imagePath,
        image2Path,
        image3Path,
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
