import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Clock, MapPin, Plus, X } from 'lucide-react';
import { MaintenanceReminder, Truck, MaintenanceType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';


interface ReminderCardProps {
  reminder: MaintenanceReminder;
  truck: Truck;
  onEdit: (reminder: MaintenanceReminder) => void;
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

const ReminderCard: React.FC<ReminderCardProps> = ({ 
  reminder, 
  truck, 
  onEdit, 
  onDelete, 
  onMarkComplete 
}) => {
  const isOverdue = reminder.isOverdue;
  const isUpcomingSoon = !isOverdue && reminder.nextDue && 
    (typeof reminder.nextDue === 'number' 
      ? truck.mileage >= (reminder.nextDue - 1000)
      : new Date(reminder.nextDue).getTime() <= new Date().getTime() + (7 * 24 * 60 * 60 * 1000));

  const getStatusClass = () => {
    if (isOverdue) return 'reminder-card overdue';
    if (isUpcomingSoon) return 'reminder-card upcoming';
    return 'reminder-card normal';
  };

  const formatNextDue = () => {
    if (typeof reminder.nextDue === 'number') {
      return `${reminder.nextDue.toLocaleString()} miles`;
    }
    if (reminder.nextDue instanceof Date) {
      return reminder.nextDue.toLocaleDateString();
    }
    return 'Not scheduled';
  };

  return (
    <div className={getStatusClass()}>
      <div className="reminder-header">
        <div className="reminder-info">
          <h4>{reminder.type}</h4>
          <p className="truck-info">{truck.licensePlate} - {truck.nickname || truck.make + ' ' + truck.model}</p>
        </div>
        <div className="reminder-status">
          {isOverdue && <AlertTriangle className="status-icon overdue" size={20} />}
          {isUpcomingSoon && <Clock className="status-icon upcoming" size={20} />}
        </div>
      </div>
      
      <div className="reminder-details">
        <div className="detail-item">
          <Calendar size={16} />
          <span>Due: {formatNextDue()}</span>
        </div>
        
        {reminder.lastPerformed && (
          <div className="detail-item">
            <Clock size={16} />
            <span>Last: {reminder.lastPerformed.toLocaleDateString()}</span>
          </div>
        )}
        
        {reminder.customMessage && (
          <div className="reminder-message">
            <p>{reminder.customMessage}</p>
          </div>
        )}
      </div>
      
      <div className="reminder-actions">
        <button 
          onClick={() => onMarkComplete(reminder.id)}
          className="btn-complete"
        >
          Mark Complete
        </button>
        <button 
          onClick={() => onEdit(reminder)}
          className="btn-edit"
        >
          Edit
        </button>
        <button 
          onClick={() => onDelete(reminder.id)}
          className="btn-delete"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

interface ReminderFormProps {
  reminder?: MaintenanceReminder;
  trucks: Truck[];
  onSave: (reminderData: Partial<MaintenanceReminder>) => void;
  onCancel: () => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ 
  reminder, 
  trucks, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    truckId: reminder?.truckId || '',
    type: reminder?.type || 'Oil Change' as MaintenanceType,
    reminderType: reminder?.reminderType || 'mileage' as 'mileage' | 'date' | 'both',
    mileageInterval: reminder?.mileageInterval || 0,
    dateInterval: reminder?.dateInterval || 0,
    customMessage: reminder?.customMessage || ''
  });

  const maintenanceTypes: MaintenanceType[] = [
    'Oil Change', 'Tire Replacement', 'Brake Inspection', 'Engine Service',
    'Transmission Service', 'DOT Inspection', 'General Repair', 'Preventive Maintenance',
    'Emergency Repair', 'Annual Inspection', 'Safety Check'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'mileageInterval' || name === 'dateInterval' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  return (
    <div className="reminder-form-overlay">
      <div className="reminder-form-modal">
        <div className="form-header">
          <h2>{reminder ? 'Edit Reminder' : 'Add Maintenance Reminder'}</h2>
          <button onClick={onCancel} className="close-button">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="reminder-form">
          <div className="form-group">
            <label htmlFor="truckId">Truck *</label>
            <select
              id="truckId"
              name="truckId"
              value={formData.truckId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a truck...</option>
              {trucks.map(truck => (
                <option key={truck.id} value={truck.id}>
                  {truck.licensePlate} - {truck.make} {truck.model} ({truck.nickname || truck.vin})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="type">Maintenance Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              {maintenanceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reminderType">Reminder Based On *</label>
            <select
              id="reminderType"
              name="reminderType"
              value={formData.reminderType}
              onChange={handleInputChange}
              required
            >
              <option value="mileage">Mileage</option>
              <option value="date">Date</option>
              <option value="both">Both Mileage and Date</option>
            </select>
          </div>

          {(formData.reminderType === 'mileage' || formData.reminderType === 'both') && (
            <div className="form-group">
              <label htmlFor="mileageInterval">Mileage Interval (miles)</label>
              <input
                type="number"
                id="mileageInterval"
                name="mileageInterval"
                value={formData.mileageInterval}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g., 15000"
              />
            </div>
          )}

          {(formData.reminderType === 'date' || formData.reminderType === 'both') && (
            <div className="form-group">
              <label htmlFor="dateInterval">Date Interval (days)</label>
              <input
                type="number"
                id="dateInterval"
                name="dateInterval"
                value={formData.dateInterval}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g., 90"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="customMessage">Custom Message</label>
            <textarea
              id="customMessage"
              name="customMessage"
              value={formData.customMessage}
              onChange={handleInputChange}
              rows={3}
              placeholder="Optional custom reminder message..."
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {reminder ? 'Update Reminder' : 'Add Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MaintenanceReminders: React.FC = () => {
  const { state } = useAppContext();
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<MaintenanceReminder | undefined>();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTrucks(state.trucks);
  setReminders([]); 
  };

  const handleSaveReminder = (reminderData: Partial<MaintenanceReminder>) => {
    if (editingReminder) {
      
      setReminders(prev => prev.map(r => 
        r.id === editingReminder.id 
          ? { ...r, ...reminderData }
          : r
      ));
    } else {
      
      const newReminder: MaintenanceReminder = {
        id: `rem-${Date.now()}`,
        ...reminderData,
        isOverdue: false,
        isActive: true,
        notificationsSent: 0,
        createdBy: 'user-1',
        createdAt: new Date()
      } as MaintenanceReminder;
      setReminders(prev => [...prev, newReminder]);
    }
    
    setShowForm(false);
    setEditingReminder(undefined);
  };

  const handleEditReminder = (reminder: MaintenanceReminder) => {
    setEditingReminder(reminder);
    setShowForm(true);
  };

  const handleDeleteReminder = (id: string) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      setReminders(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleMarkComplete = (id: string) => {
    
    console.log('Mark complete:', id);
    
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const getFilteredReminders = () => {
    return reminders.filter(reminder => {
      switch (filter) {
        case 'overdue':
          return reminder.isOverdue;
        case 'upcoming':
          const truck = trucks.find(t => t.id === reminder.truckId);
          if (!truck) return false;
          return !reminder.isOverdue && reminder.nextDue && 
            (typeof reminder.nextDue === 'number' 
              ? truck.mileage >= (reminder.nextDue - 1000)
              : new Date(reminder.nextDue).getTime() <= new Date().getTime() + (7 * 24 * 60 * 60 * 1000));
        default:
          return true;
      }
    });
  };

  const filteredReminders = getFilteredReminders();
  const overdueCount = reminders.filter(r => r.isOverdue).length;
  const upcomingCount = reminders.filter(r => {
    const truck = trucks.find(t => t.id === r.truckId);
    if (!truck) return false;
    return !r.isOverdue && r.nextDue && 
      (typeof r.nextDue === 'number' 
        ? truck.mileage >= (r.nextDue - 1000)
        : new Date(r.nextDue).getTime() <= new Date().getTime() + (7 * 24 * 60 * 60 * 1000));
  }).length;

  return (
    <div className="maintenance-reminders">
      <div className="reminders-header">
        <div className="header-content">
          <h1>Maintenance Reminders</h1>
          <p>Stay on top of scheduled maintenance to keep your fleet running smoothly</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Reminder
        </button>
      </div>

      <div className="reminders-stats">
        <div className="stat-card overdue">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <h3>{overdueCount}</h3>
            <p>Overdue</p>
          </div>
        </div>
        <div className="stat-card upcoming">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>{upcomingCount}</h3>
            <p>Due Soon</p>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>{reminders.length}</h3>
            <p>Total Active</p>
          </div>
        </div>
      </div>

      <div className="reminders-filters">
        <button 
          onClick={() => setFilter('all')}
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
        >
          All Reminders ({reminders.length})
        </button>
        <button 
          onClick={() => setFilter('overdue')}
          className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`}
        >
          Overdue ({overdueCount})
        </button>
        <button 
          onClick={() => setFilter('upcoming')}
          className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
        >
          Due Soon ({upcomingCount})
        </button>
      </div>

      <div className="reminders-list">
        {filteredReminders.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No reminders found</h3>
            <p>
              {filter === 'all' 
                ? 'Add maintenance reminders to stay on top of fleet maintenance.'
                : `No ${filter} reminders at this time.`
              }
            </p>
            {filter === 'all' && (
              <button 
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                <Plus size={16} />
                Add Your First Reminder
              </button>
            )}
          </div>
        ) : (
          filteredReminders.map(reminder => {
            const truck = trucks.find(t => t.id === reminder.truckId);
            if (!truck) return null;
            
            return (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                truck={truck}
                onEdit={handleEditReminder}
                onDelete={handleDeleteReminder}
                onMarkComplete={handleMarkComplete}
              />
            );
          })
        )}
      </div>

      {showForm && (
        <ReminderForm
          reminder={editingReminder}
          trucks={trucks}
          onSave={handleSaveReminder}
          onCancel={() => {
            setShowForm(false);
            setEditingReminder(undefined);
          }}
        />
      )}
    </div>
  );
};
