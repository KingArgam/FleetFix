import { Truck, MaintenanceEntry, Part } from '../types';

interface Notification {
  id: string;
  type: 'maintenance' | 'fuel' | 'part' | 'alert' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  relatedEntity?: {
    type: 'truck' | 'part' | 'maintenance';
    id: string;
    name: string;
  };
}

interface NotificationPreferences {
  push: boolean;
  maintenanceAlerts: boolean;
  fuelAlerts: boolean;
  partAlerts: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

type NotificationListener = (notifications: Notification[]) => void;

class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private listeners: NotificationListener[] = [];
  private preferences: NotificationPreferences;

  private constructor() {
    this.preferences = this.loadPreferences();
    this.loadNotifications();
    this.requestPermission();
    this.startMonitoring();
  }

  private loadPreferences(): NotificationPreferences {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      push: true,
      maintenanceAlerts: true,
      fuelAlerts: true,
      partAlerts: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00'
      }
    };
  }

  private loadNotifications(): void {
    const saved = localStorage.getItem('notifications');
    if (saved) {
      this.notifications = JSON.parse(saved).map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    } else {
      // No notifications if no data in storage
      this.notifications = [];
      this.saveNotifications();
    }
  }

  private saveNotifications(): void {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  private savePreferences(): void {
    localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
  }

  private async requestPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = parseInt(this.preferences.quietHours.start.replace(':', ''));
    const endTime = parseInt(this.preferences.quietHours.end.replace(':', ''));
    
    if (startTime > endTime) {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private startMonitoring(): void {
    // Check for new events every 30 seconds
    setInterval(() => {
      this.checkForMaintenanceDue();
      this.checkForLowFuel();
      this.checkForLowParts();
    }, 30000);
  }

  private checkForMaintenanceDue(): void {
    const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
    trucks.forEach((truck: any) => {
      if (truck.mileage && truck.lastMaintenance) {
        const milesSinceLastMaintenance = truck.mileage - truck.lastMaintenance;
        const maintenanceInterval = 5000; // Every 5000 miles
        
        if (milesSinceLastMaintenance > maintenanceInterval - 500) {
          const existingNotification = this.notifications.find(n => 
            n.relatedEntity?.id === truck.id && n.type === 'maintenance' && !n.read
          );
          
          if (!existingNotification) {
            this.addNotification({
              type: 'maintenance',
              title: 'Maintenance Due Soon',
              message: `${truck.make} ${truck.model} (${truck.id}) needs maintenance in ${maintenanceInterval - milesSinceLastMaintenance} miles`,
              priority: 'high',
              actionRequired: true,
              relatedEntity: {
                type: 'truck',
                id: truck.id,
                name: `${truck.make} ${truck.model}`
              }
            });
          }
        }
      }
    });
  }

  private checkForLowFuel(): void {
    const trucks = JSON.parse(localStorage.getItem('trucks') || '[]');
    const fuelThreshold = JSON.parse(localStorage.getItem('fleetSettings') || '{}').lowFuelThreshold || 20;
    
    trucks.forEach((truck: any) => {
      if (truck.fuelLevel && truck.fuelLevel <= fuelThreshold) {
        const existingNotification = this.notifications.find(n => 
          n.relatedEntity?.id === truck.id && n.type === 'fuel' && !n.read
        );
        
        if (!existingNotification) {
          this.addNotification({
            type: 'fuel',
            title: 'Low Fuel Alert',
            message: `${truck.make} ${truck.model} (${truck.id}) fuel level at ${truck.fuelLevel}%`,
            priority: 'urgent',
            actionRequired: true,
            relatedEntity: {
              type: 'truck',
              id: truck.id,
              name: `${truck.make} ${truck.model}`
            }
          });
        }
      }
    });
  }

  private checkForLowParts(): void {
    const parts = JSON.parse(localStorage.getItem('parts') || '[]');
    
    parts.forEach((part: any) => {
      if (part.quantity && part.quantity <= (part.minQuantity || 5)) {
        const existingNotification = this.notifications.find(n => 
          n.relatedEntity?.id === part.id && n.type === 'part' && !n.read
        );
        
        if (!existingNotification) {
          this.addNotification({
            type: 'part',
            title: 'Low Inventory',
            message: `${part.name} running low - ${part.quantity} remaining`,
            priority: 'medium',
            actionRequired: true,
            relatedEntity: {
              type: 'part',
              id: part.id,
              name: part.name
            }
          });
        }
      }
    });
  }

  public addNotification(data: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
      ...data
    };

    this.notifications.unshift(notification);
    this.saveNotifications();
    this.notifyListeners();
    this.sendNotification(notification);
  }

  private sendNotification(notification: Notification): void {
    if (this.isQuietHours()) {
      console.log('Notification suppressed due to quiet hours:', notification.title);
      return;
    }

    // Browser Push Notification
    if (this.preferences.push && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`FleetFix: ${notification.title}`, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent'
        });
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }

  public getNotifications(): Notification[] {
    return [...this.notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  public markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.notifyListeners();
  }

  public deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifyListeners();
  }

  public clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }

  public updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.savePreferences();
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getNotifications()));
  }

  public formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return timestamp.toLocaleDateString();
  }


  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
}

// Create and export singleton instance
export const notificationService = NotificationService.getInstance();
export type { Notification, NotificationPreferences };
