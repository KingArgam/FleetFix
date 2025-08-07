import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, Truck, MaintenanceEntry, Part } from '../types';
import { DataService } from '../services/DataService';
import authService from '../services/AuthService';

// Global application state
interface AppState {
  // User data
  currentUser: User | null;
  
  // Business data
  trucks: Truck[];
  maintenance: MaintenanceEntry[];
  parts: Part[];
  
  // UI state
  loading: boolean;
  syncing: boolean;
  lastSyncTime: Date | null;
  
  // Form states - persist across navigation
  tempTruckForm: Partial<Truck> | null;
  tempMaintenanceForm: Partial<MaintenanceEntry> | null;
  tempPartForm: Partial<Part> | null;
}

// Action types
type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TRUCKS'; payload: Truck[] }
  | { type: 'ADD_TRUCK'; payload: Truck }
  | { type: 'UPDATE_TRUCK'; payload: { id: string; data: Partial<Truck> } }
  | { type: 'DELETE_TRUCK'; payload: string }
  | { type: 'SET_MAINTENANCE'; payload: MaintenanceEntry[] }
  | { type: 'ADD_MAINTENANCE'; payload: MaintenanceEntry }
  | { type: 'UPDATE_MAINTENANCE'; payload: { id: string; data: Partial<MaintenanceEntry> } }
  | { type: 'DELETE_MAINTENANCE'; payload: string }
  | { type: 'SET_PARTS'; payload: Part[] }
  | { type: 'ADD_PART'; payload: Part }
  | { type: 'UPDATE_PART'; payload: { id: string; data: Partial<Part> } }
  | { type: 'DELETE_PART'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LAST_SYNC_TIME'; payload: Date }
  | { type: 'SET_TEMP_TRUCK_FORM'; payload: Partial<Truck> | null }
  | { type: 'SET_TEMP_MAINTENANCE_FORM'; payload: Partial<MaintenanceEntry> | null }
  | { type: 'SET_TEMP_PART_FORM'; payload: Partial<Part> | null }
  | { type: 'CLEAR_ALL_DATA' };

const initialState: AppState = {
  currentUser: null,
  trucks: [],
  maintenance: [],
  parts: [],
  loading: true,
  syncing: false,
  lastSyncTime: null,
  tempTruckForm: null,
  tempMaintenanceForm: null,
  tempPartForm: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_TRUCKS':
      return { ...state, trucks: action.payload };
    
    case 'ADD_TRUCK':
      return { ...state, trucks: [action.payload, ...state.trucks] };
    
    case 'UPDATE_TRUCK':
      return {
        ...state,
        trucks: state.trucks.map(truck =>
          truck.id === action.payload.id
            ? { ...truck, ...action.payload.data }
            : truck
        ),
      };
    
    case 'DELETE_TRUCK':
      return {
        ...state,
        trucks: state.trucks.filter(truck => truck.id !== action.payload),
      };
    
    case 'SET_MAINTENANCE':
      return { ...state, maintenance: action.payload };
    
    case 'ADD_MAINTENANCE':
      return { ...state, maintenance: [action.payload, ...state.maintenance] };
    
    case 'UPDATE_MAINTENANCE':
      return {
        ...state,
        maintenance: state.maintenance.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.data }
            : item
        ),
      };
    
    case 'DELETE_MAINTENANCE':
      return {
        ...state,
        maintenance: state.maintenance.filter(item => item.id !== action.payload),
      };
    
    case 'SET_PARTS':
      return { ...state, parts: action.payload };
    
    case 'ADD_PART':
      return { ...state, parts: [action.payload, ...state.parts] };
    
    case 'UPDATE_PART':
      return {
        ...state,
        parts: state.parts.map(part =>
          part.id === action.payload.id
            ? { ...part, ...action.payload.data }
            : part
        ),
      };
    
    case 'DELETE_PART':
      return {
        ...state,
        parts: state.parts.filter(part => part.id !== action.payload),
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_SYNCING':
      return { ...state, syncing: action.payload };
    
    case 'SET_LAST_SYNC_TIME':
      return { ...state, lastSyncTime: action.payload };
    
    case 'SET_TEMP_TRUCK_FORM':
      return { ...state, tempTruckForm: action.payload };
    
    case 'SET_TEMP_MAINTENANCE_FORM':
      return { ...state, tempMaintenanceForm: action.payload };
    
    case 'SET_TEMP_PART_FORM':
      return { ...state, tempPartForm: action.payload };
    
    case 'CLEAR_ALL_DATA':
      return {
        ...initialState,
        loading: false,
      };
    
    default:
      return state;
  }
}

// Context and Provider
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Convenience methods
  addTruck: (truckData: Omit<Truck, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => Promise<void>;
  updateTruck: (id: string, data: Partial<Truck>) => Promise<void>;
  deleteTruck: (id: string) => Promise<void>;
  
  addMaintenance: (maintenanceData: Omit<MaintenanceEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => Promise<void>;
  updateMaintenance: (id: string, data: Partial<MaintenanceEntry>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
  
  addPart: (partData: Omit<Part, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => Promise<void>;
  updatePart: (id: string, data: Partial<Part>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  
  // Form state management
  saveTempTruckForm: (data: Partial<Truck>) => void;
  clearTempTruckForm: () => void;
  saveTempMaintenanceForm: (data: Partial<MaintenanceEntry>) => void;
  clearTempMaintenanceForm: () => void;
  saveTempPartForm: (data: Partial<Part>) => void;
  clearTempPartForm: () => void;
  
  // Calendar helpers
  getMaintenanceForTruck: (truckId: string) => MaintenanceEntry[];
  getCalendarEvents: () => Array<{
    id: string;
    title: string;
    date: Date;
    type: string;
    truckInfo?: string;
    status: string;
  }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Firebase listeners cleanup
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Listen for auth state changes
    const authUnsubscribe = authService.onAuthStateChange(async (user) => {
      dispatch({ type: 'SET_USER', payload: user });
      
      if (user) {
        // User logged in - load data from DataService
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const dataService = DataService.getInstance();
        
        // Load all data
        try {
          const trucks = dataService.getTrucks();
          const maintenance = dataService.getMaintenanceEntries();
          const parts = dataService.getParts();
          
          dispatch({ type: 'SET_TRUCKS', payload: trucks });
          dispatch({ type: 'SET_MAINTENANCE', payload: maintenance });
          dispatch({ type: 'SET_PARTS', payload: parts });
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() });
        } catch (error) {
          console.error('Error loading data:', error);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        // User logged out - clear data
        dispatch({ type: 'CLEAR_ALL_DATA' });
      }
    });

    unsubscribers.push(authUnsubscribe);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Convenience methods
  const addTruck = async (truckData: Omit<Truck, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    const dataService = DataService.getInstance();
    const result = await dataService.createTruck(truckData);
    if (result.success && result.data) {
      dispatch({ type: 'ADD_TRUCK', payload: result.data });
    }
  };

  const updateTruck = async (id: string, data: Partial<Truck>) => {
    const dataService = DataService.getInstance();
    const result = await dataService.updateTruck(id, data);
    if (result.success && result.data) {
      dispatch({ type: 'UPDATE_TRUCK', payload: { id, data: result.data } });
    }
  };

  const deleteTruck = async (id: string) => {
    const dataService = DataService.getInstance();
    await dataService.deleteTruck(id);
    dispatch({ type: 'DELETE_TRUCK', payload: id });
  };

  const addMaintenance = async (maintenanceData: Omit<MaintenanceEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    const dataService = DataService.getInstance();
    const result = await dataService.createMaintenanceEntry(maintenanceData);
    if (result.success && result.data) {
      dispatch({ type: 'ADD_MAINTENANCE', payload: result.data });
    }
  };

  const updateMaintenance = async (id: string, data: Partial<MaintenanceEntry>) => {
    const dataService = DataService.getInstance();
    const result = await dataService.updateMaintenanceEntry(id, data);
    if (result.success && result.data) {
      dispatch({ type: 'UPDATE_MAINTENANCE', payload: { id, data: result.data } });
    }
  };

  const deleteMaintenance = async (id: string) => {
    const dataService = DataService.getInstance();
    await dataService.deleteMaintenanceEntry(id);
    dispatch({ type: 'DELETE_MAINTENANCE', payload: id });
  };

  const addPart = async (partData: Omit<Part, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    const dataService = DataService.getInstance();
    const result = await dataService.createPart(partData);
    if (result.success && result.data) {
      dispatch({ type: 'ADD_PART', payload: result.data });
    }
  };

  const updatePart = async (id: string, data: Partial<Part>) => {
    const dataService = DataService.getInstance();
    const result = await dataService.updatePart(id, data);
    if (result.success && result.data) {
      dispatch({ type: 'UPDATE_PART', payload: { id, data: result.data } });
    }
  };

  const deletePart = async (id: string) => {
    const dataService = DataService.getInstance();
    await dataService.deletePart(id);
    dispatch({ type: 'DELETE_PART', payload: id });
  };

  // Form state management
  const saveTempTruckForm = (data: Partial<Truck>) => {
    dispatch({ type: 'SET_TEMP_TRUCK_FORM', payload: data });
  };

  const clearTempTruckForm = () => {
    dispatch({ type: 'SET_TEMP_TRUCK_FORM', payload: null });
  };

  const saveTempMaintenanceForm = (data: Partial<MaintenanceEntry>) => {
    dispatch({ type: 'SET_TEMP_MAINTENANCE_FORM', payload: data });
  };

  const clearTempMaintenanceForm = () => {
    dispatch({ type: 'SET_TEMP_MAINTENANCE_FORM', payload: null });
  };

  const saveTempPartForm = (data: Partial<Part>) => {
    dispatch({ type: 'SET_TEMP_PART_FORM', payload: data });
  };

  const clearTempPartForm = () => {
    dispatch({ type: 'SET_TEMP_PART_FORM', payload: null });
  };

  // Calendar helpers
  const getMaintenanceForTruck = (truckId: string): MaintenanceEntry[] => {
    return state.maintenance.filter(m => m.truckId === truckId);
  };

  const getCalendarEvents = () => {
    // Create a truck lookup map for better performance
    const truckMap = state.trucks.reduce((acc, truck) => {
      acc[truck.id] = truck;
      return acc;
    }, {} as Record<string, Truck>);

    return state.maintenance.map(m => ({
      id: m.id,
      title: `${m.type.charAt(0).toUpperCase() + m.type.slice(1)} Maintenance`,
      date: m.date,
      type: m.type,
      truckInfo: truckMap[m.truckId] ? `${truckMap[m.truckId].make} ${truckMap[m.truckId].model} (${truckMap[m.truckId].licensePlate})` : 'Unknown Truck',
      status: m.status || 'Completed'
    }));
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    addTruck,
    updateTruck,
    deleteTruck,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
    addPart,
    updatePart,
    deletePart,
    saveTempTruckForm,
    clearTempTruckForm,
    saveTempMaintenanceForm,
    clearTempMaintenanceForm,
    saveTempPartForm,
    clearTempPartForm,
    getMaintenanceForTruck,
    getCalendarEvents,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
