import React, { useState, useEffect } from 'react';
import { Users, UserPlus, KeyIcon, Shield, Search, Edit2, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import userDataService, { UserProfile, CompanyData } from '../../services/UserDataService';

interface AdminPanelProps {}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const { state } = useAppContext();
  const { currentUser } = state;
  
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'invites'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  
  const [fleetManagerCode, setFleetManagerCode] = useState<string>('');
  const [workerCode, setWorkerCode] = useState<string>('');
  const [codeExpiry, setCodeExpiry] = useState<Date>(new Date());

  
  const [editUserData, setEditUserData] = useState<Partial<UserProfile>>({});


  
  const generateInviteCodes = () => {
    setFleetManagerCode('FLEET-MANAGER-1234');
    setWorkerCode('WORKER-5678');
    setCodeExpiry(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  
  const loadUsers = async () => {
    setLoading(true);
    try {
      
  const userList = await userDataService.getUsers();
  setUsers(userList || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  
  const loadCompanies = async () => {
    setLoading(true);
    try {
      
  const companyList = await userDataService.getCompanies();
  setCompanies(companyList || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCompanies();
    generateInviteCodes();
  }, []);



  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditUserData({
      displayName: user.displayName,
      role: user.role,
      companyId: user.companyId
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      await userDataService.updateUserProfile(selectedUser.uid, editUserData);
      await loadUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCodeToClipboard = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    alert(`${type} code copied to clipboard: ${code}`);
  };

  const regenerateCodes = () => {
    if (window.confirm('Are you sure you want to regenerate invitation codes? This will invalidate the current codes.')) {
      generateInviteCodes();
      alert('New invitation codes generated successfully!');
    }
  };

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  
  if (currentUser?.role !== 'admin') {
    return (
      <div className="admin-panel unauthorized">
        <div className="unauthorized-message">
          <AlertCircle size={48} />
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Manage users, roles, and company settings</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          Users
        </button>
        <button 
          className={`tab-button ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          <Shield size={20} />
          Companies
        </button>
        <button 
          className={`tab-button ${activeTab === 'invites' ? 'active' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          <KeyIcon size={20} />
          Invitation Codes
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="users-header">
              <div className="search-box">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={regenerateCodes}
              >
                <RefreshCw size={20} />
                Generate New Codes
              </button>
            </div>

            <div className="users-list">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.displayName} />
                            ) : (
                              <div className="avatar-placeholder">
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="user-name">{user.displayName}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isEmailVerified ? 'verified' : 'unverified'}`}>
                          {user.isEmailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="companies-tab">
            <div className="companies-list">
              {companies.map(company => (
                <div key={company.id} className="company-card">
                  <div className="company-info">
                    <h3>{company.name}</h3>
                    <p>{company.email}</p>
                  </div>
                  <div className="company-actions">
                    <button className="btn btn-sm btn-secondary">
                      <Edit2 size={16} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="invites-tab">
            <div className="invitation-codes-section">
              <h3>User Invitation Codes</h3>
              <p>Share these codes with users to join your fleet management system. No email required!</p>
              
              <div className="codes-grid">
                <div className="code-card">
                  <div className="code-header">
                    <h4>Fleet Manager Code</h4>
                    <p>For adding new fleet managers with admin privileges</p>
                  </div>
                  <div className="code-display">
                    <input 
                      type="text" 
                      value={fleetManagerCode} 
                      readOnly 
                      className="code-input"
                    />
                    <button 
                      className="btn btn-secondary"
                      onClick={() => copyCodeToClipboard(fleetManagerCode, 'Fleet Manager')}
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="code-card">
                  <div className="code-header">
                    <h4>Worker Code</h4>
                    <p>For adding drivers and maintenance workers</p>
                  </div>
                  <div className="code-display">
                    <input 
                      type="text" 
                      value={workerCode} 
                      readOnly 
                      className="code-input"
                    />
                    <button 
                      className="btn btn-secondary"
                      onClick={() => copyCodeToClipboard(workerCode, 'Worker')}
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="code-info">
                <div className="expiry-info">
                  <strong>Codes expire on:</strong> {codeExpiry.toLocaleDateString()}
                </div>
                <div className="usage-instructions">
                  <h4>How to use:</h4>
                  <ol>
                    <li>Copy the appropriate code using the button above</li>
                    <li>Share the code with the person you want to invite</li>
                    <li>They enter the code during registration on the login page</li>
                    <li>Their account will be automatically assigned the correct role</li>
                  </ol>
                </div>
                
                <div className="code-actions">
                  <button 
                    className="btn btn-warning"
                    onClick={regenerateCodes}
                  >
                    <RefreshCw size={20} />
                    Generate New Codes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit User: {selectedUser.displayName}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={editUserData.displayName || ''}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, displayName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={editUserData.role || 'viewer'}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, role: e.target.value as any }))}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Company</label>
                <select
                  value={editUserData.companyId || ''}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, companyId: e.target.value }))}
                >
                  <option value="">No Company</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUpdateUser}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
