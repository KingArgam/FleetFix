
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, auth, storage, isFirebaseConfigured } from '../config/firebase';
import { 
  Truck, 
  MaintenanceEntry, 
  Part, 
  ApiResponse
} from '../types';


export class FirebaseDataService {
  private static instance: FirebaseDataService;
  private unsubscribers: (() => void)[] = [];

  static getInstance(): FirebaseDataService {
    if (!FirebaseDataService.instance) {
      FirebaseDataService.instance = new FirebaseDataService();
    }
    return FirebaseDataService.instance;
  }

  
  private checkFirebaseSetup(): boolean {
    if (!isFirebaseConfigured()) {
      console.warn('Firebase not configured. Please set up your Firebase project.');
      return false;
    }
    return true;
  }

  
  async login(email: string, password: string): Promise<ApiResponse<{ user: FirebaseUser; token: string }>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      return {
        success: true,
        data: {
          user: userCredential.user,
          token
        },
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 401
      };
    }
  }

  async register(email: string, password: string): Promise<ApiResponse<{ user: FirebaseUser }>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      return {
        success: true,
        data: { user: userCredential.user },
        statusCode: 201
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      await signOut(auth);
      
      this.unsubscribers.forEach(unsubscribe => unsubscribe());
      this.unsubscribers = [];
      
      return {
        success: true,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  
  async getTrucks(): Promise<ApiResponse<Truck[]>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const trucksCollection = collection(db, 'trucks');
      const trucksSnapshot = await getDocs(query(trucksCollection, orderBy('createdAt', 'desc')));
      
      const trucks = trucksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Truck[];

      return {
        success: true,
        data: trucks,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  async getTruck(id: string): Promise<ApiResponse<Truck>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const truckDoc = await getDoc(doc(db, 'trucks', id));
      
      if (!truckDoc.exists()) {
        return {
          success: false,
          error: 'Truck not found',
          statusCode: 404
        };
      }

      const truckData = truckDoc.data();
      const truck = {
        id: truckDoc.id,
        ...truckData,
        createdAt: truckData.createdAt?.toDate() || new Date(),
        updatedAt: truckData.updatedAt?.toDate() || new Date()
      } as Truck;

      return {
        success: true,
        data: truck,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  async createTruck(truck: Omit<Truck, 'id'>): Promise<ApiResponse<Truck>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const trucksCollection = collection(db, 'trucks');
      const docRef = await addDoc(trucksCollection, {
        ...truck,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const newTruck = {
        id: docRef.id,
        ...truck,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Truck;

      return {
        success: true,
        data: newTruck,
        statusCode: 201
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  async updateTruck(id: string, updates: Partial<Truck>): Promise<ApiResponse<Truck>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const truckRef = doc(db, 'trucks', id);
      await updateDoc(truckRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      const updatedTruck = await this.getTruck(id);
      return updatedTruck;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  async deleteTruck(id: string): Promise<ApiResponse<void>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      await deleteDoc(doc(db, 'trucks', id));
      
      return {
        success: true,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  
  async getMaintenanceEntries(): Promise<ApiResponse<MaintenanceEntry[]>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const maintenanceCollection = collection(db, 'maintenance');
      const maintenanceSnapshot = await getDocs(query(maintenanceCollection, orderBy('scheduledDate', 'desc')));
      
      const entries = maintenanceSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          scheduledDate: data.scheduledDate?.toDate() || new Date(),
          completedDate: data.completedDate?.toDate()
        };
      }) as unknown as MaintenanceEntry[];

      return {
        success: true,
        data: entries,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  async createMaintenanceEntry(entry: Omit<MaintenanceEntry, 'id'>): Promise<ApiResponse<MaintenanceEntry>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const maintenanceCollection = collection(db, 'maintenance');
      const docRef = await addDoc(maintenanceCollection, {
        ...entry,
        createdAt: serverTimestamp()
      });
      
      const newEntry = {
        id: docRef.id,
        ...entry,
        createdAt: new Date()
      } as MaintenanceEntry;

      return {
        success: true,
        data: newEntry,
        statusCode: 201
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  
  async getParts(): Promise<ApiResponse<Part[]>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const partsCollection = collection(db, 'parts');
      const partsSnapshot = await getDocs(query(partsCollection, orderBy('name')));
      
      const parts = partsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Part[];

      return {
        success: true,
        data: parts,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  async createPart(part: Omit<Part, 'id'>): Promise<ApiResponse<Part>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const partsCollection = collection(db, 'parts');
      const docRef = await addDoc(partsCollection, {
        ...part,
        createdAt: serverTimestamp()
      });
      
      const newPart = {
        id: docRef.id,
        ...part,
        createdAt: new Date()
      } as Part;

      return {
        success: true,
        data: newPart,
        statusCode: 201
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 400
      };
    }
  }

  
  async uploadFile(file: File, path: string): Promise<ApiResponse<{ url: string; path: string }>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        data: {
          url: downloadURL,
          path: path
        },
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  async deleteFile(path: string): Promise<ApiResponse<void>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      
      return {
        success: true,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }

  
  subscribeToTrucks(callback: (trucks: Truck[]) => void): () => void {
    if (!this.checkFirebaseSetup()) {
      console.warn('Firebase not configured. Subscriptions unavailable.');
      return () => {};
    }

    const trucksCollection = collection(db, 'trucks');
    const q = query(trucksCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trucks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Truck[];
      callback(trucks);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  subscribeToMaintenanceEntries(callback: (entries: MaintenanceEntry[]) => void): () => void {
    if (!this.checkFirebaseSetup()) {
      console.warn('Firebase not configured. Subscriptions unavailable.');
      return () => {};
    }

    const maintenanceCollection = collection(db, 'maintenance');
    const q = query(maintenanceCollection, orderBy('scheduledDate', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          scheduledDate: data.scheduledDate?.toDate() || new Date(),
          completedDate: data.completedDate?.toDate()
        };
      }) as unknown as MaintenanceEntry[];
      callback(entries);
    });

    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    if (!this.checkFirebaseSetup()) {
      console.warn('Firebase not configured. Auth state changes unavailable.');
      return () => {};
    }

    return onAuthStateChanged(auth, callback);
  }

  
  async batchUpdateTrucks(updates: Array<{ id: string; data: Partial<Truck> }>): Promise<ApiResponse<void>> {
    if (!this.checkFirebaseSetup()) {
      return {
        success: false,
        error: 'Firebase not configured. Please see FIREBASE_SETUP_GUIDE.md',
        statusCode: 501
      };
    }

    try {
      const batch = writeBatch(db);
      
      updates.forEach(update => {
        const truckRef = doc(db, 'trucks', update.id);
        batch.update(truckRef, {
          ...update.data,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      return {
        success: true,
        statusCode: 200
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: 500
      };
    }
  }
}

export const firebaseDataService = FirebaseDataService.getInstance();
