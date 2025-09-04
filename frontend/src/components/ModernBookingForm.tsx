import React, { useState } from 'react'
import axios from 'axios'
import Dialog from './Dialog'
import './ModernBookingForm.css'

interface SeatRow {
  id: string
  name: string
  seats: number[]
  createdAt: string
}

interface SelectedSeat {
  rowId: string
  rowName: string
  seatNumber: number
}

interface ModernBookingFormProps {
  seatRows: SeatRow[]
  onSubmit: (bookingData: any) => Promise<void>
}

const ModernBookingForm: React.FC<ModernBookingFormProps> = ({ seatRows, onSubmit }) => {
  const [step, setStep] = useState<'selection' | 'payment'>('selection')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([])
  const [paymentImage, setPaymentImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<any>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  const showDialog = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setDialogState({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSeatClick = (rowId: string, rowName: string, seatNumber: number) => {
    setSelectedSeats(prev => {
      const existing = prev.find(s => s.rowId === rowId && s.seatNumber === seatNumber)
      if (existing) {
        // If seat is already selected, deselect it
        return prev.filter(s => !(s.rowId === rowId && s.seatNumber === seatNumber))
      } else {
        // If seat is not selected, add it
        return [...prev, { rowId, rowName, seatNumber }]
      }
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        showDialog('warning', 'Invalid File Type', 'Please upload an image file (JPEG, PNG, GIF, or WebP)')
        e.target.value = '' // Clear the input
        return
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB in bytes
      if (file.size > maxSize) {
        showDialog('warning', 'File Too Large', 'Please upload an image smaller than 5MB')
        e.target.value = '' // Clear the input
        return
      }
    }
    
    setPaymentImage(file)
  }

  const getTotalSeats = () => {
    return selectedSeats.length
  }
  
  const getRowSelectedSeats = (rowId: string) => {
    return selectedSeats.filter(s => s.rowId === rowId)
  }
  
  const isSeatSelected = (rowId: string, seatNumber: number) => {
    return selectedSeats.some(s => s.rowId === rowId && s.seatNumber === seatNumber)
  }

  const getTotalPrice = () => {
    return getTotalSeats() * 50
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone: string) => {
    // Allow Egyptian phone numbers and international formats
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  }

  const handleProceedToPayment = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      showDialog('warning', 'Missing Information', 'Please fill in all customer information fields')
      return
    }

    if (!isValidEmail(formData.email.trim())) {
      showDialog('warning', 'Invalid Email', 'Please enter a valid email address')
      return
    }

    if (!isValidPhone(formData.phone.trim())) {
      showDialog('warning', 'Invalid Phone', 'Please enter a valid phone number (minimum 10 digits)')
      return
    }
    
    if (selectedSeats.length === 0) {
      showDialog('warning', 'No Seats Selected', 'Please select at least one seat')
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare booking data for API
      const seats = selectedSeats.map(seat => ({
        seatRowId: seat.rowId,
        seatNumber: seat.seatNumber
      }))

      // Create FormData for multipart request
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('phone', formData.phone)
      formDataToSend.append('seats', JSON.stringify(seats))

      // Send booking request to API
      const response = await axios.post('https://booking-seat-kyna.vercel.app/bookings', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        // Save booking data for payment step
        setBookingId(response.data.data.bookingId)
        setBookingData(response.data.data)
        setStep('payment')
      } else {
        showDialog('error', 'Booking Failed', 'Booking failed. Please try again.')
      }
    } catch (error) {
      console.error('Booking error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        showDialog('error', 'Booking Failed', `Booking failed: ${error.response.data.message}`)
      } else {
        showDialog('error', 'Booking Failed', 'Booking failed. Please check your connection and try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!paymentImage) {
      showDialog('warning', 'Missing Payment Image', 'Please upload payment confirmation image')
      return
    }

    if (!bookingId) {
      showDialog('error', 'Missing Booking ID', 'Booking ID not found. Please try again.')
      return
    }

    setIsSubmitting(true)
    try {
      // Upload receipt to the existing booking
      const formDataToSend = new FormData()
      formDataToSend.append('receipt', paymentImage)

      const response = await axios.patch(`    bookings/${bookingId}/receipt`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        // Show success dialog instead of alert
        setShowSuccessDialog(true)
      } else {
        showDialog('error', 'Upload Failed', 'Failed to upload receipt. Please try again.')
      }
    } catch (error) {
      console.error('Receipt upload error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        showDialog('error', 'Upload Failed', `Upload failed: ${error.response.data.message}`)
      } else {
        showDialog('error', 'Upload Failed', 'Failed to upload receipt. Please check your connection and try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false)
    // Reset form
    setFormData({ name: '', email: '', phone: '' })
    setSelectedSeats([])
    setPaymentImage(null)
    setBookingId(null)
    setBookingData(null)
    setStep('selection')
    // Refresh page to show updated seat availability
    window.location.reload()
  }

  return (
    <>
      {step === 'selection' ? (
        <div className="simple-booking-form">
          <div className="form-header">
            <h1>Select Your Seats</h1>
            <p>Choose your seats from the available options below</p>
          </div>

          <div className="customer-info-section">
            <h2>Your Information</h2>
            <div className="customer-form">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Full Name *"
                required
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address *"
                required
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Phone Number *"
                required
              />
            </div>
          </div>

          <div className="seats-container">
            <div className="instruction-with-chart">
              <p className="instruction">To choose your seat, please check the seating chart</p>
              <a 
                href="https://kfkhnzglgogtrtzzzdcz.supabase.co/storage/v1/object/public/booking/receipts/WhatsApp%20Image%202025-08-29%20at%2023.59.38_4baab518.jpg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="chart-link"
              >
                📋 View Seating Chart
              </a>
            </div>
            
            <div className="seats-grid">
              {seatRows.map(row => (
                <div key={row.id} className="seat-row">
                  <div className="row-header">
                    <div className="row-info">
                      <span className="row-number">Row {row.name}</span>
                      <span className="available">{row.seats.length} available</span>
                    </div>
                    <div className="selected-count">
                      {getRowSelectedSeats(row.id).length} selected
                    </div>
                  </div>
                  
                  <div className="seat-map">
                    {row.seats.map((seatNumber) => {
                      const isSelected = isSeatSelected(row.id, seatNumber)
                      
                      return (
                        <button
                          key={seatNumber}
                          type="button"
                          className={`seat available ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSeatClick(row.id, row.name, seatNumber)}
                          title={`Seat ${seatNumber} ${isSelected ? '(Selected)' : '(Available)'}`}
                        >
                          {seatNumber}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {selectedSeats.length > 0 && (
              <div className="selection-summary">
                <h3>Selected: {getTotalSeats()} seats</h3>
                <div className="selected-list">
                  {selectedSeats.map(seat => (
                    <span key={`${seat.rowId}-${seat.seatNumber}`} className="selected-item">
                      Row {seat.rowName} Seat {seat.seatNumber}
                    </span>
                  ))}
                </div>
                <div className="total-price">Total: {getTotalPrice()} EGP</div>
              </div>
            )}

            {getTotalSeats() > 0 && (
              <button 
                type="button" 
                className="continue-btn"
                onClick={handleProceedToPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Booking...' : `Continue to Payment (${getTotalPrice()} EGP)`}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="payment-form">
          <div className="form-header">
            <h1>Payment & Booking Details</h1>
          </div>

          <div className="receipt">
            <h2>Booking Receipt</h2>
            {bookingData && (
              <div className="booking-info">
                <div className="receipt-row">
                  <span>Booking ID:</span>
                  <span className="booking-id">{bookingId}</span>
                </div>
                <div className="receipt-row">
                  <span>Booking Date:</span>
                  <span>{new Date(bookingData.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            <div className="receipt-content">
              <div className="receipt-row">
                <span>Customer Name:</span>
                <span>{formData.name}</span>
              </div>
              <div className="receipt-row">
                <span>Email:</span>
                <span>{formData.email}</span>
              </div>
              <div className="receipt-row">
                <span>Phone:</span>
                <span>{formData.phone}</span>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span>Selected Seats:</span>
                <span>{getTotalSeats()} seats</span>
              </div>
              {selectedSeats.map(seat => (
                <div key={`${seat.rowId}-${seat.seatNumber}`} className="receipt-detail">
                  Row {seat.rowName} - Seat {seat.seatNumber}
                </div>
              ))}
              <div className="receipt-row">
                <span>Price per seat:</span>
                <span>50 EGP</span>
              </div>
              <div className="receipt-total">
                <span>Total Amount:</span>
                <span>{bookingData ? bookingData.totalPrice : getTotalPrice()} EGP</span>
              </div>
              <div className="receipt-row">
                <span>Payment Status:</span>
                <span className="payment-status unpaid">Unpaid</span>
              </div>
            </div>
          </div>

          <div className="payment-section">
            <div className="instapay-info">
              <h3>Payment Instructions</h3>
              <p>Send payment using Instapay to:</p>
              <div className="phone-number">01206898829</div>
            </div>

            <form onSubmit={handleFinalSubmit} className="booking-details">
              <h3>Upload Payment Receipt</h3>
              
              <div className="upload-section">
                <label htmlFor="payment-image">Upload Payment Receipt *</label>
                <input
                  type="file"
                  id="payment-image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  required
                />
                {paymentImage && (
                  <div className="file-name">Selected: {paymentImage.name}</div>
                )}
              </div>

              <button 
                type="submit" 
                className="final-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Complete Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="dialog-overlay">
          <div className="success-dialog">
            <div className="dialog-header">
              <h2>🎉 Booking Successful!</h2>
              <button 
                type="button" 
                className="close-btn"
                onClick={handleCloseSuccessDialog}
              >
                ✕
              </button>
            </div>
            
            <div className="dialog-content">
              <div className="success-icon">
                <div className="checkmark">✓</div>
              </div>
              
              <div className="success-message">
                <h3>Payment Receipt Uploaded Successfully!</h3>
                
                <div className="booking-details">
                  <div className="detail-row">
                    <strong>Booking ID:</strong> 
                    <span className="booking-id">{bookingId}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Total Amount:</strong> 
                    <span>{bookingData?.totalPrice || getTotalPrice()} EGP</span>
                  </div>
                  <div className="detail-row">
                    <strong>Selected Seats:</strong>
                    <span>{getTotalSeats()} seats</span>
                  </div>
                </div>

                <div className="confirmation-info">
                  <p>✅ Your booking is now pending payment confirmation.</p>
                  <p>📧 <strong>You will receive an email confirmation once your payment is verified.</strong></p>
                </div>
              </div>
            </div>
            
            <div className="dialog-footer">
              <button 
                type="button" 
                className="dialog-close-btn"
                onClick={handleCloseSuccessDialog}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        type={dialogState.type}
        title={dialogState.title}
        message={dialogState.message}
      />
    </>
  )
}

export default ModernBookingForm