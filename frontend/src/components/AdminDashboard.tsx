import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BookingManagement from './BookingManagement';
import SeatManagement from './SeatManagement';
import './AdminDashboard.css';

interface AdminUser {
  username: string;
  role: string;
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'seats'>('bookings');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // Get admin user from localStorage
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing admin user:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    onLogout();
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>🎫 Admin Dashboard</h1>
          {adminUser && (
            <p>Welcome back, <strong>{adminUser.username}</strong></p>
          )}
        </div>
        <div className="admin-header-right">
          <button onClick={handleLogout} className="logout-button">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📋 Booking Management
        </button>
        <button
          className={`tab-button ${activeTab === 'seats' ? 'active' : ''}`}
          onClick={() => setActiveTab('seats')}
        >
          🪑 Seat Management
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {activeTab === 'bookings' && (
          <BookingManagement token={token} />
        )}
        {activeTab === 'seats' && (
          <SeatManagement token={token} />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
