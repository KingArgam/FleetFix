import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventApi, DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import userDataService, { MaintenanceData, TruckData } from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';
import { notificationService } from '../../services/NotificationService';
import '../../styles/enhanced.css';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  description?: string;
  type: 'maintenance' | 'inspection' | 'repair' | 'delivery' | 'other';
  truckId?: string;
  truckName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  cost?: number;
  assignedTo?: string;
  location?: string;
  recurring?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
}

interface EventFormProps {
  event?: CalendarEvent;
  selectedDate?: Date;
  trucks: TruckData[];
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onCancel: () => void;
  onDelete?: (eventId: string) => void;
}

const EventForm: React.FC<EventFormProps> = ({ event, selectedDate, trucks, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    start: event?.start ? event.start.toISOString().slice(0, 16) : selectedDate?.toISOString().slice(0, 16) || '',
    end: event?.end ? event.end.toISOString().slice(0, 16) : '',
    description: event?.description || '',
    type: event?.type || 'maintenance' as const,
    truckId: event?.truckId || '',
    priority: event?.priority || 'medium' as const,
    status: event?.status || 'scheduled' as const,
    cost: event?.cost || 0,
    assignedTo: event?.assignedTo || '',
    location: event?.location || '',
    isRecurring: !!event?.recurring,
    recurringType: event?.recurring?.type || 'weekly' as const,
    recurringInterval: event?.recurring?.interval || 1,
    recurringEndDate: event?.recurring?.endDate ? event.recurring.endDate.toISOString().slice(0, 10) : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTruck = trucks.find(t => t.id === formData.truckId);
    
    const eventData: Omit<CalendarEvent, 'id'> = {
      title: formData.title,
      start: new Date(formData.start),
      end: formData.end ? new Date(formData.end) : undefined,
      description: formData.description,
      type: formData.type,
      truckId: formData.truckId || undefined,
      truckName: selectedTruck ? `${selectedTruck.make} ${selectedTruck.model} (${selectedTruck.licensePlate})` : undefined,
      priority: formData.priority,
      status: formData.status,
      cost: formData.cost > 0 ? formData.cost : undefined,
      assignedTo: formData.assignedTo || undefined,
      location: formData.location || undefined,
      recurring: formData.isRecurring ? {
        type: formData.recurringType,
        interval: formData.recurringInterval,
        endDate: formData.recurringEndDate ? new Date(formData.recurringEndDate) : undefined,
      } : undefined,
    };

    onSave(eventData);
  };

  const getEventTypeColor = (type: string): string => {
    const colors = {
      maintenance: '#3b82f6',
      inspection: '#10b981',
      repair: '#ef4444',
      delivery: '#8b5cf6',
      other: '#6b7280'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  return (
    <div className="event-form-overlay">
      <div className="event-form-modal">
        <div className="event-form-header">
          <h2>{event ? 'Edit Event' : 'Create Event'}</h2>
          <button type="button" onClick={onCancel} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Type *</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                style={{ borderLeft: `4px solid ${getEventTypeColor(formData.type)}` }}
                required
              >
                <option value="maintenance">Scheduled Maintenance</option>
                <option value="inspection">Inspection</option>
                <option value="repair">Repair</option>
                <option value="delivery">Delivery</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start">Start Time *</label>
              <input
                type="datetime-local"
                id="start"
                value={formData.start}
                onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end">End Time</label>
              <input
                type="datetime-local"
                id="end"
                value={formData.end}
                onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="truckId">Truck</label>
              <select
                id="truckId"
                value={formData.truckId}
                onChange={(e) => setFormData(prev => ({ ...prev, truckId: e.target.value }))}
              >
                <option value="">Select Truck (Optional)</option>
                {trucks.map(truck => (
                  <option key={truck.id} value={truck.id}>
                    {truck.make} {truck.model} ({truck.licensePlate})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="cost">Estimated Cost ($)</label>
              <input
                type="number"
                id="cost"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="assignedTo">Assigned To</label>
              <input
                type="text"
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                placeholder="Technician, driver, etc."
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Shop, customer site, etc."
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Additional details..."
            />
          </div>

          <div className="recurring-section">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                />
                <span className="checkmark"></span>
                Recurring Event
              </label>
            </div>

            {formData.isRecurring && (
              <div className="recurring-options">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="recurringType">Repeat</label>
                    <select
                      id="recurringType"
                      value={formData.recurringType}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurringType: e.target.value as any }))}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="recurringInterval">Every</label>
                    <input
                      type="number"
                      id="recurringInterval"
                      value={formData.recurringInterval}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurringInterval: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="365"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="recurringEndDate">End Date (Optional)</label>
                  <input
                    type="date"
                    id="recurringEndDate"
                    value={formData.recurringEndDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            {event && onDelete && (
              <button 
                type="button" 
                className="btn-danger"
                onClick={() => onDelete(event.id)}
              >
                Delete Event
              </button>
            )}
            <div className="form-actions-right">
              <button type="button" onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EnhancedCalendarPage: React.FC = () => {
  const { state } = useAppContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTruck, setFilterTruck] = useState<string>('all');

  
  const getEventClassNames = (arg: any) => {
    const event = arg.event;
    const extendedProps = event.extendedProps;
    
    const classNames = ['calendar-event'];
    
    
    if (extendedProps.type) {
      classNames.push(`event-type-${extendedProps.type}`);
    }
    
    
    if (extendedProps.status) {
      classNames.push(`event-status-${extendedProps.status}`);
    }
    
    
    if (event.id && event.id.includes('maintenance-')) {
      classNames.push('maintenance-event');
      
      const dueDate = new Date(event.start);
      const today = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0) {
        classNames.push('overdue');
      } else if (daysDiff <= 7) {
        classNames.push('due-soon');
      } else {
        classNames.push('scheduled');
      }
    }
    
    return classNames;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trucksData, eventsData, maintenanceData] = await Promise.all([
  Promise.resolve((state.trucks || []).map((truck: TruckData) => ({
          ...truck,
          userId: state.currentUser?.id || ''
        }))),
        loadCalendarEvents(),
        Promise.resolve(state.maintenance || [])
      ]);
      
      setTrucks(trucksData || []);
      
      
      const maintenance = maintenanceData || [];
      const maintenanceEvents: CalendarEvent[] = maintenance.map((m: any) => ({
        id: `maintenance-${m.id}`,
        title: `${m.type} - ${m.truckId}`,
        start: new Date(m.scheduledDate),
        description: m.description,
        type: 'maintenance',
        truckId: m.truckId,
        truckName: trucks.find(t => t.id === m.truckId)?.licensePlate || m.truckId,
        priority: m.urgency === 'high' ? 'high' : 'medium',
        status: m.completed ? 'completed' : 'scheduled',
        cost: m.estimatedCost
      }));
      
      setEvents([...eventsData, ...maintenanceEvents]);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      notificationService.addNotification({
        type: 'alert',
        title: 'Load Error',
        message: 'Failed to load calendar data',
        priority: 'medium',
        actionRequired: false
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async (): Promise<CalendarEvent[]> => {
    const saved = localStorage.getItem('calendarEvents');
    if (saved) {
      return JSON.parse(saved).map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : undefined,
        recurring: event.recurring ? {
          ...event.recurring,
          endDate: event.recurring.endDate ? new Date(event.recurring.endDate) : undefined
        } : undefined
      }));
    }
    return [];
  };

  const saveCalendarEvents = (events: CalendarEvent[]) => {
    const eventsToSave = events.filter(e => !e.id.startsWith('maintenance-'));
    localStorage.setItem('calendarEvents', JSON.stringify(eventsToSave));
  };

  const generateRecurringEvents = (baseEvent: CalendarEvent): CalendarEvent[] => {
    if (!baseEvent.recurring) return [baseEvent];

    const events: CalendarEvent[] = [baseEvent];
    const { type, interval, endDate } = baseEvent.recurring;
    const maxEvents = 100; 
    
    let currentDate = new Date(baseEvent.start);
    let eventCount = 0;
    
    while (eventCount < maxEvents) {
      
      const nextDate = new Date(currentDate);
      
      switch (type) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + interval);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + (interval * 7));
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + interval);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + interval);
          break;
      }
      
      
      if (endDate && nextDate > endDate) break;
      
      
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      if (nextDate > twoYearsFromNow) break;
      
      
      const recurringEvent: CalendarEvent = {
        ...baseEvent,
        id: `${baseEvent.id}-recurring-${eventCount + 1}`,
        start: nextDate,
        end: baseEvent.end ? new Date(nextDate.getTime() + (baseEvent.end.getTime() - baseEvent.start.getTime())) : undefined,
      };
      
      events.push(recurringEvent);
      currentDate = nextDate;
      eventCount++;
    }
    
    return events;
  };

  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    if (editingEvent) {
      
      const updatedEvents = events.filter(e => !e.id.startsWith(editingEvent.id.split('-recurring-')[0]));
      const eventsToAdd = eventData.recurring ? generateRecurringEvents(newEvent) : [newEvent];
      const finalEvents = [...updatedEvents, ...eventsToAdd];
      
      setEvents(finalEvents);
      saveCalendarEvents(finalEvents);
      
      notificationService.addNotification({
        type: 'info',
        title: 'Event Updated',
        message: `${newEvent.title} has been updated`,
        priority: 'low',
        actionRequired: false
      });
    } else {
      
      const eventsToAdd = eventData.recurring ? generateRecurringEvents(newEvent) : [newEvent];
      const finalEvents = [...events, ...eventsToAdd];
      
      setEvents(finalEvents);
      saveCalendarEvents(finalEvents);
      
      notificationService.addNotification({
        type: 'info',
        title: 'Event Created',
        message: `${newEvent.title} has been scheduled`,
        priority: 'low',
        actionRequired: false
      });
    }
    
    setShowEventForm(false);
    setEditingEvent(undefined);
    setSelectedDate(undefined);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      
      const baseId = eventId.split('-recurring-')[0];
      const updatedEvents = events.filter(e => !e.id.startsWith(baseId));
      
      setEvents(updatedEvents);
      saveCalendarEvents(updatedEvents);
      
      notificationService.addNotification({
        type: 'info',
        title: 'Event Deleted',
        message: 'Event has been removed from calendar',
        priority: 'low',
        actionRequired: false
      });
      
      setShowEventForm(false);
      setEditingEvent(undefined);
    }
  };

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.start);
    setShowEventForm(true);
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setEditingEvent(event);
      setShowEventForm(true);
    }
  }, [events]);

  const handleEventDrop = useCallback(async (dropInfo: EventDropArg) => {
    const eventId = dropInfo.event.id;
    const newStartDate = dropInfo.event.start!;
    
    
    const updatedEvents = events.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            start: newStartDate,
            end: dropInfo.event.end || undefined
          }
        : event
    );
    
    setEvents(updatedEvents);
    saveCalendarEvents(updatedEvents);
    
    
    if (eventId.startsWith('maintenance-')) {
      try {
        const maintenanceId = eventId.replace('maintenance-', '');
        await userDataService.updateMaintenance(maintenanceId, {
          scheduledDate: newStartDate
        });
        
        notificationService.addNotification({
          type: 'info',
          title: 'Maintenance Rescheduled',
          message: `${dropInfo.event.title} has been rescheduled to ${newStartDate.toLocaleDateString()}`,
          priority: 'low',
          actionRequired: false
        });
      } catch (error) {
        console.error('Error updating maintenance date:', error);
        
        
        setEvents(events);
        
        notificationService.addNotification({
          type: 'alert',
          title: 'Update Failed',
          message: 'Failed to update maintenance schedule. Please try again.',
          priority: 'medium',
          actionRequired: false
        });
      }
    } else {
      notificationService.addNotification({
        type: 'info',
        title: 'Event Moved',
        message: `${dropInfo.event.title} has been rescheduled`,
        priority: 'low',
        actionRequired: false
      });
    }
  }, [events]);

  const handleEventResize = useCallback(async (resizeInfo: EventResizeDoneArg) => {
    const eventId = resizeInfo.event.id;
    const newStartDate = resizeInfo.event.start!;
    const newEndDate = resizeInfo.event.end;
    
    
    const updatedEvents = events.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            start: newStartDate,
            end: newEndDate || undefined
          }
        : event
    );
    
    setEvents(updatedEvents);
    saveCalendarEvents(updatedEvents);
    
    
    if (eventId.startsWith('maintenance-')) {
      try {
        const maintenanceId = eventId.replace('maintenance-', '');
        await userDataService.updateMaintenance(maintenanceId, {
          scheduledDate: newStartDate
        });
        
        notificationService.addNotification({
          type: 'info',
          title: 'Maintenance Updated',
          message: `${resizeInfo.event.title} duration has been updated`,
          priority: 'low',
          actionRequired: false
        });
      } catch (error) {
        console.error('Error updating maintenance date:', error);
        
        
        setEvents(events);
        
        notificationService.addNotification({
          type: 'alert',
          title: 'Update Failed',
          message: 'Failed to update maintenance schedule. Please try again.',
          priority: 'medium',
          actionRequired: false
        });
      }
    }
  }, [events]);

  
  const handleExportCalendar = () => {
    const icsContent = generateICSCalendar(filteredEvents);
    downloadICSFile(icsContent, `fleetfix-calendar-${new Date().toISOString().split('T')[0]}.ics`);
    
    notificationService.addNotification({
      type: 'info',
      title: 'Calendar Exported',
      message: 'Calendar events have been exported to ICS file',
      priority: 'low',
      actionRequired: false
    });
  };

  const generateICSCalendar = (events: CalendarEvent[]): string => {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:FleetFix Fleet Management',
      'X-WR-CALDESC:Fleet maintenance and operations calendar',
      'X-WR-TIMEZONE:UTC'
    ];

    events.forEach(event => {
      const startDate = formatDate(event.start);
      const endDate = event.end ? formatDate(event.end) : formatDate(new Date(event.start.getTime() + 60 * 60 * 1000)); 
      const uid = `${event.id}@fleetfix.com`;
      const dtstamp = formatDate(new Date());

      let description = [];
      if (event.description) description.push(event.description);
      if (event.truckName) description.push(`Truck: ${event.truckName}`);
      if (event.assignedTo) description.push(`Assigned to: ${event.assignedTo}`);
      if (event.location) description.push(`Location: ${event.location}`);
      if (event.cost) description.push(`Estimated cost: $${event.cost}`);
      description.push(`Priority: ${event.priority}`);
      description.push(`Status: ${event.status}`);

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${escapeText(description.join('\\n'))}`,
        `CATEGORIES:${event.type.toUpperCase()}`,
        `PRIORITY:${event.priority === 'urgent' ? '1' : event.priority === 'high' ? '3' : event.priority === 'medium' ? '5' : '7'}`,
        `STATUS:${event.status === 'completed' ? 'CONFIRMED' : event.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
        event.location ? `LOCATION:${escapeText(event.location)}` : '',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');
    return icsContent.filter(line => line !== '').join('\r\n');
  };

  const downloadICSFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getEventColor = (event: CalendarEvent): string => {
    const typeColors = {
      maintenance: '#3b82f6',
      inspection: '#10b981',
      repair: '#ef4444',
      delivery: '#8b5cf6',
      other: '#6b7280'
    };
    
    const priorityColors = {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#0891b2',
      low: '#059669'
    };
    
    
    if (event.priority === 'urgent') {
      return priorityColors.urgent;
    }
    
    return typeColors[event.type] || typeColors.other;
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const typeMatch = filterType === 'all' || event.type === filterType;
      const truckMatch = filterTruck === 'all' || event.truckId === filterTruck;
      return typeMatch && truckMatch;
    });
  }, [events, filterType, filterTruck]);

  const calendarEvents = filteredEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: getEventColor(event),
    borderColor: getEventColor(event),
    textColor: '#ffffff',
    extendedProps: {
      description: event.description,
      type: event.type,
      priority: event.priority,
      status: event.status,
      truckName: event.truckName,
      assignedTo: event.assignedTo,
      location: event.location,
      cost: event.cost
    }
  }));

  if (loading) {
    return <div className="loading-spinner">Loading calendar...</div>;
  }

  return (
    <div className="enhanced-calendar-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Fleet Calendar</h1>
          <p>Schedule and track fleet events with drag & drop</p>
        </div>
        <div className="calendar-controls">
          <div className="filter-group">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="maintenance">Maintenance</option>
              <option value="inspection">Inspection</option>
              <option value="repair">Repair</option>
              <option value="delivery">Delivery</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="filter-group">
            <select value={filterTruck} onChange={(e) => setFilterTruck(e.target.value)}>
              <option value="all">All Trucks</option>
              {trucks.map(truck => (
                <option key={truck.id} value={truck.id}>
                  {truck.licensePlate}
                </option>
              ))}
            </select>
          </div>
          <div className="export-controls">
            <button 
              className="btn-secondary"
              onClick={handleExportCalendar}
              title="Export calendar to ICS file"
            >
              📅 Export Calendar
            </button>
            <button 
              className="btn-primary"
              onClick={() => setShowEventForm(true)}
            >
              + Add Event
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
          Maintenance
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
          Inspection
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
          Repair
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></span>
          Delivery
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#6b7280' }}></span>
          Other
        </div>
      </div>

      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView={currentView}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={calendarEvents}
          eventClassNames={getEventClassNames}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
          eventDisplay="block"
          displayEventTime={true}
          eventTextColor="#ffffff"
          eventMouseEnter={(info: any) => {
            const props = info.event.extendedProps;
            const tooltip = `
              <div class="event-tooltip">
                <strong>${info.event.title}</strong><br/>
                ${props.truckName ? `Truck: ${props.truckName}<br/>` : ''}
                ${props.assignedTo ? `Assigned: ${props.assignedTo}<br/>` : ''}
                ${props.location ? `Location: ${props.location}<br/>` : ''}
                ${props.description ? `${props.description}<br/>` : ''}
                Status: ${props.status}<br/>
                Priority: ${props.priority}
                ${props.cost ? `<br/>Cost: $${props.cost}` : ''}
              </div>
            `;
            
            
            const tooltipEl = document.createElement('div');
            tooltipEl.innerHTML = tooltip;
            tooltipEl.className = 'calendar-tooltip';
            tooltipEl.style.cssText = `
              position: absolute;
              background: #333;
              color: white;
              padding: 8px;
              border-radius: 4px;
              font-size: 12px;
              z-index: 1000;
              pointer-events: none;
              max-width: 200px;
            `;
            document.body.appendChild(tooltipEl);
            
            const rect = info.el.getBoundingClientRect();
            tooltipEl.style.left = rect.left + 'px';
            tooltipEl.style.top = (rect.bottom + 5) + 'px';
            
            info.el.addEventListener('mouseleave', () => {
              document.body.removeChild(tooltipEl);
            }, { once: true });
          }}
        />
      </div>

      {showEventForm && (
        <EventForm
          event={editingEvent}
          selectedDate={selectedDate}
          trucks={trucks}
          onSave={handleSaveEvent}
          onCancel={() => {
            setShowEventForm(false);
            setEditingEvent(undefined);
            setSelectedDate(undefined);
          }}
          onDelete={editingEvent ? handleDeleteEvent : undefined}
        />
      )}
    </div>
  );
};
