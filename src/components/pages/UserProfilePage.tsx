import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Download, Trash2, Shield } from 'lucide-react';
import authService from '../../services/AuthService';
import userDataService from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

interface UserProfilePageProps {}

const UserProfilePage: React.FC<UserProfilePageProps> = () => {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const { currentUser } = state;
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  
  
  const [profileData, setProfileData] = useState({
    displayName: (currentUser as any)?.name || (currentUser as any)?.displayName || '',
    email: currentUser?.email || '',
    avatarUrl: (currentUser as any)?.avatarUrl || ''
  });
  
  React.useEffect(() => {
    if (currentUser) {
      setProfileData({
        displayName: (currentUser as any).name || (currentUser as any).displayName || '',
        email: currentUser.email || '',
        avatarUrl: (currentUser as any).avatarUrl || ''
      });
    }
  }, [currentUser]);
  
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await authService.updateProfile(profileData);
      
      if (currentUser) {
        await userDataService.updateUserProfile(currentUser.id, {
          displayName: profileData.displayName,
          email: profileData.email,
          avatarUrl: profileData.avatarUrl
        });
      }
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

  const handleExportData = async (dataType: 'trucks' | 'maintenance' | 'parts' | 'suppliers' | 'all') => {
    if (!currentUser) return;
    
    setLoading(true);
    setMessage(null);

    try {
      if (dataType === 'all') {
        
        const dataTypes = ['trucks', 'maintenance', 'parts', 'suppliers'] as const;
        for (const type of dataTypes) {
          const csvData = await userDataService.exportDataToCSV(currentUser.id, type);
          downloadCSV(csvData, `${type}-export-${new Date().toISOString().split('T')[0]}.csv`);
        }
        
        const userProfile = await userDataService.getUserProfile(currentUser.id);
        if (userProfile) {
          const profileBlob = new Blob([JSON.stringify(userProfile, null, 2)], { type: 'application/json' });
          const profileUrl = URL.createObjectURL(profileBlob);
          const link = document.createElement('a');
          link.href = profileUrl;
          link.download = `user-profile-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setMessage({ type: 'success', text: 'All data exported successfully!' });
      } else {
        const csvData = await userDataService.exportDataToCSV(currentUser.id, dataType);
        downloadCSV(csvData, `${dataType}-export-${new Date().toISOString().split('T')[0]}.csv`);
        setMessage({ type: 'success', text: `${dataType} data exported successfully!` });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export data' });
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    const confirmation = window.prompt(
      'This action cannot be undone. All your data will be permanently deleted.\n\nType "DELETE MY ACCOUNT" to confirm:'
    );

    if (confirmation !== 'DELETE MY ACCOUNT') {
      setMessage({ type: 'error', text: 'Account deletion cancelled - confirmation text did not match.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      
      await handleExportData('all');
      
      
      
      const dataTypes = ['trucks', 'maintenance', 'parts', 'suppliers'] as const;
      
      
      const trucks = await userDataService.getTrucks(currentUser.id);
      const maintenance = await userDataService.getMaintenance(currentUser.id);
      const parts = await userDataService.getParts(currentUser.id);
      const suppliers = await userDataService.getSuppliers(currentUser.id);

      
      for (const truck of trucks) {
        await userDataService.deleteTruck(truck.id);
      }
      for (const m of maintenance) {
        await userDataService.deleteMaintenance(m.id);
      }
      for (const part of parts) {
        await userDataService.deletePart(part.id);
      }
      for (const supplier of suppliers) {
        await userDataService.deleteSupplier(supplier.id);
      }

      
      await authService.deleteAccount();
      
      setMessage({ type: 'success', text: 'Account and all data deleted successfully. You will be redirected to the login page.' });
      
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete account' });
    } finally {
      setLoading(false);
    }
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
            Profile
          </button>
          <button 
            className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Shield size={20} />
            Privacy & Data
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

  

        {activeTab === 'privacy' && (
          <div className="privacy-tab">
            <div className="card">
              <div className="card-header">
                <h3>Data Export & Privacy</h3>
                <p>Manage your data and privacy settings in compliance with GDPR.</p>
              </div>
              <div className="card-body">
                <div className="data-export-section">
                  <h4>Export Your Data</h4>
                  <p>Download your data in CSV format for backup or transfer purposes.</p>
                  
                  <div className="export-buttons">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleExportData('trucks')}
                      disabled={loading}
                    >
                      <Download size={16} />
                      Export Trucks
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleExportData('maintenance')}
                      disabled={loading}
                    >
                      <Download size={16} />
                      Export Maintenance
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleExportData('parts')}
                      disabled={loading}
                    >
                      <Download size={16} />
                      Export Parts
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleExportData('suppliers')}
                      disabled={loading}
                    >
                      <Download size={16} />
                      Export Suppliers
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleExportData('all')}
                      disabled={loading}
                    >
                      <Download size={16} />
                      Export All Data
                    </button>
                  </div>
                </div>

                <div className="danger-zone">
                  <h4>Danger Zone</h4>
                  <p>
                    <strong>Delete Account:</strong> Permanently delete your account and all associated data. 
                    This action cannot be undone.
                  </p>
                  <button 
                    className="btn btn-danger"
                    onClick={handleDeleteAccount}
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
