// Note: Truck, MaintenanceEntry, Part are kept for future expansion of notification types

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
    start: string; 
    end: string;   
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
    
    // Create test notifications in development mode
    if (process.env.NODE_ENV === 'development') {
      // Delay to ensure the component is mounted
      setTimeout(() => {
        this.createTestNotifications();
      }, 2000);
    }
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
      
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private startMonitoring(): void {
    
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
        const maintenanceInterval = 5000; 
        
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
    // Get parts from localStorage (will be updated later to use AppContext)
    const parts = JSON.parse(localStorage.getItem('fleetfix_app_state') || '{}').parts || [];
    
    parts.forEach((part: any) => {
      const currentStock = part.inventoryLevel || 0;
      const minStock = part.minStockLevel || 5;
      
      if (currentStock <= minStock) {
        const existingNotification = this.notifications.find(n => 
          n.relatedEntity?.id === part.id && n.type === 'part' && !n.read
        );
        
        if (!existingNotification) {
          const alertType = currentStock === 0 ? 'out_of_stock' : 'low_stock';
          const priority = currentStock === 0 ? 'urgent' : 'high';
          
          this.addNotification({
            type: 'part',
            title: alertType === 'out_of_stock' ? 'Out of Stock Alert' : 'Low Stock Alert',
            message: alertType === 'out_of_stock' 
              ? `${part.name} is out of stock. Immediate reorder required.`
              : `${part.name} is running low - ${currentStock} remaining (minimum: ${minStock})`,
            priority: priority,
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

  public createTestNotifications(): void {
    // Add some test notifications for development
    if (process.env.NODE_ENV === 'development') {
      this.addNotification({
        type: 'part',
        title: 'Low Stock Alert',
        message: 'Brake Pads are running low - 2 remaining (minimum: 10)',
        priority: 'high',
        actionRequired: true,
        relatedEntity: {
          type: 'part',
          id: 'sample-part-1',
          name: 'Brake Pads'
        }
      });

      this.addNotification({
        type: 'part',
        title: 'Out of Stock Alert',
        message: 'Engine Oil Filter is out of stock. Immediate reorder required.',
        priority: 'urgent',
        actionRequired: true,
        relatedEntity: {
          type: 'part',
          id: 'sample-part-2',
          name: 'Engine Oil Filter'
        }
      });

      this.addNotification({
        type: 'maintenance',
        title: 'Maintenance Due',
        message: 'Vehicle ABC-123 is due for scheduled maintenance in 3 days',
        priority: 'medium',
        actionRequired: true,
        relatedEntity: {
          type: 'truck',
          id: 'truck-123',
          name: 'ABC-123'
        }
      });
    }
  }

  public forceCheckAllAlerts(): void {
    this.checkForMaintenanceDue();
    this.checkForLowFuel();
    this.checkForLowParts();
  }

  public checkPartsStock(parts: any[]): void {
    parts.forEach((part: any) => {
      const currentStock = part.inventoryLevel || 0;
      const minStock = part.minStockLevel || 5;
      
      if (currentStock <= minStock) {
        const existingNotification = this.notifications.find(n => 
          n.relatedEntity?.id === part.id && n.type === 'part' && !n.read
        );
        
        if (!existingNotification) {
          const alertType = currentStock === 0 ? 'out_of_stock' : 'low_stock';
          const priority = currentStock === 0 ? 'urgent' : 'high';
          
          this.addNotification({
            type: 'part',
            title: alertType === 'out_of_stock' ? 'Out of Stock Alert' : 'Low Stock Alert',
            message: alertType === 'out_of_stock' 
              ? `${part.name} is out of stock. Immediate reorder required.`
              : `${part.name} is running low - ${currentStock} remaining (minimum: ${minStock})`,
            priority: priority,
            actionRequired: true,
            relatedEntity: {
              type: 'part',
              id: part.id,
              name: part.name
            }
          });
        }
      } else {
        // Clear any existing low stock notifications for this part when stock is sufficient
        const existingNotifications = this.notifications.filter(n => 
          n.relatedEntity?.id === part.id && n.type === 'part' && !n.read
        );
        
        existingNotifications.forEach(notification => {
          this.markAsRead(notification.id);
        });
      }
    });
  }


  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
}


export const notificationService = NotificationService.getInstance();
export type { Notification, NotificationPreferences };
