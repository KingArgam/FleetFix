import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { User, Mail, Lock, Building, Building2, Users, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    
    if (error) setError(null);
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
      console.log('Attempting to create account...', { email: formData.email, name: formData.name });
      
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - account creation took too long')), 15000);
      });
      
      const signupPromise = authService.signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        companyName: formData.companyName.trim() || undefined
      });
      
      const result = await Promise.race([signupPromise, timeoutPromise]);
      
      console.log('Signup result:', result);
      
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        console.error('Signup error:', result.error);
  setError((typeof result.error === 'object' && result.error && 'message' in result.error && typeof result.error.message === 'string') ? result.error.message : 'Signup failed.');
      } else {
        
        console.log('Account created successfully!', result);
        
        
        setError(null);
        
        
        startTransition(() => {
          navigate('/login');
        });
      }
    } catch (err: any) {
      console.error('Signup error or timeout:', err);
      
      if (err.message?.includes('timeout')) {
        setError('Account creation is taking longer than expected. Please check if your account was created and try logging in.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '' };
    if (password.length < 6) return { strength: 1, label: 'Weak' };
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return { strength: 2, label: 'Medium' };
    }
    return { strength: 3, label: 'Strong' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">🚚</div>
            <h1>FleetFix</h1>
          </div>
          <h2>Create Your Account</h2>
          <p>Join FleetFix to streamline your fleet management</p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-with-icon has-icon">
              <User size={18} className="input-icon" />
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
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon has-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="companyName">Company Name (Optional)</label>
            <div className="input-with-icon has-icon">
              <Building2 size={18} className="input-icon" />
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
            <label htmlFor="password">Password</label>
            <div className="input-with-icon has-icon has-toggle">
              <Lock size={18} className="input-icon" />
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
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className={`strength-fill strength-${passwordStrength.strength}`}
                    style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                  />
                </div>
                <span className={`strength-label strength-${passwordStrength.strength}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-icon has-icon has-toggle">
              <Lock size={18} className="input-icon" />
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
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.confirmPassword && formData.password && (
              <div className="password-match">
                {formData.password === formData.confirmPassword ? (
                  <div className="match-success">
                    <CheckCircle size={16} color="#4caf50" />
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="match-error">
                    <AlertCircle size={16} color="#f44336" />
                    <span>Passwords don't match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
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
            <button 
              type="button"
              className="auth-link"
              onClick={() => startTransition(() => navigate('/login'))}
              disabled={isLoading}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
