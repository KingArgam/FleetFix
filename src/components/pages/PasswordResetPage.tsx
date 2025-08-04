import React, { useState } from 'react';
import { authService } from '../../services/AuthService';
import '../../styles/auth.css';

interface PasswordResetPageProps {
  onBack?: () => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await authService.sendPasswordReset(email);
      setEmailSent(true);
      setMessage(`Password reset instructions have been sent to ${email}`);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAnotherEmail = () => {
    setEmailSent(false);
    setEmail('');
    setMessage('');
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-section">
            <div className="logo">🚛</div>
            <h1>FleetFix</h1>
          </div>
          <h2>{emailSent ? 'Check Your Email' : 'Reset Password'}</h2>
          <p className="auth-subtitle">
            {emailSent 
              ? 'We\'ve sent you password reset instructions'
              : 'Enter your email address and we\'ll send you instructions to reset your password'
            }
          </p>
        </div>

        <div className="auth-content">
          {!emailSent ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className={error ? 'error' : ''}
                    required
                    disabled={isLoading}
                  />
                  <label htmlFor="email">Email Address</label>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-button primary"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner small"></span>
                    Sending Instructions...
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>
            </form>
          ) : (
            <div className="success-content">
              <div className="success-icon">📧</div>
              <div className="success-message">
                <h3>Instructions Sent!</h3>
                <p>{message}</p>
                <div className="reset-instructions">
                  <h4>What's next?</h4>
                  <ol>
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the password reset link in the email</li>
                    <li>Create your new password</li>
                    <li>Sign in with your new password</li>
                  </ol>
                </div>
              </div>
              
              <div className="reset-actions">
                <button
                  type="button"
                  className="auth-button secondary"
                  onClick={handleTryAnotherEmail}
                >
                  Try Another Email
                </button>
              </div>
            </div>
          )}

          <div className="auth-links">
            <button
              type="button"
              className="link-button"
              onClick={onBack}
            >
              ← Back to Sign In
            </button>
          </div>

          {!emailSent && (
            <div className="auth-help">
              <h4>Having trouble?</h4>
              <ul>
                <li>Make sure you enter the email address associated with your FleetFix account</li>
                <li>Check your spam or junk folder if you don't see the email</li>
                <li>The reset link will expire in 1 hour for security reasons</li>
                <li>If you continue having issues, contact your system administrator</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
