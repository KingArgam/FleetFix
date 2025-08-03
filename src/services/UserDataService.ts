import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  writeBatch,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types';

// Data types for different collections
export interface TruckData {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  nickname?: string;
  mileage: number;
  status: 'In Service' | 'Out for Repair' | 'Needs Attention' | 'Retired';
  location?: string;
  fuelLevel?: number;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  customFields?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceData {
  id: string;
  userId: string;
  truckId: string;
  type: 'scheduled' | 'emergency' | 'preventive';
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  cost?: number;
  parts?: string[];
  technician?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartData {
  id: string;
  userId: string;
  name: string;
  partNumber: string;
  category: string;
  quantity: number;
  minQuantity: number;
  cost: number;
  supplier?: string;
  location?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  currency: string;
  notifications: {
    email: boolean;
    push: boolean;
    maintenance: boolean;
    lowStock: boolean;
  };
  dashboardLayout: any;
  createdAt: Date;
  updatedAt: Date;
}

// New data models for enhanced features
export interface CompanyData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  ownerId: string; // Admin user who created the company
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  uid: string; // Firebase auth UID
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'viewer' | 'editor' | 'admin';
  companyId?: string;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierData {
  id: string;
  userId: string;
  companyId?: string;
  name: string;
  contactName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  category?: 'parts' | 'service' | 'fuel' | 'tires' | 'other';
  status?: 'active' | 'inactive' | 'suspended';
  paymentTerms?: string;
  defaultLeadTimeDays: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceTemplate {
  id: string;
  userId: string;
  companyId?: string;
  name: string;
  description: string;
  type: 'scheduled' | 'preventive';
  intervalType: 'mileage' | 'time';
  intervalValue: number; // miles or days
  estimatedCost?: number;
  requiredParts?: string[]; // part IDs
  instructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DowntimeEvent {
  id: string;
  userId: string;
  companyId?: string;
  truckId: string;
  startTime: Date;
  endTime?: Date;
  reason: string;
  category: 'maintenance' | 'repair' | 'accident' | 'other';
  maintenanceId?: string; // Link to associated maintenance
  cost?: number;
  notes?: string;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  userId: string;
  companyId?: string;
  supplierId: string;
  orderNumber: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  items: PurchaseOrderItem[];
  totalCost: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  partId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface NotificationData {
  id: string;
  userId: string;
  type: 'maintenance_due' | 'low_stock' | 'downtime_alert' | 'general' | 'maintenance' | 'parts' | 'calendar' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: Date;
}

class UserDataService {
  private listeners: Map<string, () => void> = new Map();

  // Generic CRUD operations
  private async createDocument<T>(collectionName: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${collectionName} document:`, error);
      throw error;
    }
  }

  private async updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating ${collectionName} document:`, error);
      throw error;
    }
  }

  private async deleteDocument(collectionName: string, id: string) {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(`Error deleting ${collectionName} document:`, error);
      throw error;
    }
  }

  private async getUserDocuments<T>(collectionName: string, userId: string): Promise<T[]> {
    try {
      const q = query(
        collection(db, collectionName), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error(`Error fetching ${collectionName} documents:`, error);
      throw error;
    }
  }

  // Real-time listeners
  subscribeToUserData<T>(
    collectionName: string, 
    userId: string, 
    callback: (data: T[]) => void
  ): () => void {
    const q = query(
      collection(db, collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      callback(data);
    }, (error) => {
      console.error(`Error listening to ${collectionName}:`, error);
    });

    return unsubscribe;
  }

  // Truck operations
  async createTruck(userId: string, truckData: Omit<TruckData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<TruckData>('trucks', { ...truckData, userId });
  }

  async updateTruck(id: string, data: Partial<TruckData>) {
    return this.updateDocument<TruckData>('trucks', id, data);
  }

  async deleteTruck(id: string) {
    return this.deleteDocument('trucks', id);
  }

  async getTrucks(userId: string): Promise<TruckData[]> {
    return this.getUserDocuments<TruckData>('trucks', userId);
  }

  subscribeToTrucks(userId: string, callback: (trucks: TruckData[]) => void) {
    return this.subscribeToUserData<TruckData>('trucks', userId, callback);
  }

  // Maintenance operations
  async createMaintenance(userId: string, maintenanceData: Omit<MaintenanceData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<MaintenanceData>('maintenance', { ...maintenanceData, userId });
  }

  async updateMaintenance(id: string, data: Partial<MaintenanceData>) {
    return this.updateDocument<MaintenanceData>('maintenance', id, data);
  }

  async deleteMaintenance(id: string) {
    return this.deleteDocument('maintenance', id);
  }

  async getMaintenance(userId: string): Promise<MaintenanceData[]> {
    return this.getUserDocuments<MaintenanceData>('maintenance', userId);
  }

  subscribeToMaintenance(userId: string, callback: (maintenance: MaintenanceData[]) => void) {
    return this.subscribeToUserData<MaintenanceData>('maintenance', userId, callback);
  }

  // Get maintenance for specific truck
  async getMaintenanceForTruck(userId: string, truckId: string): Promise<MaintenanceData[]> {
    try {
      const q = query(
        collection(db, 'maintenance'),
        where('userId', '==', userId),
        where('truckId', '==', truckId),
        orderBy('scheduledDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MaintenanceData[];
    } catch (error) {
      console.error('Error fetching truck maintenance:', error);
      throw error;
    }
  }

  // Parts operations
  async createPart(userId: string, partData: Omit<PartData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<PartData>('parts', { ...partData, userId });
  }

  async updatePart(id: string, data: Partial<PartData>) {
    return this.updateDocument<PartData>('parts', id, data);
  }

  async deletePart(id: string) {
    return this.deleteDocument('parts', id);
  }

  async getParts(userId: string): Promise<PartData[]> {
    return this.getUserDocuments<PartData>('parts', userId);
  }

  subscribeToParts(userId: string, callback: (parts: PartData[]) => void) {
    return this.subscribeToUserData<PartData>('parts', userId, callback);
  }

  // Supplier operations
  async createSupplier(userId: string, supplierData: Omit<SupplierData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<SupplierData>('suppliers', { ...supplierData, userId });
  }

  async updateSupplier(id: string, data: Partial<SupplierData>) {
    return this.updateDocument<SupplierData>('suppliers', id, data);
  }

  async deleteSupplier(id: string) {
    return this.deleteDocument('suppliers', id);
  }

  async getSuppliers(userId: string): Promise<SupplierData[]> {
    return this.getUserDocuments<SupplierData>('suppliers', userId);
  }

  subscribeToSuppliers(userId: string, callback: (suppliers: SupplierData[]) => void) {
    return this.subscribeToUserData<SupplierData>('suppliers', userId, callback);
  }

  // Maintenance Template operations
  async createMaintenanceTemplate(userId: string, templateData: Omit<MaintenanceTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<MaintenanceTemplate>('maintenanceTemplates', { ...templateData, userId });
  }

  async updateMaintenanceTemplate(id: string, data: Partial<MaintenanceTemplate>) {
    return this.updateDocument<MaintenanceTemplate>('maintenanceTemplates', id, data);
  }

  async deleteMaintenanceTemplate(id: string) {
    return this.deleteDocument('maintenanceTemplates', id);
  }

  async getMaintenanceTemplates(userId: string): Promise<MaintenanceTemplate[]> {
    return this.getUserDocuments<MaintenanceTemplate>('maintenanceTemplates', userId);
  }

  subscribeToMaintenanceTemplates(userId: string, callback: (templates: MaintenanceTemplate[]) => void) {
    return this.subscribeToUserData<MaintenanceTemplate>('maintenanceTemplates', userId, callback);
  }

  // Downtime Event operations
  async createDowntimeEvent(userId: string, downtimeData: Omit<DowntimeEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<DowntimeEvent>('downtimeEvents', { ...downtimeData, userId });
  }

  async updateDowntimeEvent(id: string, data: Partial<DowntimeEvent>) {
    return this.updateDocument<DowntimeEvent>('downtimeEvents', id, data);
  }

  async deleteDowntimeEvent(id: string) {
    return this.deleteDocument('downtimeEvents', id);
  }

  async getDowntimeEvents(userId: string): Promise<DowntimeEvent[]> {
    return this.getUserDocuments<DowntimeEvent>('downtimeEvents', userId);
  }

  subscribeToDowntimeEvents(userId: string, callback: (events: DowntimeEvent[]) => void) {
    return this.subscribeToUserData<DowntimeEvent>('downtimeEvents', userId, callback);
  }

  // Purchase Order operations
  async createPurchaseOrder(userId: string, poData: Omit<PurchaseOrder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<PurchaseOrder>('purchaseOrders', { ...poData, userId });
  }

  async addPurchaseOrder(orderData: PurchaseOrder) {
    return this.createDocument<PurchaseOrder>('purchaseOrders', orderData);
  }

  async updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>) {
    return this.updateDocument<PurchaseOrder>('purchaseOrders', id, data);
  }

  async deletePurchaseOrder(id: string) {
    return this.deleteDocument('purchaseOrders', id);
  }

  async getPurchaseOrders(userId: string): Promise<PurchaseOrder[]> {
    return this.getUserDocuments<PurchaseOrder>('purchaseOrders', userId);
  }

  subscribeToPurchaseOrders(userId: string, callback: (orders: PurchaseOrder[]) => void) {
    return this.subscribeToUserData<PurchaseOrder>('purchaseOrders', userId, callback);
  }

  // Notification operations
  async createNotification(userId: string, notificationData: Omit<NotificationData, 'id' | 'userId' | 'createdAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        userId,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id: string) {
    return this.updateDocument<NotificationData>('notifications', id, { isRead: true });
  }

  async getUnreadNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationData[];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  subscribeToNotifications(userId: string, callback: (notifications: NotificationData[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationData[];
      callback(notifications);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return unsubscribe;
  }

  async deleteNotification(id: string) {
    return this.deleteDocument('notifications', id);
  }

  async getNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationData[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async generateMaintenanceReminders(reminderDays: number = 7) {
    // Mock implementation - in real app this would query maintenance schedules
    return [
      {
        vehicleId: 'truck-001',
        vehicleName: 'Truck #001',
        maintenanceId: 'maint-001',
        maintenanceType: 'Oil Change',
        daysUntilDue: 3
      },
      {
        vehicleId: 'truck-002', 
        vehicleName: 'Truck #002',
        maintenanceId: 'maint-002',
        maintenanceType: 'Brake Inspection',
        daysUntilDue: 1
      }
    ];
  }

  // User Profile operations
  async createUserProfile(profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.createDocument<UserProfile>('userProfiles', { ...profileData, userId: profileData.uid });
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>) {
    try {
      const q = query(collection(db, 'userProfiles'), where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const q = query(collection(db, 'userProfiles'), where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Company operations
  async createCompany(companyData: Omit<CompanyData, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'companies'), {
        ...companyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  async updateCompany(id: string, data: Partial<CompanyData>) {
    return this.updateDocument<CompanyData>('companies', id, data);
  }

  async getCompany(id: string): Promise<CompanyData | null> {
    try {
      const docRef = doc(db, 'companies', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CompanyData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching company:', error);
      throw error;
    }
  }

  // User preferences
  async saveUserPreferences(userId: string, preferences: Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>) {
    try {
      const docRef = doc(db, 'userPreferences', userId);
      await setDoc(docRef, {
        userId,
        ...preferences,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const docRef = doc(db, 'userPreferences', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { ...docSnap.data() } as UserPreferences;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  // Batch operations for data synchronization
  async syncAllUserData(userId: string, data: {
    trucks?: TruckData[];
    maintenance?: MaintenanceData[];
    parts?: PartData[];
  }) {
    const batch = writeBatch(db);

    try {
      // Sync trucks
      if (data.trucks) {
        for (const truck of data.trucks) {
          const docRef = doc(db, 'trucks', truck.id);
          batch.set(docRef, {
            ...truck,
            userId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      // Sync maintenance
      if (data.maintenance) {
        for (const maintenance of data.maintenance) {
          const docRef = doc(db, 'maintenance', maintenance.id);
          batch.set(docRef, {
            ...maintenance,
            userId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      // Sync parts
      if (data.parts) {
        for (const part of data.parts) {
          const docRef = doc(db, 'parts', part.id);
          batch.set(docRef, {
            ...part,
            userId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error syncing user data:', error);
      throw error;
    }
  }

  // Calendar integration - get all maintenance events
  async getCalendarEvents(userId: string): Promise<Array<{
    id: string;
    title: string;
    date: Date;
    type: string;
    truckInfo?: string;
    status: string;
  }>> {
    try {
      const maintenance = await this.getMaintenance(userId);
      const trucks = await this.getTrucks(userId);
      
      const truckMap = trucks.reduce((map, truck) => {
        map[truck.id] = truck;
        return map;
      }, {} as Record<string, TruckData>);

      return maintenance.map(m => ({
        id: m.id,
        title: `${m.type.charAt(0).toUpperCase() + m.type.slice(1)} Maintenance`,
        date: m.scheduledDate,
        type: m.type,
        truckInfo: truckMap[m.truckId] ? `${truckMap[m.truckId].make} ${truckMap[m.truckId].model} (${truckMap[m.truckId].licensePlate})` : 'Unknown Truck',
        status: m.status
      }));
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  // Advanced Analytics
  async getMaintenanceCostAnalysis(userId: string, startDate: Date, endDate: Date) {
    try {
      const q = query(
        collection(db, 'maintenance'),
        where('userId', '==', userId),
        where('completedDate', '>=', startDate),
        where('completedDate', '<=', endDate),
        where('status', '==', 'completed')
      );
      
      const querySnapshot = await getDocs(q);
      const maintenance = querySnapshot.docs.map(doc => doc.data()) as MaintenanceData[];
      
      // Group by month and type
      const costByMonth: Record<string, number> = {};
      const costByType: Record<string, number> = {};
      const costByTruck: Record<string, number> = {};
      
      maintenance.forEach(m => {
        if (m.cost) {
          const month = new Date(m.completedDate!).toISOString().substring(0, 7);
          costByMonth[month] = (costByMonth[month] || 0) + m.cost;
          costByType[m.type] = (costByType[m.type] || 0) + m.cost;
          costByTruck[m.truckId] = (costByTruck[m.truckId] || 0) + m.cost;
        }
      });
      
      return { costByMonth, costByType, costByTruck, totalCost: Object.values(costByMonth).reduce((a, b) => a + b, 0) };
    } catch (error) {
      console.error('Error fetching cost analysis:', error);
      throw error;
    }
  }

  async getFleetUtilizationMetrics(userId: string) {
    try {
      const trucks = await this.getTrucks(userId);
      const downtimeEvents = await this.getDowntimeEvents(userId);
      
      const utilizationByTruck = trucks.map(truck => {
        const truckDowntime = downtimeEvents.filter(d => d.truckId === truck.id);
        const totalDowntimeHours = truckDowntime.reduce((total, event) => {
          if (event.endTime) {
            return total + (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
          }
          return total;
        }, 0);
        
        return {
          truckId: truck.id,
          licensePlate: truck.licensePlate,
          status: truck.status,
          totalDowntimeHours,
          downtimeEvents: truckDowntime.length
        };
      });
      
      return utilizationByTruck;
    } catch (error) {
      console.error('Error fetching utilization metrics:', error);
      throw error;
    }
  }

  async getPartUsageAnalysis(userId: string) {
    try {
      const maintenance = await this.getMaintenance(userId);
      const parts = await this.getParts(userId);
      
      const partUsage: Record<string, { count: number; totalCost: number; partName: string }> = {};
      
      maintenance.forEach(m => {
        if (m.parts && m.cost) {
          m.parts.forEach(partId => {
            const part = parts.find(p => p.id === partId);
            if (part) {
              if (!partUsage[partId]) {
                partUsage[partId] = { count: 0, totalCost: 0, partName: part.name };
              }
              partUsage[partId].count += 1;
              partUsage[partId].totalCost += part.cost;
            }
          });
        }
      });
      
      return Object.entries(partUsage)
        .map(([partId, data]) => ({ partId, ...data }))
        .sort((a: any, b: any) => b.count - a.count);
    } catch (error) {
      console.error('Error fetching part usage analysis:', error);
      throw error;
    }
  }

  async getLowStockParts(userId: string): Promise<PartData[]> {
    try {
      const parts = await this.getParts(userId);
      return parts.filter(part => part.quantity <= part.minQuantity);
    } catch (error) {
      console.error('Error fetching low stock parts:', error);
      throw error;
    }
  }

  async getUpcomingMaintenanceAlerts(userId: string, daysAhead: number = 30): Promise<Array<{
    maintenance: MaintenanceData;
    truck: TruckData;
    daysUntilDue: number;
  }>> {
    try {
      const maintenance = await this.getMaintenance(userId);
      const trucks = await this.getTrucks(userId);
      const now = new Date();
      const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
      
      const upcoming = maintenance
        .filter(m => m.status === 'scheduled' && m.scheduledDate >= now && m.scheduledDate <= futureDate)
        .map(m => {
          const truck = trucks.find(t => t.id === m.truckId);
          const daysUntilDue = Math.ceil((new Date(m.scheduledDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          return { maintenance: m, truck: truck!, daysUntilDue };
        })
        .filter(item => item.truck)
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      
      return upcoming;
    } catch (error) {
      console.error('Error fetching upcoming maintenance alerts:', error);
      throw error;
    }
  }

  // Auto-generate maintenance from templates
  async generateMaintenanceFromTemplates(userId: string) {
    try {
      const trucks = await this.getTrucks(userId);
      const templates = await this.getMaintenanceTemplates(userId);
      const existingMaintenance = await this.getMaintenance(userId);
      
      const newMaintenanceItems: Omit<MaintenanceData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [];
      
      for (const truck of trucks) {
        for (const template of templates.filter(t => t.isActive)) {
          // Check if maintenance already scheduled for this template
          const hasScheduled = existingMaintenance.some(m => 
            m.truckId === truck.id && 
            m.description.includes(template.name) && 
            m.status === 'scheduled'
          );
          
          if (!hasScheduled) {
            let shouldSchedule = false;
            let scheduledDate = new Date();
            
            if (template.intervalType === 'mileage') {
              // Check if truck mileage warrants maintenance
              const lastMaintenanceForTemplate = existingMaintenance
                .filter(m => m.truckId === truck.id && m.description.includes(template.name))
                .sort((a, b) => new Date(b.completedDate || b.scheduledDate).getTime() - new Date(a.completedDate || a.scheduledDate).getTime())[0];
              
              const milesSinceLastMaintenance = lastMaintenanceForTemplate 
                ? truck.mileage - (lastMaintenanceForTemplate.notes ? parseInt(lastMaintenanceForTemplate.notes) || 0 : 0)
                : truck.mileage;
              
              if (milesSinceLastMaintenance >= template.intervalValue) {
                shouldSchedule = true;
                scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Schedule for next week
              }
            } else if (template.intervalType === 'time') {
              // Check if enough time has passed
              const lastMaintenanceForTemplate = existingMaintenance
                .filter(m => m.truckId === truck.id && m.description.includes(template.name))
                .sort((a, b) => new Date(b.completedDate || b.scheduledDate).getTime() - new Date(a.completedDate || a.scheduledDate).getTime())[0];
              
              const daysSinceLastMaintenance = lastMaintenanceForTemplate
                ? (Date.now() - new Date(lastMaintenanceForTemplate.completedDate || lastMaintenanceForTemplate.scheduledDate).getTime()) / (24 * 60 * 60 * 1000)
                : 365; // Assume very old if no maintenance
              
              if (daysSinceLastMaintenance >= template.intervalValue) {
                shouldSchedule = true;
                scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Schedule for next week
              }
            }
            
            if (shouldSchedule) {
              newMaintenanceItems.push({
                truckId: truck.id,
                type: template.type,
                description: `${template.name} - ${template.description}`,
                scheduledDate,
                status: 'scheduled',
                cost: template.estimatedCost,
                parts: template.requiredParts,
                notes: template.instructions
              });
            }
          }
        }
      }
      
      // Create the new maintenance items
      const promises = newMaintenanceItems.map(item => this.createMaintenance(userId, item));
      await Promise.all(promises);
      
      return newMaintenanceItems.length;
    } catch (error) {
      console.error('Error generating maintenance from templates:', error);
      throw error;
    }
  }

  // Import/Export functionality
  async exportDataToCSV(userId: string, dataType: 'trucks' | 'maintenance' | 'parts' | 'suppliers') {
    try {
      let data: any[] = [];
      let headers: string[] = [];
      
      switch (dataType) {
        case 'trucks':
          data = await this.getTrucks(userId);
          headers = ['id', 'make', 'model', 'year', 'licensePlate', 'vin', 'mileage', 'status', 'location', 'fuelLevel'];
          break;
        case 'maintenance':
          data = await this.getMaintenance(userId);
          headers = ['id', 'truckId', 'type', 'description', 'scheduledDate', 'completedDate', 'status', 'cost', 'technician', 'notes'];
          break;
        case 'parts':
          data = await this.getParts(userId);
          headers = ['id', 'name', 'partNumber', 'category', 'quantity', 'minQuantity', 'cost', 'supplier', 'location', 'description'];
          break;
        case 'suppliers':
          data = await this.getSuppliers(userId);
          headers = ['id', 'name', 'contactName', 'email', 'phone', 'address', 'defaultLeadTimeDays', 'notes'];
          break;
      }
      
      const csvContent = [
        headers.join(','),
        ...data.map(item => 
          headers.map(header => {
            const value = item[header];
            // Handle dates and escape commas
            if (value instanceof Date) {
              return value.toISOString();
            }
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');
      
      return csvContent;
    } catch (error) {
      console.error('Error exporting data to CSV:', error);
      throw error;
    }
  }

  // Cleanup listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

export const userDataService = new UserDataService();
export default userDataService;
