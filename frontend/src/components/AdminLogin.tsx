import React, { useState } from 'react';
import axios from 'axios';
import Dialog from './Dialog';
import './AdminLogin.css';

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    user: {
      username: string;
      role: string;
    };
  };
}

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post<LoginResponse>('https://booking-seat-m4.vercel.app/auth/login', {
        username,
        password
      });

      if (response.data.success && response.data.data?.accessToken) {
        // Store token in localStorage
        localStorage.setItem('adminToken', response.data.data.accessToken);
        localStorage.setItem('adminUser', JSON.stringify(response.data.data.user));
        
        // Show success dialog
        showDialog('success', 'Login Successful', 'Welcome to the admin dashboard!');
        
        // Delay navigation to show success message
        setTimeout(() => {
          if (response.data.data?.accessToken) {
            onLoginSuccess(response.data.data.accessToken);
          }
        }, 1500);
      } else {
        showDialog('error', 'Login Failed', 'Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. Please check your connection and try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid username or password';
      }
      
      showDialog('error', 'Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>🔐 Admin Login</h1>
          <p>Please enter your credentials to access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>🛡️ Secure admin access only</p>
        </div>
      </div>

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

export default AdminLogin;
