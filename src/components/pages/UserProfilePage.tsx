import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import authService from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';

interface UserProfilePageProps {}

const UserProfilePage: React.FC<UserProfilePageProps> = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    avatarUrl: ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Password visibility
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Email verification state
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await authService.updateProfile(profileData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      setLoading(false);
      return;
    }

    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    setLoading(true);
    try {
      await authService.resendEmailVerification();
      setEmailVerificationSent(true);
      setMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send verification email' });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="user-profile-page">
      <div className="page-header">
        <h1>User Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={20} />
          Profile Information
        </button>
        <button 
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={20} />
          Security
        </button>
        <button 
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <div className="card">
              <div className="card-header">
                <h3>Profile Information</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleProfileUpdate}>
                  <div className="form-group">
                    <label htmlFor="displayName">Display Name</label>
                    <div className="input-group">
                      <User className="input-icon" size={20} />
                      <input
                        type="text"
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Enter your display name"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="input-group">
                      <Mail className="input-icon" size={20} />
                      <input
                        type="email"
                        id="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="avatarUrl">Avatar URL</label>
                    <input
                      type="url"
                      id="avatarUrl"
                      value={profileData.avatarUrl}
                      onChange={(e) => setProfileData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                      placeholder="Enter avatar image URL (optional)"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-tab">
            <div className="card">
              <div className="card-header">
                <h3>Email Verification</h3>
              </div>
              <div className="card-body">
                <div className="verification-status">
                  <div className="status-indicator">
                    <CheckCircle className="icon-verified" size={20} />
                    <span>Email verification status</span>
                  </div>
                  <button 
                    onClick={handleSendEmailVerification}
                    className="btn btn-secondary"
                    disabled={loading || emailVerificationSent}
                  >
                    {emailVerificationSent ? 'Verification Sent' : 'Send Verification Email'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Change Password</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <div className="input-group">
                      <Lock className="input-icon" size={20} />
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        id="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter your current password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <div className="input-group">
                      <Lock className="input-icon" size={20} />
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter your new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="input-group">
                      <Lock className="input-icon" size={20} />
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm your new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="preferences-tab">
            <div className="card">
              <div className="card-header">
                <h3>User Preferences</h3>
              </div>
              <div className="card-body">
                <p>Preference settings will be implemented here.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
