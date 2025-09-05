import React from 'react'
import './SeatMap.css'

interface SeatRow {
  id: number
  rowNumber: number
  totalSeats: number
  availableSeats: number
}

interface SeatMapProps {
  seatRows: SeatRow[]
  selectedSeats: {rowId: number, count: number}[]
  onSeatSelection: (rowId: number, count: number) => void
}

const SeatMap: React.FC<SeatMapProps> = ({ seatRows, selectedSeats, onSeatSelection }) => {
  const getSelectedCount = (rowId: number) => {
    return selectedSeats.find(s => s.rowId === rowId)?.count || 0
  }

  const handleSeatCountChange = (rowId: number, newCount: number) => {
    const row = seatRows.find(r => r.id === rowId)
    if (!row) return

    const maxAllowed = row.availableSeats // No seat limit per row
    const validCount = Math.max(0, Math.min(newCount, maxAllowed))
    
    onSeatSelection(rowId, validCount)
  }

  const renderSeatButtons = (row: SeatRow) => {
    const selectedCount = getSelectedCount(row.id)
    const maxSelectable = row.availableSeats
    
    return (
      <div className="seat-buttons">
        {[...Array(maxSelectable + 1)].map((_, count) => (
          <button
            key={count}
            className={`seat-btn ${selectedCount === count ? 'active' : ''}`}
            onClick={() => handleSeatCountChange(row.id, count)}
          >
            {count}
          </button>
        ))}
      </div>
    )
  }

  const renderSeatVisual = (row: SeatRow) => {
    const selectedCount = getSelectedCount(row.id)
    const seats = []
    
    for (let i = 0; i < row.totalSeats; i++) {
      const isBooked = i >= row.availableSeats
      const isSelected = i < selectedCount
      
      seats.push(
        <div
          key={i}
          className={`seat ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
        >
          {i + 1}
        </div>
      )
    }
    
    return <div className="seat-visual">{seats}</div>
  }

  return (
    <div className="seat-map">
      <div className="legend">
        <div className="legend-item">
          <div className="seat available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="seat selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="seat booked"></div>
          <span>Booked</span>
        </div>
      </div>

      <div className="rows">
        {seatRows.map(row => (
          <div key={row.id} className="row">
            <div className="row-header">
              <h3>Row {row.rowNumber}</h3>
              <p>{row.availableSeats} of {row.totalSeats} available</p>
            </div>
            
            {renderSeatVisual(row)}
            
            <div className="row-controls">
              <label>Select seats:</label>
              {renderSeatButtons(row)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SeatMap
