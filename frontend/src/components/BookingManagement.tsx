import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dialog from './Dialog';
import './BookingManagement.css';

interface BookingUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface BookingSeat {
  rowName: string;
  seatNumber: number;
}

interface Booking {
  id: string;
  user: BookingUser;
  seats: BookingSeat[];
  totalSeats: number;
  totalPrice: number;
  isPaid: boolean;
  receiptUrl: string | null;
  createdAt: string;
}

interface PaymentUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    bookingId: string;
    userId: string;
    userName: string;
    isPaid: boolean;
    emailQueued: boolean;
  };
}

interface DeleteBookingResponse {
  success: boolean;
  message: string;
  data?: {
    bookingId: string;
    deletedSeats: number;
    returnedSeats: Array<{
      rowName: string;
      seatNumber: number;
    }>;
  };
}

interface BookingManagementProps {
  token: string;
}

const BookingManagement: React.FC<BookingManagementProps> = ({ token }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingBookings, setUpdatingBookings] = useState<Set<string>>(new Set());
  const [deletingBookings, setDeletingBookings] = useState<Set<string>>(new Set());
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    showCancel: false
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const showDialog = (
    type: 'success' | 'error' | 'warning' | 'info', 
    title: string, 
    message: string, 
    showCancel: boolean = false, 
    onConfirm?: () => void
  ) => {
    setDialogState({
      isOpen: true,
      type,
      title,
      message,
      showCancel,
      onConfirm
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false, onConfirm: undefined }));
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get<Booking[]>('http://localhost:3001/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setBookings(response.data);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please login again.');
      } else {
        setError('Failed to fetch bookings. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (bookingId: string) => {
    try {
      setUpdatingBookings(prev => new Set(prev).add(bookingId));
      
      const response = await axios.patch<PaymentUpdateResponse>(
        `http://localhost:3001/bookings/${bookingId}/payment`,
        { isPaid: true },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update the booking in the local state
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, isPaid: true }
            : booking
        ));
        
        // Show success message
        showDialog('success', 'Payment Confirmed', `Payment confirmed! ${response.data.message}`);
      } else {
        showDialog('error', 'Update Failed', 'Failed to update payment status');
      }
    } catch (err: any) {
      console.error('Error updating payment:', err);
      if (err.response?.status === 401) {
        showDialog('error', 'Unauthorized', 'Unauthorized. Please login again.');
      } else {
        showDialog('error', 'Update Failed', 'Failed to update payment status. Please try again.');
      }
    } finally {
      setUpdatingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setDeletingBookings(prev => new Set(prev).add(bookingId));
      
      const response = await axios.delete<DeleteBookingResponse>(
        `http://localhost:3001/bookings/${bookingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Show success message
        showDialog('success', 'Booking Deleted', response.data.message);
        
        // Refresh the bookings list after successful deletion
        await fetchBookings();
      } else {
        showDialog('error', 'Delete Failed', 'Failed to delete booking');
      }
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      if (err.response?.status === 401) {
        showDialog('error', 'Unauthorized', 'Unauthorized. Please login again.');
      } else {
        showDialog('error', 'Delete Failed', 'Failed to delete booking. Please try again.');
      }
    } finally {
      setDeletingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const confirmDeleteBooking = (bookingId: string, customerName: string) => {
    showDialog(
      'warning',
      'Confirm Deletion',
      `Are you sure you want to delete the booking for ${customerName}? This action cannot be undone and will return the seats to the available pool.`,
      true,
      () => {
        closeDialog();
        handleDeleteBooking(bookingId);
      }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSeats = (seats: BookingSeat[]) => {
    return seats.map(seat => `${seat.rowName}-${seat.seatNumber}`).join(', ');
  };

  if (loading) {
    return (
      <div className="booking-management">
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-management">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchBookings} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-management">
      <div className="section-header">
        <h2>📋 Booking Management</h2>
        <p>Manage and confirm customer bookings</p>
        <button onClick={fetchBookings} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h3>No bookings found</h3>
          <p>No customer bookings have been made yet.</p>
        </div>
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card">
              <div className="booking-header">
                <div className="booking-id">
                  <strong>#{booking.id.slice(-8)}</strong>
                </div>
                <div className={`payment-status ${booking.isPaid ? 'paid' : 'pending'}`}>
                  {booking.isPaid ? '✅ Paid' : '⏳ Pending'}
                </div>
              </div>

              <div className="booking-details">
                <div className="customer-info">
                  <h4>👤 Customer Information</h4>
                  <p><strong>Name:</strong> {booking.user.name}</p>
                  <p><strong>Email:</strong> {booking.user.email}</p>
                  <p><strong>Phone:</strong> {booking.user.phone}</p>
                </div>

                <div className="seat-info">
                  <h4>🪑 Seat Information</h4>
                  <p><strong>Seats:</strong> {formatSeats(booking.seats)}</p>
                  <p><strong>Total Seats:</strong> {booking.totalSeats}</p>
                  <p><strong>Total Price:</strong> {booking.totalPrice} EGP</p>
                </div>

                <div className="booking-meta">
                  <p><strong>Booking Date:</strong> {formatDate(booking.createdAt)}</p>
                  {booking.receiptUrl && (
                    <p>
                      <strong>Receipt:</strong>{' '}
                      <a 
                        href={booking.receiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="receipt-link"
                      >
                        📄 View Receipt
                      </a>
                    </p>
                  )}
                </div>
              </div>

              <div className="booking-actions">
                {!booking.isPaid && (
                  <button
                    onClick={() => handleConfirmPayment(booking.id)}
                    disabled={updatingBookings.has(booking.id) || deletingBookings.has(booking.id)}
                    className="confirm-payment-button"
                  >
                    {updatingBookings.has(booking.id) ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        Confirming...
                      </>
                    ) : (
                      <>
                        ✅ Confirm Payment
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => confirmDeleteBooking(booking.id, booking.user.name)}
                  disabled={updatingBookings.has(booking.id) || deletingBookings.has(booking.id)}
                  className="delete-booking-button"
                >
                  {deletingBookings.has(booking.id) ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      🗑️ Delete Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        type={dialogState.type}
        title={dialogState.title}
        message={dialogState.message}
        showCancel={dialogState.showCancel}
        onConfirm={dialogState.onConfirm}
      />
    </div>
  );
};

export default BookingManagement;
