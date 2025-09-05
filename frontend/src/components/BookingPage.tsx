import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ModernBookingForm from './ModernBookingForm'
import { buildUrl, ENDPOINTS } from '../config/api'
import './BookingPage.css'

interface SeatRow {
  id: string
  name: string
  type: 'Ground' | 'Balcony'
  seats: number[]
  createdAt: string
}

const BookingPage: React.FC = () => {
  const [seatRows, setSeatRows] = useState<SeatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSeatRows()
  }, [])

  const fetchSeatRows = async () => {
    try {
      setLoading(true)
      // Fetch all seat rows (both Ground and Balcony)
      const response = await axios.get(buildUrl(ENDPOINTS.SEAT_ROWS.LIST))
      setSeatRows(response.data)
    } catch (err) {
      setError('Failed to fetch seat data')
      console.error('Error fetching seat rows:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBookingSubmit = async (bookingData: any) => {
    // Mock submission - just show success message
    console.log('Booking data:', bookingData)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`Booking successful! Customer: ${bookingData.name}, Email: ${bookingData.email}, Phone: ${bookingData.phone}, Total Price: ${bookingData.totalPrice} EGP`)
  }

  if (loading) {
    return <div className="loading">Loading seat information...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="booking-page">
      <div className="container">
        <ModernBookingForm 
          seatRows={seatRows}
          onSubmit={handleBookingSubmit}
        />
      </div>
    </div>
  )
}

export default BookingPage
