import React, { useState } from 'react';
import '../../styles/auth.css';

interface PasswordResetPageProps {
  onBack?: () => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ onBack }) => {
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'code' | 'password'>('code');

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      
      const codePattern = /^\d{4}-\d{4}-\d{4}$/;
      if (!codePattern.test(recoveryCode)) {
        throw new Error('Invalid recovery code format. Use XXXX-XXXX-XXXX');
      }

      
      const validCodes = ['1234-5678-9012', '0000-0000-0001', '1111-2222-3333'];
      if (!validCodes.includes(recoveryCode)) {
        throw new Error('Invalid recovery code. Please check and try again.');
      }

      setMessage('Recovery code verified! Please set your new password.');
      setStep('password');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage('Password reset successfully! You can now sign in with your new password.');
      
      
      setTimeout(() => {
        onBack?.();
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'password') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Set New Password</h2>
            <p>Create a strong password for your account</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}

            <button
              type="submit"
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>

          <div className="auth-links">
            <button
              type="button"
              className="link-button"
              onClick={onBack}
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Account Recovery</h2>
          <p>Enter your recovery code to reset your password</p>
        </div>

        <form onSubmit={handleCodeSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="recoveryCode">Recovery Code</label>
            <input
              type="text"
              id="recoveryCode"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
              pattern="\d{4}-\d{4}-\d{4}"
              required
            />
            <small className="form-help">
              Enter the 12-digit recovery code in the format XXXX-XXXX-XXXX
            </small>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="auth-links">
          <button
            type="button"
            className="link-button"
            onClick={onBack}
          >
            ← Back to Sign In
          </button>
        </div>

        <div className="auth-help">
          <h4>Demo Recovery Codes</h4>
          <p>For testing purposes, use one of these recovery codes:</p>
          <ul>
            <li><code>1234-5678-9012</code></li>
            <li><code>0000-0000-0001</code></li>
            <li><code>1111-2222-3333</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;
