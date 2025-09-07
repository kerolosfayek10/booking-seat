// API Configuration
const API_CONFIG = {
  // Base URL for the API
    // BASE_URL: 'http://localhost:3001',
  BASE_URL: 'https://booking-seat-m4.vercel.app',
  
  // Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/auth/login',
      PROFILE: '/auth/profile',
      VALIDATE: '/auth/validate'
    },
    
    // Bookings
    BOOKINGS: {
      LIST: '/bookings',
      CREATE: '/bookings',
      GET_BY_ID: (id: string) => `/bookings/${id}`,
      UPDATE_PAYMENT: (id: string) => `/bookings/${id}/payment`,
      UPDATE_RECEIPT: (id: string) => `/bookings/${id}/receipt`,
      DELETE: (id: string) => `/bookings/${id}`,
      TEST_EMAIL: '/bookings/test-email'
    },
    
    // Seat Rows
    SEAT_ROWS: {
      LIST: '/seat-rows',
      CREATE: '/seat-rows',
      GET_BY_ID: (id: string) => `/seat-rows/${id}`,
      GET_AVAILABLE: (id: string) => `/seat-rows/${id}/available-seats`,
      ADD_SEAT: (id: string) => `/seat-rows/${id}/add-seat`
    },
    
    // Settings
    SETTINGS: {
      BALCONY_VISIBILITY: '/settings/balcony-visibility',
      ALL: '/settings'
    }
  }
}

// Helper function to build full URL
export const buildUrl = (endpoint: string, params?: Record<string, string | number>) => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`
  
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value))
    })
    url += `?${searchParams.toString()}`
  }
  
  return url
}

// Export API configuration
export default API_CONFIG

// Export individual parts for convenience
export const { BASE_URL, ENDPOINTS } = API_CONFIG
