import React, { useState, useEffect } from 'react';
import { Bell, Settings, X, Check, AlertTriangle, Info, Calendar, Wrench, Package, Users } from 'lucide-react';
import userDataService, { NotificationData } from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';

interface NotificationCenterProps {}

interface NotificationFilter {
  type: 'all' | 'maintenance' | 'parts' | 'calendar' | 'system';
  status: 'all' | 'unread' | 'read';
}

interface NotificationSettings {
  emailNotifications: boolean;
  browserNotifications: boolean;
  maintenanceReminders: boolean;
  lowStockAlerts: boolean;
  calendarReminders: boolean;
  systemUpdates: boolean;
  reminderDays: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = () => {
  const { state } = useAppContext();
  const { currentUser } = state;
  
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>({ type: 'all', status: 'all' });
  
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    browserNotifications: false,
    maintenanceReminders: true,
    lowStockAlerts: true,
    calendarReminders: true,
    systemUpdates: false,
    reminderDays: 3
  });

  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
    requestNotificationPermission();
  }, []);

  const loadNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userNotifications = await userDataService.getNotifications(currentUser.id);
      setNotifications(userNotifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setSettings(prev => ({ ...prev, browserNotifications: permission === 'granted' }));
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await userDataService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      for (const notification of unreadNotifications) {
        await userDataService.markNotificationAsRead(notification.id);
      }
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await userDataService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      
      
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };


  const generateMaintenanceReminders = async () => {
    setLoading(true);
    try {
      
      const reminders = await userDataService.generateMaintenanceReminders(settings.reminderDays);
      
      for (const reminder of reminders) {
        if (currentUser) {
          await userDataService.createNotification(currentUser.id, {
            title: `Maintenance Due: ${reminder.vehicleName}`,
            message: `${reminder.maintenanceType} is due in ${reminder.daysUntilDue} days`,
            type: 'maintenance',
            priority: reminder.daysUntilDue <= 1 ? 'high' : 'medium',
            isRead: false,
            metadata: { vehicleId: reminder.vehicleId, maintenanceId: reminder.maintenanceId }
          });
        }
      }
      
      await loadNotifications();
      alert(`Generated ${reminders.length} maintenance reminders`);
    } catch (error) {
      console.error('Error generating maintenance reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return <Wrench className="notification-icon maintenance" />;
      case 'parts':
        return <Package className="notification-icon parts" />;
      case 'calendar':
        return <Calendar className="notification-icon calendar" />;
      case 'system':
        return <Settings className="notification-icon system" />;
      default:
        return <Info className="notification-icon default" />;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const typeMatch = filter.type === 'all' || notification.type === filter.type;
    const statusMatch = filter.status === 'all' || 
      (filter.status === 'read' && notification.isRead) ||
      (filter.status === 'unread' && !notification.isRead);
    
    return typeMatch && statusMatch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notification-center">
      <div className="page-header">
        <div className="header-left">
          <h1>
            <Bell size={24} />
            Notifications
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </h1>
          <p>Stay updated with fleet activities and reminders</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={20} />
            Settings
          </button>
          {unreadCount > 0 && (
            <button 
              className="btn btn-primary"
              onClick={markAllAsRead}
              disabled={loading}
            >
              <Check size={20} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="notification-controls">
        <div className="filter-controls">
          <div className="filter-group">
            <label>Type:</label>
            <select 
              value={filter.type} 
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as any }))}
            >
              <option value="all">All Types</option>
              <option value="maintenance">Maintenance</option>
              <option value="parts">Parts</option>
              <option value="calendar">Calendar</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filter.status} 
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>

        <div className="action-controls">
          <button 
            className="btn btn-secondary"
            onClick={generateMaintenanceReminders}
            disabled={loading}
          >
            <Wrench size={20} />
            Generate Maintenance Reminders
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {loading && notifications.length === 0 ? (
          <div className="loading-state">
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.isRead ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
            >
              <div className="notification-content">
                <div className="notification-header">
                  {getNotificationIcon(notification.type)}
                  <div className="notification-meta">
                    <h4>{notification.title}</h4>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="notification-actions">
                    {!notification.isRead && (
                      <button
                        className="action-btn"
                        onClick={() => markAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      className="action-btn"
                      onClick={() => deleteNotification(notification.id)}
                      title="Delete"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="notification-body">
                  <p>{notification.message}</p>
                  {notification.actionUrl && (
                    <div className="notification-actions">
                      <a href={notification.actionUrl} className="btn btn-sm btn-primary">
                        View Details
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Notification Settings</h3>
              <button 
                className="modal-close"
                onClick={() => setShowSettings(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <h4>Delivery Methods</h4>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    />
                    Email Notifications
                  </label>
                  <p className="setting-description">Receive notifications via email</p>
                </div>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.browserNotifications}
                      onChange={(e) => setSettings(prev => ({ ...prev, browserNotifications: e.target.checked }))}
                      disabled={!('Notification' in window) || Notification.permission === 'denied'}
                    />
                    Browser Notifications
                  </label>
                  <p className="setting-description">
                    Receive push notifications in your browser
                    {Notification.permission === 'denied' && (
                      <span className="text-warning"> (Permission denied)</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="settings-section">
                <h4>Notification Types</h4>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceReminders}
                      onChange={(e) => setSettings(prev => ({ ...prev, maintenanceReminders: e.target.checked }))}
                    />
                    Maintenance Reminders
                  </label>
                  <p className="setting-description">Get notified about upcoming maintenance</p>
                </div>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.lowStockAlerts}
                      onChange={(e) => setSettings(prev => ({ ...prev, lowStockAlerts: e.target.checked }))}
                    />
                    Low Stock Alerts
                  </label>
                  <p className="setting-description">Get notified when parts inventory is low</p>
                </div>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.calendarReminders}
                      onChange={(e) => setSettings(prev => ({ ...prev, calendarReminders: e.target.checked }))}
                    />
                    Calendar Reminders
                  </label>
                  <p className="setting-description">Get notified about scheduled events</p>
                </div>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.systemUpdates}
                      onChange={(e) => setSettings(prev => ({ ...prev, systemUpdates: e.target.checked }))}
                    />
                    System Updates
                  </label>
                  <p className="setting-description">Get notified about system updates and announcements</p>
                </div>
              </div>

              <div className="settings-section">
                <h4>Reminder Timing</h4>
                <div className="setting-item">
                  <label>Days before maintenance due:</label>
                  <select
                    value={settings.reminderDays}
                    onChange={(e) => setSettings(prev => ({ ...prev, reminderDays: parseInt(e.target.value) }))}
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>1 week</option>
                    <option value={14}>2 weeks</option>
                    <option value={30}>1 month</option>
                  </select>
                  <p className="setting-description">How far in advance to send maintenance reminders</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveSettings}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
