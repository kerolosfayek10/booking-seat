// Quick test to see what happens when we call the booking API
const https = require('https');
const querystring = require('querystring');

function createBookingTest() {
  console.log('🧪 Testing booking API...');
  
  // Simulating form data
  const postData = querystring.stringify({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    phone: '+201234567890',
    seats: JSON.stringify([{
      seatRowId: 'test-row-id',
      seatNumber: 1,
      rowType: 'Ground',
      firstName: 'Test',
      lastName: 'User'
    }])
  });

  const options = {
    hostname: 'booking-seat-m4.vercel.app',
    port: 443,
    path: '/bookings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`📥 Status: ${res.statusCode}`);
    console.log(`📥 Headers:`, res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('📥 Response body:', responseData);
      
      try {
        const jsonResponse = JSON.parse(responseData);
        console.log('📋 Parsed response:', JSON.stringify(jsonResponse, null, 2));
      } catch (e) {
        console.log('❌ Response is not valid JSON');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
  });

  // Write data to request body
  req.write(postData);
  req.end();
}

console.log('Starting booking test...');
createBookingTest();
