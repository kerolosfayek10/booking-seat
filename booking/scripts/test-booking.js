#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'https://booking-seat-m4.vercel.app';

async function testBookingCreation() {
  console.log('🧪 Testing booking creation...');
  
  try {
    // First, get available seat rows
    console.log('📋 Fetching available seat rows...');
    const seatRowsResponse = await axios.get(`${API_BASE_URL}/seat-rows`);
    const seatRows = seatRowsResponse.data;
    
    if (!seatRows || seatRows.length === 0) {
      console.log('❌ No seat rows available for testing');
      return;
    }
    
    // Find a seat row with available seats
    const availableRow = seatRows.find(row => row.seats && row.seats.length > 0);
    
    if (!availableRow) {
      console.log('❌ No seat rows with available seats for testing');
      return;
    }
    
    console.log(`✅ Found available row: ${availableRow.name} with ${availableRow.seats.length} seats`);
    
    // Create test booking data
    const testBookingData = {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      phone: '+201234567890',
      seats: JSON.stringify([
        {
          seatRowId: availableRow.id,
          seatNumber: availableRow.seats[0],
          rowType: availableRow.type,
          firstName: 'Test',
          lastName: 'User'
        }
      ])
    };
    
    console.log('📤 Sending booking request...');
    console.log('Booking data:', testBookingData);
    
    // Create FormData
    const FormData = require('form-data');
    const formData = new FormData();
    
    Object.keys(testBookingData).forEach(key => {
      formData.append(key, testBookingData[key]);
    });
    
    const response = await axios.post(`${API_BASE_URL}/bookings`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    console.log('✅ Booking created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Booking test failed:', error.message);
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
      console.error('Error status:', error.response.status);
    }
  }
}

// Run the test
testBookingCreation();
