import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import authService from '../../services/AuthService';
import '../../styles/auth.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.login(formData);
      
      if ('error' in result) {
        setError(result.error.message);
      } else {
        // Login successful - navigate to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.resetPassword(formData.email);
      
      if ('error' in result) {
        setError(result.error.message);
      } else {
        alert('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      setError('Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">🚚</div>
            <h1>FleetFix</h1>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to manage your fleet</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className={`input-with-icon ${!formData.email ? 'has-icon' : ''}`}>
              {!formData.email && <Mail size={18} className="input-icon" />}
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className={`input-with-icon ${!formData.password ? 'has-icon' : 'has-toggle'}`}>
              {!formData.password && <Lock size={18} className="input-icon" />}
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
              {formData.password && (
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="forgot-password-btn"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading || !formData.email || !formData.password}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="loading-spinner" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Sign up here
            </Link>
          </p>
        </div>

        <div className="demo-credentials">
          <h4>Demo Credentials</h4>
          <p><strong>Email:</strong> demo@fleetfix.com</p>
          <p><strong>Password:</strong> demo123</p>
          <button 
            type="button"
            className="demo-fill-btn"
            onClick={() => {
              setFormData({
                email: 'demo@fleetfix.com',
                password: 'demo123'
              });
            }}
            disabled={isLoading}
          >
            Fill Demo Credentials
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
