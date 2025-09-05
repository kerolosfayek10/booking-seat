import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dialog from './Dialog';
import { buildUrl, ENDPOINTS } from '../config/api';
import './SeatManagement.css';

interface SeatRow {
  id: string;
  name: string;
  seats: number[];
  createdAt: string;
}

interface AddSeatResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    name: string;
    seats: number[];
    totalSeats: number;
    addedSeat: number;
  };
}

interface SeatManagementProps {
  token: string;
}

const SeatManagement: React.FC<SeatManagementProps> = ({ token }) => {
  const [seatRows, setSeatRows] = useState<SeatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingSeatToRow, setAddingSeatToRow] = useState<string | null>(null);
  const [seatNumberInputs, setSeatNumberInputs] = useState<Record<string, string>>({});
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
  });

  useEffect(() => {
    fetchSeatRows();
  }, []);

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

  const fetchSeatRows = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get<SeatRow[]>(buildUrl(ENDPOINTS.SEAT_ROWS.LIST), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSeatRows(response.data);
    } catch (err: any) {
      console.error('Error fetching seat rows:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please login again.');
      } else {
        setError('Failed to fetch seat rows. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSeatNumberChange = (rowId: string, value: string) => {
    setSeatNumberInputs(prev => ({
      ...prev,
      [rowId]: value
    }));
  };

  const handleAddSeat = async (rowId: string, rowName: string) => {
    const seatNumberStr = seatNumberInputs[rowId]?.trim();
    
    if (!seatNumberStr) {
      showDialog('warning', 'Missing Input', 'Please enter a seat number');
      return;
    }

    const seatNumber = parseInt(seatNumberStr);
    
    if (isNaN(seatNumber) || seatNumber < 1) {
      showDialog('warning', 'Invalid Input', 'Please enter a valid seat number (must be a positive integer)');
      return;
    }

    // Check if seat already exists
    const currentRow = seatRows.find(row => row.id === rowId);
    if (currentRow && currentRow.seats.includes(seatNumber)) {
      showDialog('warning', 'Duplicate Seat', `Seat ${seatNumber} already exists in row ${rowName}`);
      return;
    }

    try {
      setAddingSeatToRow(rowId);
      
      const response = await axios.patch<AddSeatResponse>(
        buildUrl(ENDPOINTS.SEAT_ROWS.ADD_SEAT(rowId)),
        { seatNumber },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update the seat row in local state
        setSeatRows(prev => prev.map(row => 
          row.id === rowId 
            ? { ...row, seats: response.data.data?.seats || row.seats }
            : row
        ));
        
        // Clear the input
        setSeatNumberInputs(prev => ({
          ...prev,
          [rowId]: ''
        }));
        
        showDialog('success', 'Seat Added Successfully', `Success! ${response.data.message}`);
      } else {
        showDialog('error', 'Failed to Add Seat', 'Failed to add seat');
      }
    } catch (err: any) {
      console.error('Error adding seat:', err);
      if (err.response?.status === 401) {
        showDialog('error', 'Unauthorized', 'Unauthorized. Please login again.');
      } else if (err.response?.status === 400) {
        showDialog('error', 'Request Error', err.response.data?.message || 'Seat already exists or invalid request');
      } else {
        showDialog('error', 'Failed to Add Seat', 'Failed to add seat. Please try again.');
      }
    } finally {
      setAddingSeatToRow(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatSeats = (seats: number[]) => {
    const sortedSeats = [...seats].sort((a, b) => a - b);
    return sortedSeats.join(', ');
  };

  if (loading) {
    return (
      <div className="seat-management">
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p>Loading seat rows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seat-management">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchSeatRows} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="seat-management">
      <div className="section-header">
        <h2>🪑 Seat Management</h2>
        <p>Add new seat numbers to existing seat rows</p>
        <button onClick={fetchSeatRows} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {seatRows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🪑</span>
          <h3>No seat rows found</h3>
          <p>No seat rows have been created yet.</p>
        </div>
      ) : (
        <div className="seat-rows-grid">
          {seatRows.map((row) => (
            <div key={row.id} className="seat-row-card">
              <div className="seat-row-header">
                <div className="row-info">
                  <h3>Row {row.name}</h3>
                  <p className="row-meta">
                    Created: {formatDate(row.createdAt)} • 
                    Total Seats: {row.seats.length}
                  </p>
                </div>
              </div>

              <div className="seat-row-content">
                <div className="current-seats">
                  <h4>📍 Current Seats</h4>
                  <div className="seats-display">
                    {row.seats.length > 0 ? (
                      <p className="seats-list">{formatSeats(row.seats)}</p>
                    ) : (
                      <p className="no-seats">No seats available</p>
                    )}
                  </div>
                </div>

                <div className="add-seat-section">
                  <h4>➕ Add New Seat</h4>
                  <div className="add-seat-form">
                    <input
                      type="number"
                      min="1"
                      value={seatNumberInputs[row.id] || ''}
                      onChange={(e) => handleSeatNumberChange(row.id, e.target.value)}
                      placeholder="Enter seat number"
                      disabled={addingSeatToRow === row.id}
                      className="seat-number-input"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSeat(row.id, row.name);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddSeat(row.id, row.name)}
                      disabled={addingSeatToRow === row.id || !seatNumberInputs[row.id]?.trim()}
                      className="add-seat-button"
                    >
                      {addingSeatToRow === row.id ? (
                        <>
                          <span className="loading-spinner-small"></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          ➕ Add Seat
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
      />
    </div>
  );
};

export default SeatManagement;
