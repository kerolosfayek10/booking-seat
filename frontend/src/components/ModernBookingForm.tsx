import React, { useState } from 'react'
import axios from 'axios'
import Dialog from './Dialog'
import { buildUrl, ENDPOINTS } from '../config/api'
import './ModernBookingForm.css'

interface SeatRow {
  id: string
  name: string
  type: 'Ground' | 'Balcony'
  seats: number[]
  createdAt: string
}

interface SelectedSeat {
  rowId: string
  rowName: string
  seatNumber: number
  rowType?: string
  firstName: string
  lastName: string
}

interface ModernBookingFormProps {
  seatRows: SeatRow[]
}

const ModernBookingForm: React.FC<ModernBookingFormProps> = ({ seatRows }) => {
  const [step, setStep] = useState<'selection' | 'payment'>('selection')
  const [selectedSeatType, setSelectedSeatType] = useState<'Ground' | 'Balcony' | null>(null)
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
  
  // State for passenger details modal
  const [showPassengerModal, setShowPassengerModal] = useState(false)
  const [currentEditingSeat, setCurrentEditingSeat] = useState<SelectedSeat | null>(null)

  // Check if balcony seats are available in the provided seatRows
  const hasBalconySeats = seatRows.some(row => row.type === 'Balcony')

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

  const handleSeatTypeSelection = (type: 'Ground' | 'Balcony') => {
    setSelectedSeatType(type)
    // Clear selected seats when switching types
    setSelectedSeats([])
  }

  const getFilteredSeatRows = () => {
    if (!selectedSeatType) return []
    
    // Simply filter by selected seat type
    // Backend already filters out invisible rows
    return seatRows.filter(row => row.type === selectedSeatType)
  }

  const getSeatLayoutImage = () => {
    if (!selectedSeatType) return null
    
    if (selectedSeatType === 'Ground') {
      return 'https://gkaigrqfrpseoxfqpbff.supabase.co/storage/v1/object/public/booking/receipts/WhatsApp%20Image%202025-09-04%20at%2021.40.20_e2569ef9.jpg'
    } else if (selectedSeatType === 'Balcony') {
      // Balcony image - replace this URL with your balcony seating layout image
      return 'https://gkaigrqfrpseoxfqpbff.supabase.co/storage/v1/object/public/booking/receipts/WhatsApp%20Image%202025-08-29%20at%2023.59.38_4baab518.jpg'
    }
    return null
  }

  const handleViewSeatChart = () => {
    const imageUrl = getSeatLayoutImage()
    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSeatClick = (rowId: string, rowName: string, seatNumber: number) => {
    const existing = selectedSeats.find(s => s.rowId === rowId && s.seatNumber === seatNumber)
    
    if (existing) {
      // If seat is already selected, deselect it
      setSelectedSeats(prev => prev.filter(s => !(s.rowId === rowId && s.seatNumber === seatNumber)))
    } else {
      // Check if user is trying to select more than 5 seats
      if (selectedSeats.length >= 5) {
        showDialog('warning', 'Maximum Seats Reached', 'You cannot select more than 5 seats per booking.')
        return
      }
      
      // If seat is not selected, open the passenger details modal
      const seatRow = seatRows.find(row => row.id === rowId)
      const newSeat = { 
        rowId, 
        rowName, 
        seatNumber, 
        rowType: seatRow?.type,
        firstName: '',
        lastName: ''
      }
      setCurrentEditingSeat(newSeat)
      setShowPassengerModal(true)
    }
  }
  
  // Function to save passenger details and add seat
  const handleSavePassengerDetails = (firstName: string, lastName: string) => {
    if (!firstName.trim() || !lastName.trim()) {
      showDialog('warning', 'Missing Information', 'Please enter both first name and last name.')
      return
    }
    
    console.log('Saving passenger details:', { firstName, lastName });
    
    if (currentEditingSeat) {
      console.log('Current editing seat:', currentEditingSeat);
      
      const newSeat = {
        ...currentEditingSeat,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      };
      
      console.log('New seat with passenger details:', newSeat);
      
      setSelectedSeats(prev => {
        const newSeats = [...prev, newSeat];
        console.log('Updated selected seats:', newSeats);
        return newSeats;
      });
      
      setCurrentEditingSeat(null)
      setShowPassengerModal(false)
    }
  }
  
  // Function to close passenger modal without saving
  const handleCancelPassengerDetails = () => {
    setCurrentEditingSeat(null)
    setShowPassengerModal(false)
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
      const seats = selectedSeats.map(seat => {
        console.log('Preparing seat data:', seat);
        return {
          seatRowId: seat.rowId, // This maps rowId from frontend to seatRowId for backend
          seatNumber: seat.seatNumber,
          rowType: seat.rowType,
          firstName: seat.firstName.trim(),
          lastName: seat.lastName.trim()
        };
      })

      // Create FormData for multipart request
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('phone', formData.phone)
      
      // Log the seats data before stringifying
      console.log('Seats data being sent to API:', seats);
      console.log('Each seat details:');
      seats.forEach((seat, index) => {
        console.log(`Seat ${index + 1}:`, {
          seatRowId: seat.seatRowId,
          seatNumber: seat.seatNumber,
          rowType: seat.rowType,
          firstName: seat.firstName,
          lastName: seat.lastName
        });
      });
      
      const seatsJson = JSON.stringify(seats);
      console.log('Stringified seats JSON:', seatsJson);
      formDataToSend.append('seats', seatsJson)

      // Send booking request to API
      const response = await axios.post(buildUrl(ENDPOINTS.BOOKINGS.CREATE), formDataToSend, {
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
        // Handle specific error responses from backend
        if (response.data.error === 'DUPLICATE_BOOKING') {
          showDialog(
            'warning',
            'Email Already Used',
            `This email address has already been used to make a booking. Each email can only be used once. Please use a different email address or contact support if you need assistance with your existing booking.`
          )
        } else {
          showDialog('error', 'Booking Failed', response.data.message || 'Booking failed. Please try again.')
        }
      }
    } catch (error) {
      console.error('Booking error:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))
      if (axios.isAxiosError(error)) {
        console.error('Error response:', error.response?.data)
        console.error('Error status:', error.response?.status)
        console.error('Error headers:', error.response?.headers)
        
        if (error.response?.data?.message) {
          // Get the error message from the response
          const errorMessage = error.response.data.message || 'Unknown error'
          console.log('Booking error message:', errorMessage)
          
          // Check for specific duplicate booking error
          if (errorMessage.includes('already has a booking') || errorMessage.includes('Only one booking per user') || errorMessage.includes('Only one booking per user is allowed')) {
            showDialog(
              'warning', 
              'Email Already Used', 
              `This email address has already been used to make a booking. Each email can only be used once. Please use a different email address or contact support if you need assistance with your existing booking.`
            )
          } else {
            showDialog('error', 'Booking Failed', `Booking failed: ${errorMessage}`)
          }
        }
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

      const response = await axios.patch(buildUrl(ENDPOINTS.BOOKINGS.UPDATE_RECEIPT(bookingId)), formDataToSend, {
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
    setSelectedSeatType(null)
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
            {!selectedSeatType ? (
              <div className="seat-type-selection">
                <h2>Choose Your Seating Area</h2>
                <p className="instruction">Select your preferred seating area to view available seats and layout</p>
                
                <div className="seat-type-options">
                  <div className="seat-type-card ground">
                    <div className="seat-type-header">
                      <div className="seat-type-icon">🏛️</div>
                      <div className="seat-type-title">
                        <h3>Ground Floor</h3>
                        <p>Lower level seating - Close to stage</p>
                      </div>
                    </div>
                    <div className="seat-type-actions">
                      <button 
                        type="button" 
                        className="select-area-btn"
                        onClick={() => handleSeatTypeSelection('Ground')}
                      >
                        Select Ground Floor
                      </button>
                    </div>
                  </div>
                  
                  {hasBalconySeats && (
                    <div className="seat-type-card balcony">
                      <div className="seat-type-header">
                        <div className="seat-type-icon">🏢</div>
                        <div className="seat-type-title">
                          <h3>Balcony</h3>
                          <p>Upper level seating - Elevated view</p>
                        </div>
                      </div>
                      <div className="seat-type-actions">
                        <button 
                          type="button" 
                          className="select-area-btn"
                          onClick={() => handleSeatTypeSelection('Balcony')}
                        >
                          Select Balcony
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="selected-area-header">
                  <div className="area-info">
                    <h2>{selectedSeatType} Seating</h2>
                    <div className="area-actions">
                      <button 
                        type="button" 
                        className="view-chart-btn"
                        onClick={handleViewSeatChart}
                      >
                        📋 View Seat Chart
                      </button>
                      <button 
                        type="button" 
                        className="change-area-btn"
                        onClick={() => setSelectedSeatType(null)}
                      >
                        Change Area
                      </button>
                    </div>
                  </div>
                  
                  <div className="instruction-with-chart">
                    <p className="instruction">Select your seats below. Click "View Seat Chart" to see the detailed layout.</p>
                  </div>
                </div>
                
                <div className="seats-grid">
                  {getFilteredSeatRows().length === 0 ? (
                    <div className="no-seats-message">
                      <p>No available seats in {selectedSeatType} area</p>
                    </div>
                  ) : (
                    getFilteredSeatRows()
                      .sort((a, b) => a.name.localeCompare(b.name)) // Sort rows alphabetically
                      .map(row => (
                      <div key={row.id} className="seat-row">
                        <div className="row-header">
                          <div className="row-info">
                            <span className="row-number">Row {row.name}</span>
                            <span className="row-type">{row.type}</span>
                            {row.seats.length === 0 ? (
                              <span className="no-available">No available seats</span>
                            ) : (
                              <span className="available">{row.seats.length} available</span>
                            )}
                          </div>
                          <div className="selected-count">
                            {getRowSelectedSeats(row.id).length} selected
                          </div>
                        </div>
                        
                        {row.seats.length === 0 ? (
                          <div className="empty-row-message">
                            <p>No available seats in this row</p>
                          </div>
                        ) : (
                          <div className="seat-map">
                            {row.seats
                              .sort((a, b) => a - b) // Sort seats numerically
                              .map((seatNumber) => {
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
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {selectedSeats.length > 0 && (
              <div className="selection-summary">
                <h3>Selected: {getTotalSeats()} seats</h3>
                <div className="selected-list">
                  {selectedSeats
                    .sort((a, b) => {
                      // Sort by row name first, then by seat number
                      if (a.rowName !== b.rowName) {
                        return a.rowName.localeCompare(b.rowName);
                      }
                      return a.seatNumber - b.seatNumber;
                    })
                    .map(seat => (
                    <span key={`${seat.rowId}-${seat.seatNumber}`} className="selected-item">
                      {seat.rowType} - Row {seat.rowName} Seat {seat.seatNumber}
                      {seat.firstName && seat.lastName && (
                        <span className="passenger-name"> - {seat.firstName} {seat.lastName}</span>
                      )}
                      <button 
                        type="button" 
                        className="edit-passenger-btn"
                        onClick={() => {
                          setCurrentEditingSeat(seat)
                          setShowPassengerModal(true)
                        }}
                        title="Edit passenger details"
                      >
                        ✏️
                      </button>
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
                  {seat.rowType} - Row {seat.rowName} - Seat {seat.seatNumber}
                  {seat.firstName && seat.lastName && (
                    <span className="passenger-name"> - {seat.firstName} {seat.lastName}</span>
                  )}
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
      
      {/* Passenger Details Modal */}
      {showPassengerModal && currentEditingSeat && (
        <div className="dialog-overlay">
          <div className="passenger-details-modal">
            <div className="dialog-header">
              <h2>Passenger Details</h2>
              <button 
                type="button" 
                className="close-btn"
                onClick={handleCancelPassengerDetails}
              >
                ✕
              </button>
            </div>
            
            <div className="dialog-content">
              <p className="seat-info">
                Row {currentEditingSeat.rowName} - Seat {currentEditingSeat.seatNumber} ({currentEditingSeat.rowType})
              </p>
              
              <p className="passenger-info-note">
                <strong>Please enter details for this seat.</strong> This information will be used for seat assignment and will be visible in your booking confirmation.
              </p>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const firstName = (form.elements.namedItem('firstName') as HTMLInputElement).value
                const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value
                console.log('Form submitted with values:', { firstName, lastName })
                handleSavePassengerDetails(firstName, lastName)
              }}>
                <div className="form-group">
                  <label htmlFor="firstName">First Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    id="firstName" 
                    name="firstName" 
                    required 
                    defaultValue={currentEditingSeat.firstName || ''}
                    placeholder="Enter first name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">Last Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    id="lastName" 
                    name="lastName" 
                    required 
                    defaultValue={currentEditingSeat.lastName || ''}
                    placeholder="Enter last name"
                  />
                </div>
                
                <div className="dialog-footer">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={handleCancelPassengerDetails}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ModernBookingForm