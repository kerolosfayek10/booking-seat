import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dialog from './Dialog';
import { buildUrl, ENDPOINTS } from '../config/api';
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
  rowType?: string;
  firstName?: string;
  lastName?: string;
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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingBookings, setUpdatingBookings] = useState<Set<string>>(new Set());
  const [deletingBookings, setDeletingBookings] = useState<Set<string>>(new Set());
  const [emailFilter, setEmailFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
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
  }, [currentPage]);

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
      
      // Fetch with pagination - 5 items per page
      const response = await axios.get(buildUrl(ENDPOINTS.BOOKINGS.LIST, { 
        page: currentPage,
        limit: 5 
      }), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle both old array format and new pagination format
      if (response.data.bookings) {
        // New pagination format
        setBookings(response.data.bookings);
        setPagination(response.data.pagination);
      } else {
        // Old array format (fallback)
        setBookings(response.data);
        setPagination(null);
      }
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

  const getFilteredBookings = () => {
    if (!emailFilter.trim() && !phoneFilter.trim()) {
      return bookings;
    }
    
    return bookings.filter(booking => {
      const matchesEmail = !emailFilter.trim() || 
        booking.user.email.toLowerCase().includes(emailFilter.toLowerCase());
      
      const matchesPhone = !phoneFilter.trim() || 
        (booking.user.phone && booking.user.phone.includes(phoneFilter));
      
      return matchesEmail && matchesPhone;
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (pagination?.hasPreviousPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Removed unused functions

  const handleConfirmPayment = async (bookingId: string) => {
    try {
      setUpdatingBookings(prev => new Set(prev).add(bookingId));
      
      const response = await axios.patch<PaymentUpdateResponse>(
        buildUrl(ENDPOINTS.BOOKINGS.UPDATE_PAYMENT(bookingId)),
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
        buildUrl(ENDPOINTS.BOOKINGS.DELETE(bookingId)),
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
        // If we're on a page that no longer exists after deletion, go to the previous page
        if (currentPage > 1 && bookings.length === 1) {
          setCurrentPage(prev => prev - 1);
        } else {
          await fetchBookings();
        }
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


  const highlightText = (text: string, filter: string) => {
    if (!filter.trim() || !text) return text;
    
    const filterText = filter.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(filterText);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <mark style={{ backgroundColor: '#ffeb3b', padding: '1px 2px', borderRadius: '2px' }}>
          {text.substring(index, index + filterText.length)}
        </mark>
        {text.substring(index + filterText.length)}
      </>
    );
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

  const filteredBookings = getFilteredBookings();

  return (
    <div className="booking-management">
      <div className="section-header">
        <h2>📋 Booking Management</h2>
        <p>Manage and confirm customer bookings</p>
        <button onClick={fetchBookings} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      <div className="booking-filters">
        <div className="search-container">
          <div className="search-inputs">
            <div className="search-input-wrapper">
              <span className="search-icon">✉️</span>
              <input
                type="text"
                placeholder="Search by email address..."
                value={emailFilter}
                onChange={(e) => {
                  setEmailFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEmailFilter('');
                }}
                className="search-input"
              />
              {emailFilter && (
                <button
                  onClick={() => setEmailFilter('')}
                  className="clear-filter-button"
                  title="Clear email filter"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="search-input-wrapper">
              <span className="search-icon">📱</span>
              <input
                type="text"
                placeholder="Search by phone number..."
                value={phoneFilter}
                onChange={(e) => {
                  setPhoneFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setPhoneFilter('');
                }}
                className="search-input"
              />
              {phoneFilter && (
                <button
                  onClick={() => setPhoneFilter('')}
                  className="clear-filter-button"
                  title="Clear phone filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {(emailFilter || phoneFilter) && (
            <div className="filter-info">
              <span className="filter-results">
                Showing {filteredBookings.length} of {bookings.length} bookings
              </span>
              <button
                onClick={() => {
                  setEmailFilter('');
                  setPhoneFilter('');
                  setCurrentPage(1);
                }}
                className="clear-all-filters"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h3>{emailFilter || phoneFilter ? 'No matching bookings found' : 'No bookings found'}</h3>
          <p>
            {emailFilter || phoneFilter ? 
              `No bookings found matching your filters${emailFilter ? ` (email: "${emailFilter}")` : ''}${phoneFilter ? ` (phone: "${phoneFilter}")` : ''}` : 
              'No customer bookings have been made yet.'}
          </p>
          {(emailFilter || phoneFilter) && (
            <button 
              onClick={() => {
                setEmailFilter('');
                setPhoneFilter('');
                setCurrentPage(1);
              }} 
              className="clear-filter-link"
            >
              Clear filters and show all bookings
            </button>
          )}
        </div>
      ) : (
        <div className="bookings-grid">
          {filteredBookings.map((booking) => (
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
                  <p><strong>Email:</strong> {highlightText(booking.user.email, emailFilter)}</p>
                  <p><strong>Phone:</strong> {highlightText(booking.user.phone, phoneFilter)}</p>
                </div>

                <div className="seat-info">
                  <h4>🪑 Seat Information</h4>
                  <div className="seats-detail">
                    {booking.seats.map((seat, index) => (
                      <div key={index} className="seat-item">
                        <span className="seat-location">Row {seat.rowName} - Seat {seat.seatNumber}</span>
                        {seat.rowType && (
                          <span className={`seat-type ${seat.rowType.toLowerCase()}`}>
                            {seat.rowType}
                          </span>
                        )}
                        <div className="passenger-info">
                          <span className="passenger-label">Name:</span>
                          <span className="passenger-name">
                            {seat.firstName ? `${seat.firstName} ${seat.lastName || ''}` : 'No name provided'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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

      {/* Pagination Controls - Hide when filtering by email since it's client-side filtering */}
      {pagination && pagination.totalPages > 1 && !emailFilter && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span>
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {' '}
              {pagination.totalItems} bookings
            </span>
          </div>
          
          <div className="pagination-controls">
            <button
              onClick={handlePrevPage}
              disabled={!pagination.hasPreviousPage}
              className="pagination-button"
            >
              ← Previous
            </button>
            
            <div className="page-numbers">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`page-number ${pageNum === pagination.currentPage ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={!pagination.hasNextPage}
              className="pagination-button"
            >
              Next →
            </button>
          </div>
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
