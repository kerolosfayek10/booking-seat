import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BookingManagement from './BookingManagement';
import SeatManagement from './SeatManagement';
import { buildUrl, ENDPOINTS } from '../config/api';
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
  const [balconyVisible, setBalconyVisible] = useState<boolean>(true);
  const [isUpdatingBalcony, setIsUpdatingBalcony] = useState<boolean>(false);

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
    
    // Get balcony visibility setting
    fetchBalconyVisibility();
  }, []);

  const fetchBalconyVisibility = async () => {
    try {
      const response = await axios.get(buildUrl(ENDPOINTS.SETTINGS.BALCONY_VISIBILITY));
      setBalconyVisible(response.data.visible);
    } catch (error) {
      console.error('Error fetching balcony visibility:', error);
    }
  };

  const toggleBalconyVisibility = async () => {
    setIsUpdatingBalcony(true);
    try {
      const newVisibility = !balconyVisible;
      const response = await axios.post(
        buildUrl(ENDPOINTS.SETTINGS.BALCONY_VISIBILITY),
        { visible: newVisibility },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setBalconyVisible(newVisibility);
        console.log('Balcony visibility updated:', newVisibility);
      }
    } catch (error) {
      console.error('Error updating balcony visibility:', error);
      alert('Failed to update balcony visibility. Please try again.');
    } finally {
      setIsUpdatingBalcony(false);
    }
  };

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

      {/* Controls Section */}
      <div className="admin-controls">
        <div className="control-group">
          <label className="control-label">
            🏛️ Balcony Seating:
          </label>
          <button
            className={`toggle-button ${balconyVisible ? 'enabled' : 'disabled'}`}
            onClick={toggleBalconyVisibility}
            disabled={isUpdatingBalcony}
          >
            {isUpdatingBalcony ? '⏳' : (balconyVisible ? '✅ Visible' : '❌ Hidden')}
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
