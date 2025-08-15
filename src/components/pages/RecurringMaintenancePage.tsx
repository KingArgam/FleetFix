import React, { useState, useEffect } from 'react';
import { Truck, MaintenanceEntry } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { notificationService } from '../../services/NotificationService';
import '../../styles/enhanced.css';

interface MaintenanceTemplate {
  id: string;
  name: string;
  description: string;
  type: 'Preventive' | 'Inspection' | 'Service' | 'Repair';
  intervalType: 'mileage' | 'time' | 'both';
  mileageInterval?: number;
  timeInterval?: number;
  timeUnit: 'days' | 'weeks' | 'months' | 'years';
  estimatedDuration: number; 
  estimatedCost: number;
  taskList: string[];
  partsList: Array<{
    name: string;
    quantity: number;
    estimatedCost: number;
  }>;
  isActive: boolean;
  applicableVehicleTypes: string[];
  reminderDays: number; 
  createdAt: Date;
  updatedAt: Date;
}

interface RecurringMaintenanceSchedule {
  id: string;
  templateId: string;
  truckId: string;
  truckName: string;
  nextDueDate: Date;
  nextDueMileage?: number;
  isActive: boolean;
  lastCompletedDate?: Date;
  lastCompletedMileage?: number;
  missedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateFormProps {
  template?: MaintenanceTemplate;
  onSave: (template: Omit<MaintenanceTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    type: template?.type || 'Preventive' as const,
    intervalType: template?.intervalType || 'both' as const,
    mileageInterval: template?.mileageInterval || 5000,
    timeInterval: template?.timeInterval || 6,
    timeUnit: template?.timeUnit || 'months' as const,
    estimatedDuration: template?.estimatedDuration || 2,
    estimatedCost: template?.estimatedCost || 500,
    taskList: template?.taskList || [''],
    partsList: template?.partsList || [{ name: '', quantity: 1, estimatedCost: 0 }],
    isActive: template?.isActive ?? true,
    applicableVehicleTypes: template?.applicableVehicleTypes || ['All'],
    reminderDays: template?.reminderDays || 7,
  });

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...formData.taskList];
    newTasks[index] = value;
    setFormData(prev => ({ ...prev, taskList: newTasks }));
  };

  const addTask = () => {
    setFormData(prev => ({ ...prev, taskList: [...prev.taskList, ''] }));
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      taskList: prev.taskList.filter((_, i) => i !== index) 
    }));
  };

  const handlePartChange = (index: number, field: string, value: any) => {
    const newParts = [...formData.partsList];
    newParts[index] = { ...newParts[index], [field]: value };
    setFormData(prev => ({ ...prev, partsList: newParts }));
  };

  const addPart = () => {
    setFormData(prev => ({ 
      ...prev, 
      partsList: [...prev.partsList, { name: '', quantity: 1, estimatedCost: 0 }] 
    }));
  };

  const removePart = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      partsList: prev.partsList.filter((_, i) => i !== index) 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      taskList: formData.taskList.filter(task => task.trim() !== ''),
      partsList: formData.partsList.filter(part => part.name.trim() !== ''),
    });
  };

  const getIntervalDisplay = () => {
    const { intervalType, mileageInterval, timeInterval, timeUnit } = formData;
    
    if (intervalType === 'mileage') {
      return `Every ${mileageInterval?.toLocaleString()} miles`;
    } else if (intervalType === 'time') {
      return `Every ${timeInterval} ${timeUnit}`;
    } else {
      return `Every ${mileageInterval?.toLocaleString()} miles OR ${timeInterval} ${timeUnit}`;
    }
  };

  return (
    <div className="template-form-overlay">
      <div className="template-form-modal">
        <div className="template-form-header">
          <h2>{template ? 'Edit Maintenance Template' : 'Create Maintenance Template'}</h2>
          <button type="button" onClick={onCancel} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="template-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Template Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Oil Change, Annual Inspection"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Maintenance Type *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  required
                >
                  <option value="Preventive">Preventive Maintenance</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Service">Service</option>
                  <option value="Repair">Repair</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Detailed description of this maintenance..."
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Scheduling</h3>
            
            <div className="form-group">
              <label htmlFor="intervalType">Schedule Based On *</label>
              <select
                id="intervalType"
                value={formData.intervalType}
                onChange={(e) => setFormData(prev => ({ ...prev, intervalType: e.target.value as any }))}
                required
              >
                <option value="mileage">Mileage Only</option>
                <option value="time">Time Only</option>
                <option value="both">Mileage OR Time (whichever comes first)</option>
              </select>
            </div>

            {(formData.intervalType === 'mileage' || formData.intervalType === 'both') && (
              <div className="form-group">
                <label htmlFor="mileageInterval">Mileage Interval (miles) *</label>
                <input
                  type="number"
                  id="mileageInterval"
                  value={formData.mileageInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, mileageInterval: parseInt(e.target.value) || 0 }))}
                  min="1"
                  step="1000"
                  required={formData.intervalType === 'mileage' || formData.intervalType === 'both'}
                />
              </div>
            )}

            {(formData.intervalType === 'time' || formData.intervalType === 'both') && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="timeInterval">Time Interval *</label>
                  <input
                    type="number"
                    id="timeInterval"
                    value={formData.timeInterval}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeInterval: parseInt(e.target.value) || 0 }))}
                    min="1"
                    required={formData.intervalType === 'time' || formData.intervalType === 'both'}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="timeUnit">Time Unit *</label>
                  <select
                    id="timeUnit"
                    value={formData.timeUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeUnit: e.target.value as any }))}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            )}

            <div className="schedule-preview">
              <strong>Schedule: </strong>{getIntervalDisplay()}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reminderDays">Reminder Days Before Due</label>
                <input
                  type="number"
                  id="reminderDays"
                  value={formData.reminderDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminderDays: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="365"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span className="checkmark"></span>
                  Active Template
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Cost & Duration</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="estimatedDuration">Estimated Duration (hours)</label>
                <input
                  type="number"
                  id="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="estimatedCost">Estimated Cost ($)</label>
                <input
                  type="number"
                  id="estimatedCost"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Task List</h3>
            
            {formData.taskList.map((task, index) => (
              <div key={index} className="task-item">
                <input
                  type="text"
                  value={task}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  placeholder="Enter maintenance task..."
                />
                {formData.taskList.length > 1 && (
                  <button type="button" onClick={() => removeTask(index)} className="btn-danger btn-sm">
                    Remove
                  </button>
                )}
              </div>
            ))}
            
            <button type="button" onClick={addTask} className="btn-secondary btn-sm">
              + Add Task
            </button>
          </div>

          <div className="form-section">
            <h3>Parts List</h3>
            
            {formData.partsList.map((part, index) => (
              <div key={index} className="part-item">
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      value={part.name}
                      onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                      placeholder="Part name..."
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="number"
                      value={part.quantity}
                      onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      placeholder="Qty"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="number"
                      value={part.estimatedCost}
                      onChange={(e) => handlePartChange(index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="Cost"
                    />
                  </div>
                  {formData.partsList.length > 1 && (
                    <button type="button" onClick={() => removePart(index)} className="btn-danger btn-sm">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            <button type="button" onClick={addPart} className="btn-secondary btn-sm">
              + Add Part
            </button>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const RecurringMaintenancePage: React.FC = () => {
  const { state } = useAppContext();
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [schedules, setSchedules] = useState<RecurringMaintenanceSchedule[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MaintenanceTemplate | undefined>();
  const [activeTab, setActiveTab] = useState<'templates' | 'schedules'>('templates');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const trucksData = state.trucks;
      const [templatesData, schedulesData] = await Promise.all([
        loadMaintenanceTemplates(),
        loadMaintenanceSchedules()
      ]);
      
      setTrucks(trucksData || []);
      setTemplates(templatesData);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error loading recurring maintenance data:', error);
      notificationService.addNotification({
        type: 'alert',
        title: 'Load Error',
        message: 'Failed to load recurring maintenance data',
        priority: 'medium',
        actionRequired: false
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceTemplates = async (): Promise<MaintenanceTemplate[]> => {
    const saved = localStorage.getItem('maintenanceTemplates');
    if (saved) {
      return JSON.parse(saved).map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      }));
    }
    
    
    const defaultTemplates: MaintenanceTemplate[] = [
      {
        id: 'oil-change',
        name: 'Regular Oil Change',
        description: 'Standard engine oil and filter replacement',
        type: 'Preventive',
        intervalType: 'both',
        mileageInterval: 5000,
        timeInterval: 6,
        timeUnit: 'months',
        estimatedDuration: 1,
        estimatedCost: 75,
        taskList: [
          'Drain engine oil',
          'Replace oil filter',
          'Add new engine oil',
          'Check fluid levels',
          'Inspect for leaks'
        ],
        partsList: [
          { name: 'Engine Oil (5qts)', quantity: 1, estimatedCost: 35 },
          { name: 'Oil Filter', quantity: 1, estimatedCost: 15 }
        ],
        isActive: true,
        applicableVehicleTypes: ['All'],
        reminderDays: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'annual-inspection',
        name: 'Annual DOT Inspection',
        description: 'Complete vehicle safety inspection',
        type: 'Inspection',
        intervalType: 'time',
        timeInterval: 1,
        timeUnit: 'years',
        estimatedDuration: 3,
        estimatedCost: 200,
        taskList: [
          'Brake system inspection',
          'Tire and wheel inspection',
          'Lighting system check',
          'Engine compartment inspection',
          'Exhaust system check',
          'Safety equipment verification'
        ],
        partsList: [],
        isActive: true,
        applicableVehicleTypes: ['All'],
        reminderDays: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    localStorage.setItem('maintenanceTemplates', JSON.stringify(defaultTemplates));
    return defaultTemplates;
  };

  const loadMaintenanceSchedules = async (): Promise<RecurringMaintenanceSchedule[]> => {
    const saved = localStorage.getItem('maintenanceSchedules');
    if (saved) {
      return JSON.parse(saved).map((schedule: any) => ({
        ...schedule,
        nextDueDate: new Date(schedule.nextDueDate),
        lastCompletedDate: schedule.lastCompletedDate ? new Date(schedule.lastCompletedDate) : undefined,
        createdAt: new Date(schedule.createdAt),
        updatedAt: new Date(schedule.updatedAt)
      }));
    }
    return [];
  };

  const saveMaintenanceTemplates = (templates: MaintenanceTemplate[]) => {
    localStorage.setItem('maintenanceTemplates', JSON.stringify(templates));
  };

  const saveMaintenanceSchedules = (schedules: RecurringMaintenanceSchedule[]) => {
    localStorage.setItem('maintenanceSchedules', JSON.stringify(schedules));
  };

  const handleSaveTemplate = (templateData: Omit<MaintenanceTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    
    if (editingTemplate) {
      
      const updatedTemplates = templates.map(template =>
        template.id === editingTemplate.id
          ? { ...templateData, id: editingTemplate.id, createdAt: editingTemplate.createdAt, updatedAt: now }
          : template
      );
      setTemplates(updatedTemplates);
      saveMaintenanceTemplates(updatedTemplates);
      
      notificationService.addNotification({
        type: 'info',
        title: 'Template Updated',
        message: `${templateData.name} has been updated`,
        priority: 'low',
        actionRequired: false
      });
    } else {
      
      const newTemplate: MaintenanceTemplate = {
        ...templateData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: now,
        updatedAt: now
      };
      
      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      saveMaintenanceTemplates(updatedTemplates);
      
      notificationService.addNotification({
        type: 'info',
        title: 'Template Created',
        message: `${templateData.name} template has been created`,
        priority: 'low',
        actionRequired: false
      });
    }
    
    setShowTemplateForm(false);
    setEditingTemplate(undefined);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This will also remove any associated schedules.')) {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      const updatedSchedules = schedules.filter(s => s.templateId !== templateId);
      
      setTemplates(updatedTemplates);
      setSchedules(updatedSchedules);
      saveMaintenanceTemplates(updatedTemplates);
      saveMaintenanceSchedules(updatedSchedules);
      
      notificationService.addNotification({
        type: 'info',
        title: 'Template Deleted',
        message: 'Maintenance template has been removed',
        priority: 'low',
        actionRequired: false
      });
    }
  };

  const handleApplyTemplateToTruck = (templateId: string, truckId: string) => {
    const template = templates.find(t => t.id === templateId);
    const truck = trucks.find(t => t.id === truckId);
    
    if (!template || !truck) return;
    
    
    const existingSchedule = schedules.find(s => s.templateId === templateId && s.truckId === truckId);
    if (existingSchedule) {
      alert('This template is already scheduled for this truck.');
      return;
    }
    
    
    const now = new Date();
    let nextDueDate = new Date(now);
    
    if (template.intervalType === 'time' || template.intervalType === 'both') {
      switch (template.timeUnit) {
        case 'days':
          nextDueDate.setDate(nextDueDate.getDate() + (template.timeInterval || 0));
          break;
        case 'weeks':
          nextDueDate.setDate(nextDueDate.getDate() + (template.timeInterval || 0) * 7);
          break;
        case 'months':
          nextDueDate.setMonth(nextDueDate.getMonth() + (template.timeInterval || 0));
          break;
        case 'years':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + (template.timeInterval || 0));
          break;
      }
    }
    
    const newSchedule: RecurringMaintenanceSchedule = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      templateId,
      truckId,
      truckName: `${truck.make} ${truck.model} (${truck.licensePlate})`,
      nextDueDate,
      nextDueMileage: template.mileageInterval ? (truck.mileage || 0) + template.mileageInterval : undefined,
      isActive: true,
      missedCount: 0,
      createdAt: now,
      updatedAt: now
    };
    
    const updatedSchedules = [...schedules, newSchedule];
    setSchedules(updatedSchedules);
    saveMaintenanceSchedules(updatedSchedules);
    
    notificationService.addNotification({
      type: 'maintenance',
      title: 'Maintenance Scheduled',
      message: `${template.name} scheduled for ${truck.licensePlate}`,
      priority: 'medium',
      actionRequired: false,
      relatedEntity: {
        type: 'truck',
        id: truckId,
        name: `${truck.make} ${truck.model}`
      }
    });
  };

  const calculateDaysUntilDue = (schedule: RecurringMaintenanceSchedule): number => {
    const now = new Date();
    const timeDiff = schedule.nextDueDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const getScheduleStatus = (schedule: RecurringMaintenanceSchedule): 'overdue' | 'due-soon' | 'upcoming' => {
    const daysUntilDue = calculateDaysUntilDue(schedule);
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 7) return 'due-soon';
    return 'upcoming';
  };

  if (loading) {
    return <div className="loading-spinner">Loading recurring maintenance...</div>;
  }

  return (
    <div className="recurring-maintenance-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Recurring Maintenance</h1>
          <p>Manage maintenance templates and automated scheduling</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowTemplateForm(true)}
        >
          + Create Template
        </button>
      </div>

      <div className="maintenance-tabs">
        <button 
          className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates ({templates.filter(t => t.isActive).length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          Schedules ({schedules.filter(s => s.isActive).length})
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="templates-section">
          <div className="templates-grid">
            {templates.map(template => (
              <div key={template.id} className={`template-card ${!template.isActive ? 'inactive' : ''}`}>
                <div className="template-header">
                  <h3>{template.name}</h3>
                  <span className={`type-badge ${template.type.toLowerCase()}`}>
                    {template.type}
                  </span>
                  {!template.isActive && <span className="status-badge inactive">Inactive</span>}
                </div>
                
                <div className="template-details">
                  <p>{template.description}</p>
                  
                  <div className="template-schedule">
                    <strong>Schedule:</strong> 
                    {template.intervalType === 'mileage' && (
                      <span> Every {template.mileageInterval?.toLocaleString()} miles</span>
                    )}
                    {template.intervalType === 'time' && (
                      <span> Every {template.timeInterval} {template.timeUnit}</span>
                    )}
                    {template.intervalType === 'both' && (
                      <span> Every {template.mileageInterval?.toLocaleString()} miles OR {template.timeInterval} {template.timeUnit}</span>
                    )}
                  </div>
                  
                  <div className="template-stats">
                    <div className="stat">
                      <span className="stat-value">{template.estimatedDuration}h</span>
                      <span className="stat-label">Duration</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">${template.estimatedCost}</span>
                      <span className="stat-label">Cost</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{template.taskList.length}</span>
                      <span className="stat-label">Tasks</span>
                    </div>
                  </div>
                </div>
                
                <div className="template-actions">
                  <div className="apply-to-truck">
                    <select onChange={(e) => {
                      if (e.target.value) {
                        handleApplyTemplateToTruck(template.id, e.target.value);
                        e.target.value = '';
                      }
                    }}>
                      <option value="">Apply to Truck...</option>
                      {trucks.map(truck => (
                        <option key={truck.id} value={truck.id}>
                          {truck.make} {truck.model} ({truck.licensePlate})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="template-buttons">
                    <button 
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-danger btn-sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {templates.length === 0 && (
            <div className="empty-state">
              <p>No maintenance templates created yet</p>
              <button className="btn-primary" onClick={() => setShowTemplateForm(true)}>
                Create Your First Template
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="schedules-section">
          <div className="schedules-list">
            {schedules.map(schedule => {
              const template = templates.find(t => t.id === schedule.templateId);
              const status = getScheduleStatus(schedule);
              const daysUntilDue = calculateDaysUntilDue(schedule);
              
              return (
                <div key={schedule.id} className={`schedule-card ${status}`}>
                  <div className="schedule-header">
                    <div className="schedule-info">
                      <h3>{template?.name || 'Unknown Template'}</h3>
                      <p>{schedule.truckName}</p>
                    </div>
                    <div className="schedule-status">
                      <span className={`status-badge ${status}`}>
                        {status === 'overdue' && `Overdue ${Math.abs(daysUntilDue)} days`}
                        {status === 'due-soon' && `Due in ${daysUntilDue} days`}
                        {status === 'upcoming' && `Due in ${daysUntilDue} days`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="schedule-details">
                    <div className="detail-row">
                      <strong>Next Due:</strong> {schedule.nextDueDate.toLocaleDateString()}
                    </div>
                    {schedule.nextDueMileage && (
                      <div className="detail-row">
                        <strong>Next Due Mileage:</strong> {schedule.nextDueMileage.toLocaleString()} miles
                      </div>
                    )}
                    {schedule.lastCompletedDate && (
                      <div className="detail-row">
                        <strong>Last Completed:</strong> {schedule.lastCompletedDate.toLocaleDateString()}
                      </div>
                    )}
                    {schedule.missedCount > 0 && (
                      <div className="detail-row warning">
                        <strong>Missed Count:</strong> {schedule.missedCount}
                      </div>
                    )}
                  </div>
                  
                  <div className="schedule-actions">
                    <button className="btn-success btn-sm">
                      Mark Complete
                    </button>
                    <button className="btn-secondary btn-sm">
                      Reschedule
                    </button>
                    <button className="btn-danger btn-sm">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {schedules.length === 0 && (
            <div className="empty-state">
              <p>No recurring maintenance scheduled yet</p>
              <p>Apply templates to your trucks to start automated scheduling</p>
            </div>
          )}
        </div>
      )}

      {showTemplateForm && (
        <TemplateForm
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowTemplateForm(false);
            setEditingTemplate(undefined);
          }}
        />
      )}
    </div>
  );
};
