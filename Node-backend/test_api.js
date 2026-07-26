const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const parsedUrl = new URL(url);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---');

  try {
    const timestamp = Date.now();
    const testEmail = `test_${timestamp}@example.com`;
    let userToken = '';
    let adminToken = '';
    let testProductId = 1;
    let cartItemId = 0;
    let orderId = 0;

    // 1. Register a test user
    console.log('\nTest 1: User Registration (POST /auth/register)');
    const regRes = await request('POST', '/auth/register', {
      name: 'Integration Test User',
      email: testEmail,
      password: 'password123'
    });
    console.log(`Status: ${regRes.status}`);
    console.log(`Body:`, regRes.body);
    if (regRes.status !== 201) throw new Error('Registration failed');

    // 2. Login as the newly created user
    console.log('\nTest 2: User Login (POST /auth/login)');
    const loginRes = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'password123'
    });
    console.log(`Status: ${loginRes.status}`);
    console.log(`Body:`, loginRes.body);
    if (loginRes.status !== 200) throw new Error('Login failed');
    userToken = loginRes.body.token;

    // 3. Login as Admin
    console.log('\nTest 3: Admin Login (POST /auth/login)');
    const adminLoginRes = await request('POST', '/auth/login', {
      email: 'admin@mobbuylab.com',
      password: 'admin123'
    });
    console.log(`Status: ${adminLoginRes.status}`);
    console.log(`Body:`, adminLoginRes.body);
    if (adminLoginRes.status !== 200) throw new Error('Admin login failed');
    adminToken = adminLoginRes.body.token;

    // 4. Retrieve Profile of logged-in user
    console.log('\nTest 4: Get Profile (GET /auth/profile)');
    const profileRes = await request('GET', '/auth/profile', null, userToken);
    console.log(`Status: ${profileRes.status}`);
    console.log(`Body:`, profileRes.body);
    if (profileRes.status !== 200) throw new Error('Get profile failed');

    // 5. Get all products
    console.log('\nTest 5: Get Products (GET /products)');
    const productsRes = await request('GET', '/products');
    console.log(`Status: ${productsRes.status}`);
    console.log(`Total Products: ${productsRes.body.total}`);
    if (productsRes.status !== 200 || !productsRes.body.products || productsRes.body.products.length === 0) {
      throw new Error('Get products failed');
    }
    testProductId = productsRes.body.products[0].id;
    console.log(`Using product ID ${testProductId} for subsequent tests.`);

    // 6. Get single product by ID
    console.log(`\nTest 6: Get Product by ID (GET /products/${testProductId})`);
    const singleProductRes = await request('GET', `/products/${testProductId}`);
    console.log(`Status: ${singleProductRes.status}`);
    console.log(`Title: ${singleProductRes.body.title}, Brand: ${singleProductRes.body.brand}`);
    if (singleProductRes.status !== 200) throw new Error('Get product by ID failed');

    // 7. Add item to cart
    console.log('\nTest 7: Add to Cart (POST /cart)');
    const addToCartRes = await request('POST', '/cart', {
      product_id: testProductId,
      quantity: 2
    }, userToken);
    console.log(`Status: ${addToCartRes.status}`);
    console.log(`Body:`, addToCartRes.body);
    if (addToCartRes.status !== 201) throw new Error('Add to cart failed');
    cartItemId = addToCartRes.body.cartId;

    // 8. Get Cart list
    console.log('\nTest 8: Get Cart (GET /cart)');
    const getCartRes = await request('GET', '/cart', null, userToken);
    console.log(`Status: ${getCartRes.status}`);
    console.log(`Cart Items Length: ${getCartRes.body.length}`);
    console.log(`First Cart Item:`, getCartRes.body[0]);
    if (getCartRes.status !== 200 || getCartRes.body.length === 0) throw new Error('Get cart failed');

    // 9. Checkout / Create Order
    console.log('\nTest 9: Create Order (POST /orders)');
    const createOrderRes = await request('POST', '/orders', {
      address: '123 Integration Test St, City, Country'
    }, userToken);
    console.log(`Status: ${createOrderRes.status}`);
    console.log(`Body:`, createOrderRes.body);
    if (createOrderRes.status !== 201) throw new Error('Create order failed');
    orderId = createOrderRes.body.orderId;

    // 10. Record Payment
    console.log('\nTest 10: Create Payment (POST /payment)');
    const paymentRes = await request('POST', '/payment', {
      order_id: orderId,
      payment_method: 'Credit/Debit Card',
      transaction_id: `MBLPAYTEST${timestamp}`
    }, userToken);
    console.log(`Status: ${paymentRes.status}`);
    console.log(`Body:`, paymentRes.body);
    if (paymentRes.status !== 201) throw new Error('Create payment failed');

    // 11. Retrieve Order details
    console.log(`\nTest 11: Get Order Details (GET /orders/${orderId})`);
    const orderDetailsRes = await request('GET', `/orders/${orderId}`, null, userToken);
    console.log(`Status: ${orderDetailsRes.status}`);
    console.log(`Payment Status: ${orderDetailsRes.body.payment_status}, Order Status: ${orderDetailsRes.body.order_status}`);
    console.log(`Items count: ${orderDetailsRes.body.items.length}`);
    if (orderDetailsRes.status !== 200) throw new Error('Get order details failed');

    // 12. Retrieve Admin statistics
    console.log('\nTest 12: Admin Stats (GET /admin/stats)');
    const statsRes = await request('GET', '/admin/stats', null, adminToken);
    console.log(`Status: ${statsRes.status}`);
    console.log(`Stats Body:`, statsRes.body);
    if (statsRes.status !== 200) throw new Error('Get admin stats failed');

    console.log('\n*** ALL TESTS PASSED SUCCESSFULLY! BACKEND STACK IS FULLY FUNCTIONAL ***');

  } catch (error) {
    console.error('\n--- TEST FAILED ---');
    console.error(error);
    process.exit(1);
  }
}

runTests();
