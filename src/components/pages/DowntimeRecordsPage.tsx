import React, { useState, useEffect } from 'react';
import { Truck } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { notificationService } from '../../services/NotificationService';
import '../../styles/enhanced.css';

interface DowntimeRecord {
  id: string;
  truckId: string;
  truckName: string;
  reason: string;
  category: 'Maintenance' | 'Repair' | 'Accident' | 'Weather' | 'Other';
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  description: string;
  cost?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DowntimeFormProps {
  record?: DowntimeRecord;
  trucks: Truck[];
  onSave: (record: Omit<DowntimeRecord, 'id'>) => void;
  onCancel: () => void;
}

const DowntimeForm: React.FC<DowntimeFormProps> = ({ record, trucks, onSave, onCancel }) => {
  const { state } = useAppContext();
  const [formData, setFormData] = useState({
    truckId: record?.truckId || '',
    reason: record?.reason || '',
    category: record?.category || 'Maintenance' as const,
    startTime: record?.startTime ? record.startTime.toISOString().slice(0, 16) : '',
    endTime: record?.endTime ? record.endTime.toISOString().slice(0, 16) : '',
    description: record?.description || '',
    cost: record?.cost || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTruck = trucks.find(t => t.id === formData.truckId);
    
    onSave({
      truckId: formData.truckId,
      truckName: selectedTruck ? `${selectedTruck.make} ${selectedTruck.model} (${selectedTruck.licensePlate})` : '',
      reason: formData.reason,
      category: formData.category,
      startTime: new Date(formData.startTime),
      endTime: formData.endTime ? new Date(formData.endTime) : undefined,
      isActive: !formData.endTime,
      description: formData.description,
      cost: formData.cost > 0 ? formData.cost : undefined,
      createdBy: state.currentUser?.id || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  return (
    <div className="downtime-form-overlay">
      <div className="downtime-form-modal">
        <div className="downtime-form-header">
          <h2>{record ? 'Edit Downtime Record' : 'Log Downtime Event'}</h2>
          <button type="button" onClick={onCancel} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="downtime-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="truckId">Truck *</label>
              <select
                id="truckId"
                value={formData.truckId}
                onChange={(e) => setFormData(prev => ({ ...prev, truckId: e.target.value }))}
                required
              >
                <option value="">Select Truck</option>
                {trucks.map(truck => (
                  <option key={truck.id} value={truck.id}>
                    {truck.make} {truck.model} ({truck.licensePlate})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                required
              >
                <option value="Maintenance">Scheduled Maintenance</option>
                <option value="Repair">Emergency Repair</option>
                <option value="Accident">Accident/Incident</option>
                <option value="Weather">Weather Related</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason *</label>
            <input
              type="text"
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Brief reason for downtime"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                type="datetime-local"
                id="startTime"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time (leave empty if ongoing)</label>
              <input
                type="datetime-local"
                id="endTime"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Detailed Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about the downtime..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cost">Associated Cost ($)</label>
            <input
              type="number"
              id="cost"
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {record ? 'Update Record' : 'Log Downtime'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DowntimeRecordsPage: React.FC = () => {
  const { state } = useAppContext();
  const [records, setRecords] = useState<DowntimeRecord[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DowntimeRecord | undefined>();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const trucksData = state.trucks;
      const recordsData = await loadDowntimeRecords();
      
      setTrucks(trucksData || []);
      setRecords(recordsData);
    } catch (error) {
      console.error('Error loading downtime data:', error);
      notificationService.addNotification({
        type: 'alert',
        title: 'Load Error',
        message: 'Failed to load downtime records',
        priority: 'medium',
        actionRequired: false
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDowntimeRecords = async (): Promise<DowntimeRecord[]> => {
    const saved = localStorage.getItem('downtimeRecords');
    if (saved) {
      return JSON.parse(saved).map((record: any) => ({
        ...record,
        startTime: new Date(record.startTime),
        endTime: record.endTime ? new Date(record.endTime) : undefined,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt)
      }));
    }
    return [];
  };

  const saveDowntimeRecords = (records: DowntimeRecord[]) => {
    localStorage.setItem('downtimeRecords', JSON.stringify(records));
  };

  const handleSaveRecord = (recordData: Omit<DowntimeRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    
    if (editingRecord) {
      
      const updatedRecords = records.map(record =>
        record.id === editingRecord.id
          ? { ...recordData, id: editingRecord.id, createdAt: editingRecord.createdAt, updatedAt: now }
          : record
      );
      setRecords(updatedRecords);
      saveDowntimeRecords(updatedRecords);
      
      notificationService.addNotification({
        type: 'info',
        title: 'Record Updated',
        message: `Downtime record for ${recordData.truckName} has been updated`,
        priority: 'low',
        actionRequired: false
      });
    } else {
      
      const newRecord: DowntimeRecord = {
        ...recordData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: now,
        updatedAt: now
      };
      
      const updatedRecords = [newRecord, ...records];
      setRecords(updatedRecords);
      saveDowntimeRecords(updatedRecords);
      
      notificationService.addNotification({
        type: 'maintenance',
        title: 'Downtime Logged',
        message: `${recordData.truckName} downtime recorded: ${recordData.reason}`,
        priority: recordData.category === 'Accident' ? 'urgent' : 'medium',
        actionRequired: recordData.isActive,
        relatedEntity: {
          type: 'truck',
          id: recordData.truckId,
          name: recordData.truckName
        }
      });
    }
    
    setShowForm(false);
    setEditingRecord(undefined);
  };

  const handleEndDowntime = (recordId: string) => {
    const updatedRecords = records.map(record =>
      record.id === recordId
        ? { ...record, endTime: new Date(), isActive: false, updatedAt: new Date() }
        : record
    );
    setRecords(updatedRecords);
    saveDowntimeRecords(updatedRecords);
    
    const record = records.find(r => r.id === recordId);
    if (record) {
      notificationService.addNotification({
        type: 'info',
        title: 'Downtime Ended',
        message: `${record.truckName} is back in service`,
        priority: 'low',
        actionRequired: false
      });
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this downtime record?')) {
      const updatedRecords = records.filter(record => record.id !== recordId);
      setRecords(updatedRecords);
      saveDowntimeRecords(updatedRecords);
    }
  };

  const filteredRecords = records.filter(record => {
    const statusMatch = filter === 'all' || 
      (filter === 'active' && record.isActive) || 
      (filter === 'resolved' && !record.isActive);
    
    const categoryMatch = categoryFilter === 'all' || record.category === categoryFilter;
    
    return statusMatch && categoryMatch;
  });

  const calculateDuration = (start: Date, end?: Date): string => {
    const endTime = end || new Date();
    const durationMs = endTime.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
  };

  const totalDowntimeHours = records.reduce((total, record) => {
    const end = record.endTime || new Date();
    const duration = (end.getTime() - record.startTime.getTime()) / (1000 * 60 * 60);
    return total + duration;
  }, 0);

  const activeDowntimeCount = records.filter(r => r.isActive).length;

  if (loading) {
    return <div className="loading-spinner">Loading downtime records...</div>;
  }

  return (
    <div className="downtime-records-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Downtime Records</h1>
          <p>Track and manage vehicle downtime events</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Log Downtime
        </button>
      </div>

      <div className="downtime-stats">
        <div className="stat-card">
          <div className="stat-value">{activeDowntimeCount}</div>
          <div className="stat-label">Active Downtime</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">Total Records</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(totalDowntimeHours)}h</div>
          <div className="stat-label">Total Downtime</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            ${records.reduce((sum, r) => sum + (r.cost || 0), 0).toLocaleString()}
          </div>
          <div className="stat-label">Total Cost</div>
        </div>
      </div>

      <div className="downtime-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Records</option>
            <option value="active">Active Downtime</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category:</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Repair">Repair</option>
            <option value="Accident">Accident</option>
            <option value="Weather">Weather</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="downtime-records-list">
        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <p>No downtime records found</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Log First Downtime Event
            </button>
          </div>
        ) : (
          filteredRecords.map(record => (
            <div key={record.id} className={`downtime-record-card ${record.isActive ? 'active' : 'resolved'}`}>
              <div className="record-header">
                <div className="truck-info">
                  <h3>{record.truckName}</h3>
                  <span className={`category-badge ${record.category.toLowerCase()}`}>
                    {record.category}
                  </span>
                  {record.isActive && <span className="status-badge active">ONGOING</span>}
                </div>
                <div className="record-actions">
                  {record.isActive && (
                    <button 
                      className="btn-success btn-sm"
                      onClick={() => handleEndDowntime(record.id)}
                    >
                      End Downtime
                    </button>
                  )}
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setEditingRecord(record);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-danger btn-sm"
                    onClick={() => handleDeleteRecord(record.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="record-details">
                <div className="detail-row">
                  <strong>Reason:</strong> {record.reason}
                </div>
                <div className="detail-row">
                  <strong>Duration:</strong> {calculateDuration(record.startTime, record.endTime)}
                </div>
                <div className="detail-row">
                  <strong>Started:</strong> {record.startTime.toLocaleString()}
                </div>
                {record.endTime && (
                  <div className="detail-row">
                    <strong>Ended:</strong> {record.endTime.toLocaleString()}
                  </div>
                )}
                {record.description && (
                  <div className="detail-row">
                    <strong>Description:</strong> {record.description}
                  </div>
                )}
                {record.cost && (
                  <div className="detail-row">
                    <strong>Cost:</strong> ${record.cost.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <DowntimeForm
          record={editingRecord}
          trucks={trucks}
          onSave={handleSaveRecord}
          onCancel={() => {
            setShowForm(false);
            setEditingRecord(undefined);
          }}
        />
      )}
    </div>
  );
};
