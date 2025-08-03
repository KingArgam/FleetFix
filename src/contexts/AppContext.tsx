import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User } from '../types';
import userDataService, { TruckData, MaintenanceData, PartData, UserPreferences } from '../services/UserDataService';
import authService from '../services/AuthService';

// Global application state
interface AppState {
  // User data
  currentUser: User | null;
  userPreferences: UserPreferences | null;
  
  // Business data
  trucks: TruckData[];
  maintenance: MaintenanceData[];
  parts: PartData[];
  
  // UI state
  loading: boolean;
  syncing: boolean;
  lastSyncTime: Date | null;
  
  // Form states - persist across navigation
  tempTruckForm: Partial<TruckData> | null;
  tempMaintenanceForm: Partial<MaintenanceData> | null;
  tempPartForm: Partial<PartData> | null;
}

// Action types
type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_USER_PREFERENCES'; payload: UserPreferences | null }
  | { type: 'SET_TRUCKS'; payload: TruckData[] }
  | { type: 'ADD_TRUCK'; payload: TruckData }
  | { type: 'UPDATE_TRUCK'; payload: { id: string; data: Partial<TruckData> } }
  | { type: 'DELETE_TRUCK'; payload: string }
  | { type: 'SET_MAINTENANCE'; payload: MaintenanceData[] }
  | { type: 'ADD_MAINTENANCE'; payload: MaintenanceData }
  | { type: 'UPDATE_MAINTENANCE'; payload: { id: string; data: Partial<MaintenanceData> } }
  | { type: 'DELETE_MAINTENANCE'; payload: string }
  | { type: 'SET_PARTS'; payload: PartData[] }
  | { type: 'ADD_PART'; payload: PartData }
  | { type: 'UPDATE_PART'; payload: { id: string; data: Partial<PartData> } }
  | { type: 'DELETE_PART'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LAST_SYNC_TIME'; payload: Date }
  | { type: 'SET_TEMP_TRUCK_FORM'; payload: Partial<TruckData> | null }
  | { type: 'SET_TEMP_MAINTENANCE_FORM'; payload: Partial<MaintenanceData> | null }
  | { type: 'SET_TEMP_PART_FORM'; payload: Partial<PartData> | null }
  | { type: 'CLEAR_ALL_DATA' };

const initialState: AppState = {
  currentUser: null,
  userPreferences: null,
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
    
    case 'SET_USER_PREFERENCES':
      return { ...state, userPreferences: action.payload };
    
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
  addTruck: (truckData: Omit<TruckData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTruck: (id: string, data: Partial<TruckData>) => Promise<void>;
  deleteTruck: (id: string) => Promise<void>;
  
  addMaintenance: (maintenanceData: Omit<MaintenanceData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMaintenance: (id: string, data: Partial<MaintenanceData>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
  
  addPart: (partData: Omit<PartData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePart: (id: string, data: Partial<PartData>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  
  saveUserPreferences: (preferences: Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  
  // Form state management
  saveTempTruckForm: (data: Partial<TruckData>) => void;
  clearTempTruckForm: () => void;
  saveTempMaintenanceForm: (data: Partial<MaintenanceData>) => void;
  clearTempMaintenanceForm: () => void;
  saveTempPartForm: (data: Partial<PartData>) => void;
  clearTempPartForm: () => void;
  
  // Calendar helpers
  getMaintenanceForTruck: (truckId: string) => MaintenanceData[];
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
    const authUnsubscribe = authService.onAuthStateChange((user) => {
      dispatch({ type: 'SET_USER', payload: user });
      
      if (user) {
        // User logged in - set up data listeners
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Load user preferences
        userDataService.getUserPreferences(user.id)
          .then(preferences => {
            dispatch({ type: 'SET_USER_PREFERENCES', payload: preferences });
          })
          .catch(console.error);

        // Set up real-time listeners
        const trucksUnsubscribe = userDataService.subscribeToTrucks(user.id, (trucks) => {
          dispatch({ type: 'SET_TRUCKS', payload: trucks });
          dispatch({ type: 'SET_LOADING', payload: false });
          dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() });
        });

        const maintenanceUnsubscribe = userDataService.subscribeToMaintenance(user.id, (maintenance) => {
          dispatch({ type: 'SET_MAINTENANCE', payload: maintenance });
        });

        const partsUnsubscribe = userDataService.subscribeToParts(user.id, (parts) => {
          dispatch({ type: 'SET_PARTS', payload: parts });
        });

        unsubscribers.push(trucksUnsubscribe, maintenanceUnsubscribe, partsUnsubscribe);
      } else {
        // User logged out - clear data
        dispatch({ type: 'CLEAR_ALL_DATA' });
      }
    });

    unsubscribers.push(authUnsubscribe);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Convenience methods
  const addTruck = async (truckData: Omit<TruckData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!state.currentUser) return;
    
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.createTruck(state.currentUser.id, truckData);
      // The real-time listener will update the state
    } catch (error) {
      console.error('Error adding truck:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const updateTruck = async (id: string, data: Partial<TruckData>) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.updateTruck(id, data);
      // The real-time listener will update the state
    } catch (error) {
      console.error('Error updating truck:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteTruck = async (id: string) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.deleteTruck(id);
      // The real-time listener will update the state
    } catch (error) {
      console.error('Error deleting truck:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const addMaintenance = async (maintenanceData: Omit<MaintenanceData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!state.currentUser) return;
    
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.createMaintenance(state.currentUser.id, maintenanceData);
    } catch (error) {
      console.error('Error adding maintenance:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const updateMaintenance = async (id: string, data: Partial<MaintenanceData>) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.updateMaintenance(id, data);
    } catch (error) {
      console.error('Error updating maintenance:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deleteMaintenance = async (id: string) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.deleteMaintenance(id);
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const addPart = async (partData: Omit<PartData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!state.currentUser) return;
    
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.createPart(state.currentUser.id, partData);
    } catch (error) {
      console.error('Error adding part:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const updatePart = async (id: string, data: Partial<PartData>) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.updatePart(id, data);
    } catch (error) {
      console.error('Error updating part:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const deletePart = async (id: string) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.deletePart(id);
    } catch (error) {
      console.error('Error deleting part:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const saveUserPreferences = async (preferences: Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!state.currentUser) return;
    
    try {
      dispatch({ type: 'SET_SYNCING', payload: true });
      await userDataService.saveUserPreferences(state.currentUser.id, preferences);
      dispatch({ type: 'SET_USER_PREFERENCES', payload: { ...preferences, userId: state.currentUser.id } as UserPreferences });
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // Form state management
  const saveTempTruckForm = (data: Partial<TruckData>) => {
    dispatch({ type: 'SET_TEMP_TRUCK_FORM', payload: data });
  };

  const clearTempTruckForm = () => {
    dispatch({ type: 'SET_TEMP_TRUCK_FORM', payload: null });
  };

  const saveTempMaintenanceForm = (data: Partial<MaintenanceData>) => {
    dispatch({ type: 'SET_TEMP_MAINTENANCE_FORM', payload: data });
  };

  const clearTempMaintenanceForm = () => {
    dispatch({ type: 'SET_TEMP_MAINTENANCE_FORM', payload: null });
  };

  const saveTempPartForm = (data: Partial<PartData>) => {
    dispatch({ type: 'SET_TEMP_PART_FORM', payload: data });
  };

  const clearTempPartForm = () => {
    dispatch({ type: 'SET_TEMP_PART_FORM', payload: null });
  };

  // Helper functions
  const getMaintenanceForTruck = (truckId: string): MaintenanceData[] => {
    return state.maintenance.filter(m => m.truckId === truckId);
  };

  const getCalendarEvents = () => {
    const truckMap = state.trucks.reduce((map, truck) => {
      map[truck.id] = truck;
      return map;
    }, {} as Record<string, TruckData>);

    return state.maintenance.map(m => ({
      id: m.id,
      title: `${m.type.charAt(0).toUpperCase() + m.type.slice(1)} Maintenance`,
      date: m.scheduledDate,
      type: m.type,
      truckInfo: truckMap[m.truckId] ? `${truckMap[m.truckId].make} ${truckMap[m.truckId].model} (${truckMap[m.truckId].licensePlate})` : 'Unknown Truck',
      status: m.status
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
    saveUserPreferences,
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
