import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, Truck, MaintenanceEntry, Part } from '../types';
import { DataService } from '../services/DataService';
import authService from '../services/AuthService';
import { notificationService } from '../services/NotificationService';

interface AppState {
	currentUser: User | null;
	trucks: Truck[];
	maintenance: MaintenanceEntry[];
	parts: Part[];
	syncing: boolean;
	lastSyncTime: Date | null;
	tempTruckForm: Partial<Truck> | null;
	tempMaintenanceForm: Partial<MaintenanceEntry> | null;
	tempPartForm: Partial<Part> | null;
}

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
	| { type: 'SET_SYNCING'; payload: boolean }
	| { type: 'SET_LAST_SYNC_TIME'; payload: Date }
	| { type: 'SET_TEMP_TRUCK_FORM'; payload: Partial<Truck> | null }
	| { type: 'SET_TEMP_MAINTENANCE_FORM'; payload: Partial<MaintenanceEntry> | null }
	| { type: 'SET_TEMP_PART_FORM'; payload: Partial<Part> | null }
	| { type: 'CLEAR_ALL_DATA' };

// Function to get user-specific localStorage state
const getUserSpecificState = (userId: string | null): AppState => {
	if (!userId || typeof window === 'undefined') {
		return {
			currentUser: null,
			trucks: [],
			maintenance: [],
			parts: [],
			syncing: false,
			lastSyncTime: new Date(),
			tempTruckForm: null,
			tempMaintenanceForm: null,
			tempPartForm: null,
		};
	}

	const userStateKey = `fleetfix_app_state_${userId}`;
	const persistedState = localStorage.getItem(userStateKey);
	
	if (persistedState) {
		try {
			return JSON.parse(persistedState);
		} catch (error) {
			console.error('Error parsing persisted state:', error);
		}
	}

	// Load sample data if available (for development testing)
	let sampleTrucks = [];
	let sampleMaintenance = [];
	if (process.env.NODE_ENV === 'development') {
		const storedTrucks = localStorage.getItem('sampleTrucks');
		const storedMaintenance = localStorage.getItem('sampleMaintenance');
		if (storedTrucks) sampleTrucks = JSON.parse(storedTrucks);
		if (storedMaintenance) sampleMaintenance = JSON.parse(storedMaintenance);
	}

	return {
		currentUser: null, // Will be set when user logs in
		trucks: sampleTrucks,
		maintenance: sampleMaintenance,
		parts: [],
		syncing: false,
		lastSyncTime: new Date(),
		tempTruckForm: null,
		tempMaintenanceForm: null,
		tempPartForm: null,
	};
};

const initialState: AppState = getUserSpecificState(null);

function appReducer(state: AppState, action: AppAction): AppState {
	let newState: AppState;
	switch (action.type) {
		case 'SET_USER':
			// When user changes, load their specific state or clear all data if logout
			if (action.payload) {
				// User logged in - load their specific state
				const userSpecificState = getUserSpecificState(action.payload.id);
				newState = { ...userSpecificState, currentUser: action.payload };
			} else {
				// User logged out - clear all data
				newState = {
					currentUser: null,
					trucks: [],
					maintenance: [],
					parts: [],
					syncing: false,
					lastSyncTime: new Date(),
					tempTruckForm: null,
					tempMaintenanceForm: null,
					tempPartForm: null,
				};
			}
			break;
		case 'SET_TRUCKS':
			newState = { ...state, trucks: action.payload };
			break;
		case 'ADD_TRUCK':
			newState = { ...state, trucks: [action.payload, ...state.trucks] };
			break;
		case 'UPDATE_TRUCK':
			newState = {
				...state,
				trucks: state.trucks.map(truck =>
					truck.id === action.payload.id
						? { ...truck, ...action.payload.data }
						: truck
				),
			};
			break;
		case 'DELETE_TRUCK':
			newState = {
				...state,
				trucks: state.trucks.filter(truck => truck.id !== action.payload),
			};
			break;
		case 'SET_MAINTENANCE':
			newState = { ...state, maintenance: action.payload };
			break;
		case 'ADD_MAINTENANCE':
			newState = { ...state, maintenance: [action.payload, ...state.maintenance] };
			break;
		case 'UPDATE_MAINTENANCE':
			newState = {
				...state,
				maintenance: state.maintenance.map(item =>
					item.id === action.payload.id
						? { ...item, ...action.payload.data }
						: item
				),
			};
			break;
		case 'DELETE_MAINTENANCE':
			newState = {
				...state,
				maintenance: state.maintenance.filter(item => item.id !== action.payload),
			};
			break;
		case 'SET_PARTS':
			newState = { ...state, parts: action.payload };
			break;
		case 'ADD_PART':
			newState = { ...state, parts: [action.payload, ...state.parts] };
			break;
		case 'UPDATE_PART':
			newState = {
				...state,
				parts: state.parts.map(part =>
					part.id === action.payload.id
						? { ...part, ...action.payload.data }
						: part
				),
			};
			break;
		case 'DELETE_PART':
			newState = {
				...state,
				parts: state.parts.filter(part => part.id !== action.payload),
			};
			break;
		case 'SET_SYNCING':
			newState = { ...state, syncing: action.payload };
			break;
		case 'SET_LAST_SYNC_TIME':
			newState = { ...state, lastSyncTime: action.payload };
			break;
		case 'SET_TEMP_TRUCK_FORM':
			newState = { ...state, tempTruckForm: action.payload };
			break;
		case 'SET_TEMP_MAINTENANCE_FORM':
			newState = { ...state, tempMaintenanceForm: action.payload };
			break;
		case 'SET_TEMP_PART_FORM':
			newState = { ...state, tempPartForm: action.payload };
			break;
		case 'CLEAR_ALL_DATA':
			newState = {
				currentUser: state.currentUser, // Keep current user but clear their data
				trucks: [],
				maintenance: [],
				parts: [],
				syncing: false,
				lastSyncTime: new Date(),
				tempTruckForm: null,
				tempMaintenanceForm: null,
				tempPartForm: null,
			};
			break;
	default:
		newState = state;
	}
	
	// Save state to user-specific localStorage key if user is logged in
	if (typeof window !== 'undefined' && newState.currentUser) {
		const userStateKey = `fleetfix_app_state_${newState.currentUser.id}`;
		localStorage.setItem(userStateKey, JSON.stringify(newState));
	}
	return newState;
}

const AppContext = createContext<any>(undefined);

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


	const dataService = React.useMemo(() => DataService.getInstance(), []);


	const addTruck = async (truck: Truck) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.createTruck(truck);
		dispatch({ type: 'ADD_TRUCK', payload: truck });
	};


	const updateTruck = async (id: string, updates: Partial<Truck>) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.updateTruck(id, updates);
		dispatch({ type: 'UPDATE_TRUCK', payload: { id, data: updates } });
	};

	const deleteTruck = async (id: string) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.deleteTruck(id);
		dispatch({ type: 'DELETE_TRUCK', payload: id });
	};


	const addPart = async (part: Part) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.createPart(part);
		dispatch({ type: 'ADD_PART', payload: part });
		
		// Check stock levels after adding a part
		setTimeout(() => {
			notificationService.checkPartsStock([...state.parts, part]);
		}, 100);
	};


	const updatePart = async (id: string, updates: Partial<Part>) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.updatePart(id, updates);
		dispatch({ type: 'UPDATE_PART', payload: { id, data: updates } });
		
		// Check stock levels after updating a part
		setTimeout(() => {
			const updatedParts = state.parts.map(part =>
				part.id === id ? { ...part, ...updates } : part
			);
			notificationService.checkPartsStock(updatedParts);
		}, 100);
	};

	const deletePart = async (id: string) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.deletePart(id);
		dispatch({ type: 'DELETE_PART', payload: id });
	};


	const addMaintenance = async (entry: MaintenanceEntry) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.createMaintenanceEntry(entry);
		dispatch({ type: 'ADD_MAINTENANCE', payload: entry });
	};


	const updateMaintenance = async (id: string, updates: Partial<MaintenanceEntry>) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.updateMaintenanceEntry(id, updates);
		dispatch({ type: 'UPDATE_MAINTENANCE', payload: { id, data: updates } });
	};

	const deleteMaintenance = async (id: string) => {
		await dataService.setCurrentUser(state.currentUser?.id || '');
		await dataService.deleteMaintenanceEntry(id);
		dispatch({ type: 'DELETE_MAINTENANCE', payload: id });
	};

	const saveTempTruckForm = (formData: Partial<Truck>) => {
		dispatch({ type: 'SET_TEMP_TRUCK_FORM', payload: formData });
	};

	const clearTempTruckForm = () => {
		dispatch({ type: 'SET_TEMP_TRUCK_FORM', payload: null });
	};

	useEffect(() => {
		const unsubscribers: (() => void)[] = [];
		const authUnsubscribe = authService.onAuthStateChange(async (user) => {
			dispatch({ type: 'SET_USER', payload: user });
			
			// Initialize user data persistence when user logs in
			if (user) {
				try {
					// Import userDataService to initialize user data
					const userDataService = (await import('../services/UserDataService')).default;
					await userDataService.initializeUserData(user.id);
					console.log('User data initialized successfully for:', user.id);
				} catch (error) {
					console.error('Error initializing user data:', error);
				}
			}
		});
		unsubscribers.push(authUnsubscribe);
		return () => {
			unsubscribers.forEach(unsub => unsub());
		};
	}, []);

	// Initialize and monitor stock levels
	useEffect(() => {
		if (state.parts && state.parts.length > 0) {
			// Check stock levels whenever parts data changes
			notificationService.checkPartsStock(state.parts);
		}
	}, [state.parts]);

	// Initialize sample parts with low stock for testing (development only)
	useEffect(() => {
		if (process.env.NODE_ENV === 'development' && state.parts.length === 0 && state.currentUser) {
			const sampleParts = [
				{
					id: 'sample-part-1',
					name: 'Brake Pads',
					partNumber: 'BP-001',
					category: 'Brakes' as const,
					cost: 75.99,
					inventoryLevel: 2, // Low stock
					minStockLevel: 10,
					supplier: 'AutoParts Inc',
					location: 'A1-B2',
					createdAt: new Date(),
					createdBy: state.currentUser.id,
				},
				{
					id: 'sample-part-2',
					name: 'Engine Oil Filter',
					partNumber: 'OF-002',
					category: 'Filters' as const,
					cost: 12.50,
					inventoryLevel: 0, // Out of stock
					minStockLevel: 15,
					supplier: 'FilterWorld',
					location: 'B3-C1',
					createdAt: new Date(),
					createdBy: state.currentUser.id,
				},
				{
					id: 'sample-part-3',
					name: 'Spark Plugs',
					partNumber: 'SP-003',
					category: 'Engine' as const,
					cost: 8.99,
					inventoryLevel: 25, // Good stock
					minStockLevel: 20,
					supplier: 'EngineMax',
					location: 'C2-D3',
					createdAt: new Date(),
					createdBy: state.currentUser.id,
				}
			];

			dispatch({ type: 'SET_PARTS', payload: sampleParts });
		}
	}, [state.currentUser, state.parts.length]);

	return (
		<AppContext.Provider value={{ 
			state, 
			dispatch, 
			addTruck, 
			updateTruck, 
			deleteTruck, 
			addPart, 
			updatePart, 
			deletePart, 
			addMaintenance, 
			updateMaintenance, 
			deleteMaintenance,
			saveTempTruckForm,
			clearTempTruckForm
		}}>
			{children}
		</AppContext.Provider>
	);
};

export default AppProvider;
