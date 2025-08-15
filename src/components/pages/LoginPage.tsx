import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import '../../styles/auth.css';

interface FormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Attempting to login...', { email: formData.email });
      
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout - taking too long')), 20000);
      });
      
      const loginPromise = authService.login({ 
        email: formData.email.trim(), 
        password: formData.password 
      });
      
      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      console.log('Login result:', result);
      
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        console.error('Login error:', result.error);
        const errorObj = result.error as any;
        setError(`Login failed: ${errorObj.message || 'Unknown error'}`);
        
        
        console.log('Login attempt details:', {
          email: formData.email,
          passwordLength: formData.password.length,
          errorCode: errorObj.code || 'unknown',
          errorMessage: errorObj.message || 'Unknown error'
        });
      } else {
        console.log('Login successful!', result);
        
        
        setFormData({ email: '', password: '' });
        setError('');
        
        
        startTransition(() => {
          navigate('/dashboard');
        });
      }
    } catch (err: any) {
      console.error('Login error or timeout:', err);
      
      if (err.message?.includes('timeout')) {
        setError('Login is taking longer than expected. Please try again or check your credentials.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
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
            <div className="input-with-icon has-icon">
              <Mail size={18} className="input-icon" />
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
            <div className="input-with-icon has-icon has-toggle">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
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
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading || !formData.email || !formData.password}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner" />
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
            <button 
              type="button"
              className="auth-link"
              onClick={() => startTransition(() => navigate('/signup'))}
              disabled={isLoading}
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
