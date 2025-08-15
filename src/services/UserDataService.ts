import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RateLimitService } from './RateLimitService';


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


export interface CompanyData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  ownerId: string; 
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  uid: string; 
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
  intervalValue: number; 
  estimatedCost?: number;
  requiredParts?: string[]; 
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
  maintenanceId?: string; 
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
  category?: string; 
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
  
  public async getUsers(): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  
  public async getCompanies(): Promise<CompanyData[]> {
    try {
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CompanyData[];
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }
  private listeners: Map<string, () => void> = new Map();
  private rateLimitService = new RateLimitService();
  private syncInProgress = false;

  constructor() {
    // Auto-sync offline data when connection is restored
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Connection restored, syncing offline data...');
        this.syncOfflineDataToFirestore().catch(console.error);
      });

      // Also try to sync on page load
      this.syncOfflineDataToFirestore().catch(console.error);

      // Periodic sync every 5 minutes when online
      setInterval(() => {
        if (navigator.onLine) {
          this.syncOfflineDataToFirestore().catch(console.error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Sync before page unload
      window.addEventListener('beforeunload', () => {
        if (navigator.onLine) {
          // Use sendBeacon for reliable data sending during page unload
          const collections = ['trucks', 'maintenance', 'parts', 'suppliers', 'purchaseOrders'];
          for (const collection of collections) {
            const offlineData = localStorage.getItem(`offline_${collection}`);
            if (offlineData && JSON.parse(offlineData).length > 0) {
              console.log(`Attempting to sync ${collection} data before page unload`);
              // Note: sendBeacon has size limits, but this is better than nothing
              navigator.sendBeacon('/api/sync', JSON.stringify({ collection, data: offlineData }));
            }
          }
        }
      });
    }
  }

  
  async syncOfflineDataToFirestore(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;
    
    try {
      console.log('Starting offline data sync to Firestore...');
      
      const collections = ['trucks', 'maintenance', 'parts', 'suppliers', 'purchaseOrders'];
      
      for (const collectionName of collections) {
        await this.syncOfflineCollection(collectionName);
      }
      
      console.log('Offline data sync completed successfully');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOfflineCollection(collectionName: string): Promise<void> {
    const storageKey = `offline_${collectionName}`;
    const offlineData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (offlineData.length === 0) {
      return;
    }

    console.log(`Syncing ${offlineData.length} offline ${collectionName} records...`);
    
    const batch = writeBatch(db);
    const syncedIds: string[] = [];

    for (const record of offlineData) {
      try {
        // Create new document if it has offline ID, otherwise update existing
        if (record.id.startsWith('offline_')) {
          // Create new document with server-generated ID
          const docRef = doc(collection(db, collectionName));
          batch.set(docRef, {
            ...record,
            id: docRef.id, // Use Firestore-generated ID
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          syncedIds.push(record.id);
        } else {
          // Update existing document
          const docRef = doc(db, collectionName, record.id);
          batch.set(docRef, {
            ...record,
            updatedAt: serverTimestamp()
          }, { merge: true });
          syncedIds.push(record.id);
        }
      } catch (error) {
        console.error(`Error preparing sync for ${collectionName} record ${record.id}:`, error);
      }
    }

    if (syncedIds.length > 0) {
      try {
        await batch.commit();
        
        // Remove synced records from offline storage
        const remainingOfflineData = offlineData.filter((record: any) => 
          !syncedIds.includes(record.id)
        );
        localStorage.setItem(storageKey, JSON.stringify(remainingOfflineData));
        
        console.log(`Successfully synced ${syncedIds.length} ${collectionName} records to Firestore`);
      } catch (error) {
        console.error(`Error committing ${collectionName} sync batch:`, error);
      }
    }
  }

  
  async initializeUserData(userId: string): Promise<void> {
    try {
      console.log('Initializing user data for:', userId);
      
      // Load all user data and merge with offline data
      const [trucks, maintenance, parts, suppliers, purchaseOrders] = await Promise.all([
        this.loadAndMergeData<TruckData>('trucks', userId),
        this.loadAndMergeData<MaintenanceData>('maintenance', userId),
        this.loadAndMergeData<PartData>('parts', userId),
        this.loadAndMergeData<SupplierData>('suppliers', userId),
        this.loadAndMergeData<PurchaseOrder>('purchaseOrders', userId)
      ]);

      // Save merged data back to localStorage for persistence
      localStorage.setItem(`user_data_${userId}`, JSON.stringify({
        trucks,
        maintenance, 
        parts,
        suppliers,
        purchaseOrders,
        lastUpdated: new Date().toISOString()
      }));

      console.log('User data initialization completed');
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  }

  private async loadAndMergeData<T extends { id: string; userId: string; updatedAt: Date }>(
    collectionName: string, 
    userId: string
  ): Promise<T[]> {
    try {
      // Get data from Firestore
      const firestoreData = await this.getUserDocuments<T>(collectionName, userId);
      
      // Get offline data
      const offlineData = this.getOfflineDocuments<T>(collectionName, userId);
      
      // Merge data, prioritizing more recent updates
      const mergedData = new Map<string, T>();
      
      // Add Firestore data first
      firestoreData.forEach(item => {
        mergedData.set(item.id, item);
      });
      
      // Add/update with offline data if it's newer
      offlineData.forEach(item => {
        const existing = mergedData.get(item.id);
        if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
          mergedData.set(item.id, item);
        }
      });
      
      return Array.from(mergedData.values());
    } catch (error) {
      console.error(`Error loading and merging ${collectionName} data:`, error);
      return this.getOfflineDocuments<T>(collectionName, userId);
    }
  }

  
  private async rateLimitedOperation<T>(operation: string, userId: string, fn: () => Promise<T>): Promise<T> {
    const endpoint = `/api/${operation}`;
    const rateLimitResult = this.rateLimitService.checkRateLimit(endpoint, { 
      userId, 
      operation,
      timestamp: Date.now(),
      ip: 'localhost' 
    });
    
    if (!rateLimitResult.allowed) {
      throw new Error(`Rate limit exceeded for ${operation}. Try again in ${Math.ceil(rateLimitResult.retryAfter! / 1000)} seconds.`);
    }
    
    return await fn();
  }

  
  private async createDocument<T>(collectionName: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }) {
    try {
      console.log(`Attempting to create ${collectionName} document in Firestore...`);
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore operation timeout')), 10000)
      );
      
      const firestorePromise = addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const docRef = await Promise.race([firestorePromise, timeoutPromise]) as any;
      console.log(`Successfully created ${collectionName} document in Firestore:`, docRef.id);
      
      // Also save to persisted user data for immediate availability
      this.saveToPersistedUserData(collectionName, data.userId, {
        ...data,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
      
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${collectionName} document:`, error);
      
      // Fallback to offline storage
      console.log(`Falling back to offline storage for ${collectionName}`);
      return this.createOfflineDocument(collectionName, data);
    }
  }

  private createOfflineDocument<T>(collectionName: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }): string {
    console.log(`Creating offline document in ${collectionName}:`, data);
    const storageKey = `offline_${collectionName}`;
    const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const newDocument = {
      ...data,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    existingData.push(newDocument);
    localStorage.setItem(storageKey, JSON.stringify(existingData));
    
    // Also save to persisted user data
    this.saveToPersistedUserData(collectionName, data.userId, newDocument as any);
    
    console.log(`Document created offline in ${collectionName}:`, newDocument.id);
    console.log(`Total offline documents in ${collectionName}:`, existingData.length);
    return newDocument.id;
  }

  private async updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
    try {
      console.log(`Updating ${collectionName} document in Firestore:`, id);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore update timeout')), 10000)
      );
      
      const firestorePromise = updateDoc(doc(db, collectionName, id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      await Promise.race([firestorePromise, timeoutPromise]);
      console.log(`Successfully updated ${collectionName} document in Firestore:`, id);
      
      // Also update in persisted user data if we can determine the userId
      const userId = (data as any).userId;
      if (userId) {
        this.updateInPersistedUserData(collectionName, userId, id, {
          ...data,
          updatedAt: new Date()
        });
      }
      
    } catch (error) {
      console.error(`Error updating ${collectionName} document:`, error);
      
      // Fallback to offline storage
      console.log(`Falling back to offline storage for updating ${collectionName}`);
      this.updateOfflineDocument(collectionName, id, data);
    }
  }

  private updateOfflineDocument<T>(collectionName: string, id: string, data: Partial<T>) {
    const storageKey = `offline_${collectionName}`;
    const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const updatedData = existingData.map((doc: any) => {
      if (doc.id === id) {
        return {
          ...doc,
          ...data,
          updatedAt: new Date()
        };
      }
      return doc;
    });
    
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    
    // Also update in persisted user data if we can determine the userId
    const userId = (data as any).userId || existingData.find((doc: any) => doc.id === id)?.userId;
    if (userId) {
      this.updateInPersistedUserData(collectionName, userId, id, {
        ...data,
        updatedAt: new Date()
      });
    }
    
    console.log(`Document updated offline in ${collectionName}:`, id);
  }

  private saveToPersistedUserData<T>(collectionName: string, userId: string, document: T): void {
    try {
      const storageKey = `user_data_${userId}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (!existingData[collectionName]) {
        existingData[collectionName] = [];
      }
      
      // Add or update the document
      const existingIndex = existingData[collectionName].findIndex((doc: any) => doc.id === (document as any).id);
      if (existingIndex >= 0) {
        existingData[collectionName][existingIndex] = document;
      } else {
        existingData[collectionName].push(document);
      }
      
      existingData.lastUpdated = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(existingData));
      
      console.log(`Saved ${collectionName} document to persisted user data for user ${userId}`);
    } catch (error) {
      console.error('Error saving to persisted user data:', error);
    }
  }

  private updateInPersistedUserData<T>(collectionName: string, userId: string, documentId: string, updates: Partial<T>): void {
    try {
      const storageKey = `user_data_${userId}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (existingData[collectionName]) {
        const documentIndex = existingData[collectionName].findIndex((doc: any) => doc.id === documentId);
        if (documentIndex >= 0) {
          existingData[collectionName][documentIndex] = {
            ...existingData[collectionName][documentIndex],
            ...updates
          };
          
          existingData.lastUpdated = new Date().toISOString();
          localStorage.setItem(storageKey, JSON.stringify(existingData));
          
          console.log(`Updated ${collectionName} document in persisted user data for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error updating persisted user data:', error);
    }
  }

  private async deleteDocument(collectionName: string, id: string) {
    try {
      console.log(`Deleting ${collectionName} document from Firestore:`, id);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore delete timeout')), 10000)
      );
      
      const firestorePromise = deleteDoc(doc(db, collectionName, id));
      
      await Promise.race([firestorePromise, timeoutPromise]);
      console.log(`Successfully deleted ${collectionName} document from Firestore:`, id);
      
      // Also remove from persisted user data - we need to find the userId first
      this.removeFromPersistedUserData(collectionName, id);
      
    } catch (error) {
      console.error(`Error deleting ${collectionName} document:`, error);
      
      // Fallback to offline storage
      console.log(`Falling back to offline storage for deleting ${collectionName}`);
      this.deleteOfflineDocument(collectionName, id);
    }
  }

  private deleteOfflineDocument(collectionName: string, id: string) {
    const storageKey = `offline_${collectionName}`;
    const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const filteredData = existingData.filter((doc: any) => doc.id !== id);
    
    localStorage.setItem(storageKey, JSON.stringify(filteredData));
    
    // Also remove from persisted user data
    this.removeFromPersistedUserData(collectionName, id);
    
    console.log(`Document deleted offline in ${collectionName}:`, id);
  }

  private removeFromPersistedUserData(collectionName: string, documentId: string): void {
    try {
      // We need to check all user data storage to find and remove this document
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('user_data_'));
      
      for (const key of allKeys) {
        const userData = JSON.parse(localStorage.getItem(key) || '{}');
        if (userData[collectionName]) {
          const originalLength = userData[collectionName].length;
          userData[collectionName] = userData[collectionName].filter((doc: any) => doc.id !== documentId);
          
          if (userData[collectionName].length !== originalLength) {
            userData.lastUpdated = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(userData));
            console.log(`Removed ${collectionName} document from persisted user data: ${key}`);
            break; // Document should only exist in one user's data
          }
        }
      }
    } catch (error) {
      console.error('Error removing from persisted user data:', error);
    }
  }

  private async getUserDocuments<T extends { id: string; userId: string; updatedAt: Date }>(collectionName: string, userId: string): Promise<T[]> {
    // Always try to get cached data first for immediate UI response
    console.log(`Loading ${collectionName} documents for user:`, userId);
    const cachedData = this.getPersistedUserDocuments<T>(collectionName, userId);
    
    // If we have cached data, return it immediately and sync in background
    if (cachedData.length > 0) {
      console.log(`Found ${cachedData.length} cached ${collectionName} documents, returning immediately`);
      
      // Start background sync with reduced timeout (3 seconds instead of 10)
      this.syncFirestoreInBackground(collectionName, userId, cachedData);
      
      return cachedData;
    }
    
    // If no cached data, try Firestore with reduced timeout
    try {
      console.log(`No cached data for ${collectionName}, fetching from Firestore...`);
      
      // Reduced timeout to 3 seconds for faster fallback
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore query timeout')), 3000)
      );
      
      const firestorePromise = getDocs(query(
        collection(db, collectionName), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      ));
      
      const querySnapshot = await Promise.race([firestorePromise, timeoutPromise]) as any;
      const documents = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      })) as T[];
      
      console.log(`Successfully fetched ${documents.length} ${collectionName} documents from Firestore`);
      
      // Cache the fresh data
      this.cacheFirestoreData(collectionName, userId, documents);
      
      return documents;
    } catch (error) {
      console.error(`Error fetching ${collectionName} documents:`, error);
      
      // Return any available cached data even if it's empty
      console.log(`Falling back to any available cached data for ${collectionName}`);
      return cachedData;
    }
  }

  private async syncFirestoreInBackground<T extends { id: string; updatedAt: Date }>(collectionName: string, userId: string, cachedData: T[]): Promise<void> {
    try {
      // Background sync with longer timeout since it's not blocking UI
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Background Firestore sync timeout')), 8000)
      );
      
      const firestorePromise = getDocs(query(
        collection(db, collectionName), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      ));
      
      const querySnapshot = await Promise.race([firestorePromise, timeoutPromise]) as any;
      const freshData = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      })) as T[];
      
      // Only update cache if we got fresher data
      if (freshData.length > 0) {
        const hasNewerData = this.hasNewerData(freshData, cachedData);
        if (hasNewerData) {
          console.log(`Background sync found newer ${collectionName} data, updating cache`);
          this.cacheFirestoreData(collectionName, userId, freshData);
        }
      }
    } catch (error) {
      console.log(`Background sync failed for ${collectionName}, continuing with cached data:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private hasNewerData<T extends { id: string; updatedAt: Date }>(freshData: T[], cachedData: T[]): boolean {
    if (freshData.length !== cachedData.length) return true;
    
    // Check if any item has a newer update timestamp
    for (const freshItem of freshData) {
      const cachedItem = cachedData.find((item: T) => item.id === freshItem.id);
      if (!cachedItem || new Date(freshItem.updatedAt) > new Date(cachedItem.updatedAt)) {
        return true;
      }
    }
    return false;
  }

  private cacheFirestoreData<T>(collectionName: string, userId: string, documents: T[]): void {
    try {
      const storageKey = `user_data_${userId}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      existingData[collectionName] = documents;
      existingData.lastUpdated = new Date().toISOString();
      
      localStorage.setItem(storageKey, JSON.stringify(existingData));
      console.log(`Cached ${documents.length} ${collectionName} documents for user ${userId}`);
    } catch (error) {
      console.error('Error caching Firestore data:', error);
    }
  }

  private getPersistedUserDocuments<T>(collectionName: string, userId: string): T[] {
    // First try to get from consolidated user data
    const persistedUserData = localStorage.getItem(`user_data_${userId}`);
    if (persistedUserData) {
      try {
        const userData = JSON.parse(persistedUserData);
        const collectionData = userData[collectionName] || [];
        if (collectionData.length > 0) {
          console.log(`Retrieved ${collectionData.length} ${collectionName} documents from persisted user data`);
          return collectionData.map((doc: any) => ({
            ...doc,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt)
          })) as T[];
        }
      } catch (error) {
        console.error('Error parsing persisted user data:', error);
      }
    }

    // Fallback to individual offline storage
    return this.getOfflineDocuments<T>(collectionName, userId);
  }

  private getOfflineDocuments<T>(collectionName: string, userId: string): T[] {
    const storageKey = `offline_${collectionName}`;
    const offlineData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    console.log(`Retrieved ${offlineData.length} offline documents from ${collectionName}`);
    
    // Filter by userId and sort by createdAt descending
    const filtered = offlineData
      .filter((doc: any) => doc.userId === userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((doc: any) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      })) as T[];
    
    console.log(`Filtered to ${filtered.length} documents for user ${userId}`);
    return filtered;
  }

  
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

  
  async createTruck(userId: string, truckData: Omit<TruckData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.rateLimitedOperation('createTruck', userId, () => 
      this.createDocument<TruckData>('trucks', { ...truckData, userId })
    );
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

  
  async createMaintenance(userId: string, maintenanceData: Omit<MaintenanceData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.rateLimitedOperation('createMaintenance', userId, () => 
      this.createDocument<MaintenanceData>('maintenance', { ...maintenanceData, userId })
    );
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

  
  async createPart(userId: string, partData: Omit<PartData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.rateLimitedOperation('createPart', userId, () => 
      this.createDocument<PartData>('parts', { ...partData, userId })
    );
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

  
  async createSupplier(userId: string, supplierData: Omit<SupplierData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    return this.rateLimitedOperation('createSupplier', userId, () => 
      this.createDocument<SupplierData>('suppliers', { ...supplierData, userId })
    );
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

  // Synchronous method to get cached suppliers immediately
  getCachedSuppliers(userId: string): SupplierData[] {
    const cached = this.getPersistedUserDocuments<SupplierData>('suppliers', userId);
    console.log(`getCachedSuppliers: Found ${cached.length} suppliers for user ${userId}`);
    return cached;
  }

  // Method to force cache sync for both suppliers and purchase orders
  syncSuppliersAndPurchaseOrdersCache(userId: string, suppliers: SupplierData[], purchaseOrders: PurchaseOrder[]): void {
    try {
      const storageKey = `user_data_${userId}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      existingData.suppliers = suppliers;
      existingData.purchaseOrders = purchaseOrders;
      existingData.lastUpdated = new Date().toISOString();
      
      localStorage.setItem(storageKey, JSON.stringify(existingData));
      console.log(`Synced cache: ${suppliers.length} suppliers and ${purchaseOrders.length} purchase orders for user ${userId}`);
    } catch (error) {
      console.error('Error syncing suppliers and purchase orders cache:', error);
    }
  }

  subscribeToSuppliers(userId: string, callback: (suppliers: SupplierData[]) => void) {
    return this.subscribeToUserData<SupplierData>('suppliers', userId, callback);
  }

  
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

  // Synchronous method to get cached purchase orders immediately
  getCachedPurchaseOrders(userId: string): PurchaseOrder[] {
    const cached = this.getPersistedUserDocuments<PurchaseOrder>('purchaseOrders', userId);
    console.log(`getCachedPurchaseOrders: Found ${cached.length} purchase orders for user ${userId}`);
    return cached;
  }

  subscribeToPurchaseOrders(userId: string, callback: (orders: PurchaseOrder[]) => void) {
    return this.subscribeToUserData<PurchaseOrder>('purchaseOrders', userId, callback);
  }

  
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

  
  async syncAllUserData(userId: string, data: {
    trucks?: TruckData[];
    maintenance?: MaintenanceData[];
    parts?: PartData[];
    suppliers?: SupplierData[];
    purchaseOrders?: PurchaseOrder[];
  }) {
    const batch = writeBatch(db);

    try {
      
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

      
      if (data.suppliers) {
        for (const supplier of data.suppliers) {
          const docRef = doc(db, 'suppliers', supplier.id);
          batch.set(docRef, {
            ...supplier,
            userId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      
      if (data.purchaseOrders) {
        for (const purchaseOrder of data.purchaseOrders) {
          const docRef = doc(db, 'purchaseOrders', purchaseOrder.id);
          batch.set(docRef, {
            ...purchaseOrder,
            userId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }

      await batch.commit();
      console.log('Successfully synced all user data to Firestore');
    } catch (error) {
      console.error('Error syncing user data:', error);
      throw error;
    }
  }

  
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

  
  async generateMaintenanceFromTemplates(userId: string) {
    try {
      const trucks = await this.getTrucks(userId);
      const templates = await this.getMaintenanceTemplates(userId);
      const existingMaintenance = await this.getMaintenance(userId);
      
      const newMaintenanceItems: Omit<MaintenanceData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [];
      
      for (const truck of trucks) {
        for (const template of templates.filter(t => t.isActive)) {
          
          const hasScheduled = existingMaintenance.some(m => 
            m.truckId === truck.id && 
            m.description.includes(template.name) && 
            m.status === 'scheduled'
          );
          
          if (!hasScheduled) {
            let shouldSchedule = false;
            let scheduledDate = new Date();
            
            if (template.intervalType === 'mileage') {
              
              const lastMaintenanceForTemplate = existingMaintenance
                .filter(m => m.truckId === truck.id && m.description.includes(template.name))
                .sort((a, b) => new Date(b.completedDate || b.scheduledDate).getTime() - new Date(a.completedDate || a.scheduledDate).getTime())[0];
              
              const milesSinceLastMaintenance = lastMaintenanceForTemplate 
                ? truck.mileage - (lastMaintenanceForTemplate.notes ? parseInt(lastMaintenanceForTemplate.notes) || 0 : 0)
                : truck.mileage;
              
              if (milesSinceLastMaintenance >= template.intervalValue) {
                shouldSchedule = true;
                scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
              }
            } else if (template.intervalType === 'time') {
              
              const lastMaintenanceForTemplate = existingMaintenance
                .filter(m => m.truckId === truck.id && m.description.includes(template.name))
                .sort((a, b) => new Date(b.completedDate || b.scheduledDate).getTime() - new Date(a.completedDate || a.scheduledDate).getTime())[0];
              
              const daysSinceLastMaintenance = lastMaintenanceForTemplate
                ? (Date.now() - new Date(lastMaintenanceForTemplate.completedDate || lastMaintenanceForTemplate.scheduledDate).getTime()) / (24 * 60 * 60 * 1000)
                : 365; 
              
              if (daysSinceLastMaintenance >= template.intervalValue) {
                shouldSchedule = true;
                scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
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
      
      
      const promises = newMaintenanceItems.map(item => this.createMaintenance(userId, item));
      await Promise.all(promises);
      
      return newMaintenanceItems.length;
    } catch (error) {
      console.error('Error generating maintenance from templates:', error);
      throw error;
    }
  }

  
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

  
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

export const userDataService = new UserDataService();
export default userDataService;
