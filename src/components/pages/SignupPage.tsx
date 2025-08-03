import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Building2, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import authService from '../../services/AuthService';
import '../../styles/auth.css';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);

    // Check password strength
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 0:
      case 1:
        feedback = 'Very weak';
        break;
      case 2:
        feedback = 'Weak';
        break;
      case 3:
        feedback = 'Fair';
        break;
      case 4:
        feedback = 'Good';
        break;
      case 5:
        feedback = 'Strong';
        break;
    }

    setPasswordStrength({ score, feedback });
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Name is required.';
    if (!formData.email.trim()) return 'Email is required.';
    if (!formData.password) return 'Password is required.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address.';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        companyName: formData.companyName.trim() || undefined
      });
      
      if ('error' in result) {
        setError(result.error.message);
      } else {
        // Signup successful
        alert('Account created successfully! Please check your email to verify your account.');
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.score) {
      case 0:
      case 1:
        return '#ff4757';
      case 2:
        return '#ffa726';
      case 3:
        return '#ffeb3b';
      case 4:
        return '#66bb6a';
      case 5:
        return '#4caf50';
      default:
        return '#e0e0e0';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">🚚</div>
            <h1>FleetFix</h1>
          </div>
          <h2>Create Account</h2>
          <p>Join FleetFix to manage your fleet efficiently</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <div className={`input-with-icon ${!formData.name ? 'has-icon' : ''}`}>
              {!formData.name && <User size={18} className="input-icon" />}
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
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
            <label htmlFor="companyName">Company Name (Optional)</label>
            <div className={`input-with-icon ${!formData.companyName ? 'has-icon' : ''}`}>
              {!formData.companyName && <Building2 size={18} className="input-icon" />}
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Enter your company name"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className={`input-with-icon ${!formData.password ? 'has-icon' : 'has-toggle'}`}>
              {!formData.password && <Lock size={18} className="input-icon" />}
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
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
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ 
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  />
                </div>
                <span 
                  className="strength-text"
                  style={{ color: getPasswordStrengthColor() }}
                >
                  {passwordStrength.feedback}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className={`input-with-icon ${!formData.confirmPassword ? 'has-icon' : 'has-toggle'}`}>
              {!formData.confirmPassword && <Lock size={18} className="input-icon" />}
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
              />
              {formData.confirmPassword && (
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div className="password-match">
                <CheckCircle size={16} color="#4caf50" />
                <span>Passwords match</span>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading || !formData.name || !formData.email || !formData.password || !formData.confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="loading-spinner" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
