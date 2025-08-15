import React, { useState, useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService, type Notification } from '../../services/NotificationService';
import authService from '../../services/AuthService';
import { useAppContext } from '../../contexts/AppContext';
import { Truck, MaintenanceEntry, Part } from '../../types';

interface HeaderProps {
  
}

interface SearchResult {
  id: string;
  type: 'truck' | 'maintenance' | 'part';
  title: string;
  subtitle?: string;
  details?: string;
}

const Header: React.FC<HeaderProps> = () => {
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('fleet');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  
  const { state } = useAppContext();
  const navigate = useNavigate();

  
  const [fleetSettings, setFleetSettings] = useState({
    companyName: 'FleetFix Transportation',
    timezone: 'America/New_York',
    currency: 'USD',
    maintenanceReminderDays: 30,
    lowFuelThreshold: 20,
    maxIdleTime: 30,
  });

  const [maintenanceSettings, setMaintenanceSettings] = useState({
    defaultReminderDays: 7,
    autoCreateWorkOrders: true,
    requirePhotos: false,
    allowSelfMaintenance: true,
    costCenterRequired: false,
  });

  const [userSettings, setUserSettings] = useState({
    name: 'John Doe',
    email: 'john.doe@fleetfix.com',
    phone: '+1 (555) 123-4567',
    role: 'Fleet Manager',
    notifications: {
      push: true,
    },
  });

  const [dataRetentionSettings, setDataRetentionSettings] = useState({
    retentionPeriod: '24', 
  });

  
  useEffect(() => {
    const loadSavedSettings = () => {
      try {
        const savedFleetSettings = localStorage.getItem('fleetSettings');
        const savedMaintenanceSettings = localStorage.getItem('maintenanceSettings');
        const savedUserSettings = localStorage.getItem('userSettings');
        
        if (savedFleetSettings) {
          setFleetSettings(JSON.parse(savedFleetSettings));
        }
        if (savedMaintenanceSettings) {
          setMaintenanceSettings(JSON.parse(savedMaintenanceSettings));
        }
        if (savedUserSettings) {
          setUserSettings(JSON.parse(savedUserSettings));
        }
        
        const savedDataRetentionSettings = localStorage.getItem('dataRetentionSettings');
        if (savedDataRetentionSettings) {
          setDataRetentionSettings(JSON.parse(savedDataRetentionSettings));
        }
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    };

    loadSavedSettings();
  }, []);

  
  useEffect(() => {
    const updateNotifications = (updatedNotifications: Notification[]) => {
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    };

   
    updateNotifications(notificationService.getNotifications());

    
    const unsubscribe = notificationService.subscribe(updateNotifications);

    return unsubscribe;
  }, []);

  
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      if (user) {
        
        setUserSettings(prev => ({
          ...prev,
          name: user.name,
          email: user.email,
          role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        }));
      }
    });

    return unsubscribe;
  }, []);


  
  const handleFleetSettingChange = (field: string, value: any) => {
    setFleetSettings(prev => ({ ...prev, [field]: value }));
  };
  const handleMaintenanceSettingChange = (field: string, value: any) => {
    setMaintenanceSettings(prev => ({ ...prev, [field]: value }));
  };
  const handleUserSettingChange = (field: string, value: any) => {
    setUserSettings(prev => ({ ...prev, [field]: value }));
  };
  
  
  const handleSettingsClick = () => setShowSettings(true);
  const handleNotificationsClick = () => setShowNotifications(true);
  const handleUserMenuClick = () => setShowUserMenu(true);

  
  const handleExportData = (type: string) => {
    
    alert(`Exporting data as ${type}`);
  };
  const handleResetSettings = () => {
    
    alert('Settings reset to default.');
  };
  const handleSignOut = () => {
    authService.logout();
    navigate('/login');
  };
  const handleLogout = handleSignOut;

  const handleNotificationChange = (type: string, value: boolean) => {
    setUserSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [type]: value }
    }));
    
    
    notificationService.updatePreferences({
      [type]: value
    });
  };

  
  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
  };

  const handleNotificationClick = (notification: any) => {
    
    if (!notification.read) {
      notificationService.markAsRead(notification.id);
    }
    
    
    switch (notification.type) {
      case 'maintenance':
      case 'maintenance_due':
      case 'maintenance_overdue':
        navigate('/maintenance');
        break;
      case 'part':
      case 'low_stock':
      case 'out_of_stock':
        navigate('/parts');
        break;
      case 'fuel':
      case 'vehicle_alert':
      case 'downtime':
        navigate('/trucks');
        break;
      case 'inspection_due':
        navigate('/calendar');
        break;
      case 'supplier_update':
        navigate('/suppliers');
        break;
      case 'system_alert':
      case 'user_invitation':
        if (state.currentUser?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
        break;
      default:
        navigate('/dashboard');
    }
    
    
    setShowNotifications(false);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleDeleteNotification = (notificationId: string) => {
    notificationService.deleteNotification(notificationId);
  };

  const handleClearAllNotifications = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      notificationService.clearAllNotifications();
    }
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return '🔧';
      case 'fuel':
        return '⛽';
      case 'part':
        return '📦';
      case 'alert':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#65a30d';
      default:
        return '#6b7280';
    }
  };

  const handleSaveSettings = async () => {
    try {
      
      localStorage.setItem('fleetSettings', JSON.stringify(fleetSettings));
      localStorage.setItem('maintenanceSettings', JSON.stringify(maintenanceSettings));
      localStorage.setItem('userSettings', JSON.stringify(userSettings));
      localStorage.setItem('dataRetentionSettings', JSON.stringify(dataRetentionSettings));
      
      
      console.log('Saving settings:', { fleetSettings, maintenanceSettings, userSettings, dataRetentionSettings });
      
      
      alert('Settings saved successfully! Your preferences have been updated.');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
  };



  const handleCancel = () => {
    
    const savedFleetSettings = localStorage.getItem('fleetSettings');
    const savedMaintenanceSettings = localStorage.getItem('maintenanceSettings');
    const savedUserSettings = localStorage.getItem('userSettings');
    const savedDataRetentionSettings = localStorage.getItem('dataRetentionSettings');
    
    if (savedFleetSettings) setFleetSettings(JSON.parse(savedFleetSettings));
    if (savedMaintenanceSettings) setMaintenanceSettings(JSON.parse(savedMaintenanceSettings));
    if (savedUserSettings) setUserSettings(JSON.parse(savedUserSettings));
    if (savedDataRetentionSettings) setDataRetentionSettings(JSON.parse(savedDataRetentionSettings));
    
    alert('Changes canceled. Settings restored to last saved values.');
  };

  const renderIcon = (iconName: string) => {
    const iconProps = { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor" };
    
    switch (iconName) {
      case 'fleet':
        return (
          <svg {...iconProps}>
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
          </svg>
        );
      case 'maintenance':
        return (
          <svg {...iconProps}>
            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
          </svg>
        );
      case 'user':
        return (
          <svg {...iconProps}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        );
      case 'data':
        return (
          <svg {...iconProps}>
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      
  state.trucks.forEach((truck: Truck) => {
        if (truck.make.toLowerCase().includes(query) ||
            truck.model.toLowerCase().includes(query) ||
            truck.licensePlate.toLowerCase().includes(query) ||
            truck.nickname?.toLowerCase().includes(query) ||
            truck.vin.toLowerCase().includes(query)) {
          results.push({
            id: truck.id,
            type: 'truck',
            title: `${truck.make} ${truck.model}`,
            subtitle: `${truck.licensePlate} • ${truck.nickname || 'No nickname'}`,
            details: `Status: ${truck.status}`
          });
        }
      });

      
  state.maintenance.forEach((maintenance: MaintenanceEntry) => {
        if (maintenance.type.toLowerCase().includes(query) ||
            maintenance.notes?.toLowerCase().includes(query)) {
          const truck = state.trucks.find((t: Truck) => t.id === maintenance.truckId);
          results.push({
            id: maintenance.id,
            type: 'maintenance',
            title: `${maintenance.type} Maintenance`,
            subtitle: truck ? `${truck.make} ${truck.model} (${truck.licensePlate})` : 'Unknown Truck',
            details: `Cost: $${maintenance.cost}`
          });
        }
      });

      
  state.parts.forEach((part: Part) => {
        if (part.name.toLowerCase().includes(query) ||
            part.partNumber.toLowerCase().includes(query) ||
            part.category.toLowerCase().includes(query)) {
          results.push({
            id: part.id,
            type: 'part',
            title: part.name,
            subtitle: `${part.partNumber} • ${part.category}`,
            details: `Cost: $${part.cost}`
          });
        }
      });

      setSearchResults(results.slice(0, 10)); 
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, state.trucks, state.maintenance, state.parts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === 'truck') {
      
      navigate(`/trucks`);
    } else if (result.type === 'maintenance') {
      navigate('/maintenance');
    } else if (result.type === 'part') {
      navigate('/parts');
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSearchResultClick(searchResults[0]);
    }
  };

  return (
    <header className="header">
      <div className="header-left">        
        <div className="logo">
          <span className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </span>
          <span className="logo-text">FleetFix</span>
        </div>
      </div>
      
      <div className="header-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
        <div className="search-container" style={{ width: '340px', marginLeft: 0, marginRight: 0 }}>
          <form onSubmit={handleSearchSubmit} className="search-bar" style={{ width: '340px', margin: 0, padding: 0 }}>
            <span className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search trucks, maintenance, parts..."
              className="search-input"
              style={{ fontSize: '1.1rem', width: '100%', paddingLeft: 36, margin: 0, boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis' }}
              autoComplete="off"
            />
          </form>
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results" style={{ left: 0, width: '100%', maxWidth: 540 }}>
              {searchResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className="search-result-item"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div className="search-result-icon">
                    {result.type === 'truck' && '🚛'}
                    {result.type === 'maintenance' && '🔧'}
                    {result.type === 'part' && '⚙️'}
                  </div>
                  <div className="search-result-content">
                    <div className="search-result-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{result.title}</div>
                    <div className="search-result-subtitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{result.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="header-right">
        <button className="header-btn" aria-label="Notifications" onClick={handleNotificationsClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          <span className="notification-badge">{unreadCount > 0 ? unreadCount : ''}</span>
        </button>
        
        <button className="header-btn" aria-label="Settings" onClick={handleSettingsClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        </button>
        
        <button className="user-profile" onClick={handleUserMenuClick} aria-label="User menu">
          <div className="user-avatar">
            {userSettings.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <span className="user-name">{userSettings.name}</span>
          <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      {}
      {showNotifications && (
        <div className="notifications-dropdown">
          <div className="dropdown-header">
            <h3>Notifications ({unreadCount} unread)</h3>
            <div className="notification-actions">
               {notifications.length > 0 && (
                   <>
                     <button onClick={handleMarkAllAsRead} className="action-btn" title="Mark all as read">
                       ✓
                     </button>
                     <button onClick={handleClearAllNotifications} className="action-btn" title="Clear all">
                       🗑️
                     </button>
                   </>
                 )}
              <button onClick={() => setShowNotifications(false)} className="close-btn">×</button>
            </div>
          </div>
          <div className="dropdown-content">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications</p>
                {}
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{ 
                    borderLeft: `4px solid ${getPriorityColor(notification.priority)}`,
                    cursor: 'pointer'
                  }}
                >
                  <div className="notification-header">
                    <span className="notification-type">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <span className="notification-title">{notification.title}</span>
                    <div className="notification-item-actions">
                      {!notification.read && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="mark-read-btn"
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="delete-btn"
                        title="Delete notification"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="notification-text">
                    {notification.message}
                  </div>
                  <div className="notification-footer">
                    <div className="notification-time">
                      {notificationService.formatTimeAgo(notification.timestamp)}
                    </div>
                    {notification.actionRequired && (
                      <span className="action-required">Action Required</span>
                    )}
                    <span className={`priority priority-${notification.priority}`}>
                      {notification.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
            
            {notifications.length > 10 && (
              <div className="more-notifications">
                <p>{notifications.length - 10} more notifications...</p>
              </div>
            )}
            
            {}
          </div>
        </div>
      )}

      {}
      {showUserMenu && (
        <div className="user-menu-dropdown">
          <div className="dropdown-header">
            <div className="user-info">
              <div className="user-avatar large">
                {userSettings.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="user-details">
                <h4>{userSettings.name}</h4>
                <p>{userSettings.email}</p>
              </div>
            </div>
            <button onClick={() => setShowUserMenu(false)} className="close-btn">×</button>
          </div>
          <div className="dropdown-content">
            <div className="menu-section">
              <button 
                className="menu-item" 
                onClick={() => {
                  setShowUserMenu(false);
                  startTransition(() => navigate('/profile'));
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                My Profile
              </button>
            </div>
            
            {state.currentUser?.role === 'admin' && (
              <div className="menu-section">
                <div className="section-title">Administration</div>
                <button 
                  className="menu-item" 
                  onClick={() => {
                    setShowUserMenu(false);
                    startTransition(() => navigate('/admin'));
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                  Admin Panel
                </button>
                <button 
                  className="menu-item" 
                  onClick={() => {
                    setShowUserMenu(false);
                    startTransition(() => navigate('/bulk-manager'));
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  Bulk Vehicle Manager
                </button>
                <button 
                  className="menu-item" 
                  onClick={() => {
                    setShowUserMenu(false);
                    startTransition(() => navigate('/suppliers'));
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A3,3 0 0,1 15,5V7H19A1,1 0 0,1 20,8V20A1,1 0 0,1 19,21H5A1,1 0 0,1 4,20V8A1,1 0 0,1 5,7H9V5A3,3 0 0,1 12,2M12,4A1,1 0 0,0 11,5V7H13V5A1,1 0 0,0 12,4Z"/>
                  </svg>
                  Supplier Management
                </button>
                <button 
                  className="menu-item" 
                  onClick={() => {
                    setShowUserMenu(false);
                    startTransition(() => navigate('/analytics-dashboard'));
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22,21H2V3H4V19H6V17H10V19H12V16H16V19H18V17H22V21Z"/>
                  </svg>
                  Analytics Dashboard
                </button>
              </div>
            )}
            
            <div className="menu-section">
              <button className="menu-item logout-btn" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Settings</h2>
              <button onClick={() => setShowSettings(false)} className="close-btn">×</button>
            </div>
            
            <div className="settings-modal-layout">
              <div className="settings-modal-tabs">
                {[
                  { id: 'fleet', label: 'Fleet Preferences', icon: 'fleet' },
                  { id: 'maintenance', label: 'Maintenance', icon: 'maintenance' },
                  { id: 'user', label: 'User Profile', icon: 'user' },
                  { id: 'data', label: 'Data & Export', icon: 'data' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`settings-tab-button ${activeSettingsTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveSettingsTab(tab.id)}
                  >
                    {renderIcon(tab.icon)}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="settings-modal-content">
                {activeSettingsTab === 'fleet' && (
                  <div className="settings-section">
                    <h3>Fleet Preferences</h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="companyName">Company Name</label>
                        <input
                          type="text"
                          id="companyName"
                          className="form-control"
                          value={fleetSettings.companyName}
                          onChange={(e) => handleFleetSettingChange('companyName', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="timezone">Timezone</label>
                        <select
                          id="timezone"
                          className="form-control"
                          value={fleetSettings.timezone}
                          onChange={(e) => handleFleetSettingChange('timezone', e.target.value)}
                        >
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="currency">Currency</label>
                        <select
                          id="currency"
                          className="form-control"
                          value={fleetSettings.currency}
                          onChange={(e) => handleFleetSettingChange('currency', e.target.value)}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="maintenanceReminderDays">Default Maintenance Reminder (days)</label>
                        <input
                          type="number"
                          id="maintenanceReminderDays"
                          className="form-control"
                          value={fleetSettings.maintenanceReminderDays}
                          onChange={(e) => handleFleetSettingChange('maintenanceReminderDays', parseInt(e.target.value))}
                          min="1"
                          max="365"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="lowFuelThreshold">Low Fuel Threshold (%)</label>
                        <input
                          type="number"
                          id="lowFuelThreshold"
                          className="form-control"
                          value={fleetSettings.lowFuelThreshold}
                          onChange={(e) => handleFleetSettingChange('lowFuelThreshold', parseInt(e.target.value))}
                          min="5"
                          max="50"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="maxIdleTime">Max Idle Time Warning (minutes)</label>
                        <input
                          type="number"
                          id="maxIdleTime"
                          className="form-control"
                          value={fleetSettings.maxIdleTime}
                          onChange={(e) => handleFleetSettingChange('maxIdleTime', parseInt(e.target.value))}
                          min="5"
                          max="120"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'maintenance' && (
                  <div className="settings-section">
                    <h3>Maintenance Settings</h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="defaultReminderDays">Default Reminder Days</label>
                        <input
                          type="number"
                          id="defaultReminderDays"
                          className="form-control"
                          value={maintenanceSettings.defaultReminderDays}
                          onChange={(e) => handleMaintenanceSettingChange('defaultReminderDays', parseInt(e.target.value))}
                          min="1"
                          max="30"
                        />
                      </div>
                    </div>

                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={maintenanceSettings.autoCreateWorkOrders}
                          onChange={(e) => handleMaintenanceSettingChange('autoCreateWorkOrders', e.target.checked)}
                        />
                        <span>Auto-create work orders for scheduled maintenance</span>
                      </label>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={maintenanceSettings.requirePhotos}
                          onChange={(e) => handleMaintenanceSettingChange('requirePhotos', e.target.checked)}
                        />
                        <span>Require photos for maintenance completion</span>
                      </label>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={maintenanceSettings.allowSelfMaintenance}
                          onChange={(e) => handleMaintenanceSettingChange('allowSelfMaintenance', e.target.checked)}
                        />
                        <span>Allow drivers to log basic maintenance</span>
                      </label>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={maintenanceSettings.costCenterRequired}
                          onChange={(e) => handleMaintenanceSettingChange('costCenterRequired', e.target.checked)}
                        />
                        <span>Require cost center for all maintenance</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'user' && (
                  <div className="settings-section">
                    <h3>User Profile</h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="userName">Full Name</label>
                        <input
                          type="text"
                          id="userName"
                          className="form-control"
                          value={userSettings.name}
                          onChange={(e) => handleUserSettingChange('name', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="userEmail">Email</label>
                        <input
                          type="email"
                          id="userEmail"
                          className="form-control"
                          value={userSettings.email}
                          onChange={(e) => handleUserSettingChange('email', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="userPhone">Phone</label>
                        <input
                          type="tel"
                          id="userPhone"
                          className="form-control"
                          value={userSettings.phone}
                          onChange={(e) => handleUserSettingChange('phone', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="userRole">Role</label>
                        <select
                          id="userRole"
                          className="form-control"
                          value={userSettings.role}
                          onChange={(e) => handleUserSettingChange('role', e.target.value)}
                        >
                          <option value="Fleet Manager">Fleet Manager</option>
                          <option value="Maintenance Supervisor">Maintenance Supervisor</option>
                          <option value="Driver">Driver</option>
                          <option value="Administrator">Administrator</option>
                        </select>
                      </div>
                    </div>

                    <h4>Notification Preferences</h4>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={userSettings.notifications.push}
                          onChange={(e) => handleNotificationChange('push', e.target.checked)}
                        />
                        <span>Push notifications</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'data' && (
                  <div className="settings-section">
                    <h3>Data & Export</h3>
                    
                    <div className="data-section">
                      <h4>Export Fleet Data</h4>
                      <p>Download your fleet data in various formats for backup or analysis.</p>
                      <div className="export-buttons">
                        <button className="btn btn-secondary" onClick={() => handleExportData('csv')}>
                          📊 Export to CSV
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleExportData('excel')}>
                          📈 Export to Excel
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleExportData('json')}>
                          📄 Export to JSON
                        </button>
                      </div>
                    </div>

                    <div className="data-section">
                      <h4>Data Retention</h4>
                      <p>Configure how long data is retained in the system.</p>
                      <div className="form-group">
                        <label htmlFor="retentionPeriod">Maintenance Records Retention (months)</label>
                        <select 
                          id="retentionPeriod" 
                          className="form-control"
                          value={dataRetentionSettings.retentionPeriod}
                          onChange={(e) => setDataRetentionSettings(prev => ({ ...prev, retentionPeriod: e.target.value }))}
                        >
                          <option value="12">12 months</option>
                          <option value="24">24 months</option>
                          <option value="36">36 months</option>
                          <option value="60">5 years</option>
                          <option value="-1">Indefinite</option>
                        </select>
                      </div>
                    </div>

                    <div className="data-section danger-zone">
                      <h4>Danger Zone</h4>
                      <p>These actions cannot be undone. Please be careful.</p>
                      <div className="danger-actions">
                        <button className="btn btn-danger" onClick={handleResetSettings}>
                          🔄 Reset All Settings
                        </button>
                      </div>
                    </div>

                    <div className="data-section sign-out-section">
                      <h4>Account Actions</h4>
                      <p>Manage your account and session.</p>
                      <div className="account-actions">
                        <button className="btn btn-warning" onClick={handleSignOut}>
                          🚪 Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="settings-modal-actions">
                  <button className="btn btn-secondary" onClick={handleCancel}>
                    ❌ Cancel Changes
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveSettings}>
                    💾 Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
