import React, { useState } from 'react'
import './BookingForm.css'

interface BookingFormProps {
  onSubmit: (customerData: {name: string, email: string}) => Promise<void>
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !email.trim()) {
      alert('Please fill in all fields')
      return
    }

    if (!isValidEmail(email)) {
      alert('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), email: email.trim() })
      setName('')
      setEmail('')
    } catch (error) {
      console.error('Booking submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Full Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={isSubmitting}
        />
      </div>

      <button 
        type="submit" 
        className="btn-primary submit-btn"
        disabled={isSubmitting || !name.trim() || !email.trim()}
      >
        {isSubmitting ? 'Booking...' : 'Complete Booking'}
      </button>
    </form>
  )
}

export default BookingForm
