// Simple test to check booking endpoint
const fetch = require('node-fetch');

async function testBooking() {
  const API_URL = 'https://booking-seat-m4.vercel.app';
  
  console.log('🧪 Testing booking creation...');
  
  try {
    // First get seat rows to find available seats
    console.log('📋 Getting seat rows...');
    const seatRowsResponse = await fetch(`${API_URL}/seat-rows`);
    
    if (!seatRowsResponse.ok) {
      console.error('❌ Failed to get seat rows:', seatRowsResponse.status, seatRowsResponse.statusText);
      return;
    }
    
    const seatRows = await seatRowsResponse.json();
    console.log('✅ Got seat rows:', seatRows.length, 'rows');
    
    // Find a row with available seats
    const availableRow = seatRows.find(row => row.seats && row.seats.length > 0);
    
    if (!availableRow) {
      console.log('❌ No available seats found');
      return;
    }
    
    console.log(`✅ Found available row: ${availableRow.name} (${availableRow.type}) with ${availableRow.seats.length} seats`);
    
    // Create test booking data
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('name', 'Test User');
    formData.append('email', `test-${Date.now()}@example.com`);
    formData.append('phone', '+201234567890');
    
    const seatData = [{
      seatRowId: availableRow.id,
      seatNumber: availableRow.seats[0],
      rowType: availableRow.type,
      firstName: 'Test',
      lastName: 'User'
    }];
    
    formData.append('seats', JSON.stringify(seatData));
    
    console.log('📤 Sending booking request...');
    console.log('Seat data:', seatData);
    
    // Send booking request
    const bookingResponse = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const responseText = await bookingResponse.text();
    console.log('📥 Response status:', bookingResponse.status);
    console.log('📥 Response text:', responseText);
    
    if (bookingResponse.ok) {
      const responseData = JSON.parse(responseText);
      console.log('✅ Booking created successfully!');
      console.log('📋 Booking details:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('❌ Booking failed with status:', bookingResponse.status);
      try {
        const errorData = JSON.parse(responseText);
        console.error('❌ Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('❌ Raw error response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBooking();
}

module.exports = { testBooking };
