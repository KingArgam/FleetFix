// FleetFix Enhanced Types with Audit Logging, Security, and Custom Fields

// Security & User Management
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  preferences: UserPreferences;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    inApp: boolean;
  };
  language: string;
  timezone: string;
}

// Email and Communication Types
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
  maintenanceReminders: boolean;
  inventoryAlerts: boolean;
  systemUpdates: boolean;
}

// Audit Logging
export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'truck' | 'maintenance' | 'part' | 'downtime' | 'reminder';
  entityId: string;
  userId: string;
  userName: string;
  changes?: Record<string, { old: any; new: any }>;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

// Custom Fields System
export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';
  options?: string[]; // For select/multiselect types
  required: boolean;
  defaultValue?: any;
  entityType: 'truck' | 'maintenance' | 'part';
  displayOrder: number;
  isActive: boolean;
}

// Core Entities
export interface Truck {
  id: string;
  vin: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  nickname?: string;
  status: TruckStatus;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export type TruckStatus = 'In Service' | 'Out for Repair' | 'Needs Attention' | 'Retired';

export interface MaintenanceEntry {
  id: string;
  truckId: string;
  type: MaintenanceType;
  date: Date;
  mileage: number;
  cost: number;
  notes?: string;
  images?: string[]; // Base64 or file URLs
  performedBy?: string;
  invoiceNumber?: string;
  warrantyExpiration?: Date;
  customFields?: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export type MaintenanceType = 
  | 'Oil Change'
  | 'Tire Replacement' 
  | 'Brake Inspection'
  | 'Engine Service'
  | 'Transmission Service'
  | 'DOT Inspection'
  | 'General Repair'
  | 'Preventive Maintenance'
  | 'Emergency Repair'
  | 'Annual Inspection'
  | 'Safety Check';

export interface MaintenanceReminder {
  id: string;
  truckId: string;
  type: MaintenanceType;
  reminderType: 'mileage' | 'date' | 'both';
  mileageInterval?: number; // Every X miles
  dateInterval?: number; // Every X days
  lastPerformed?: Date;
  lastMileage?: number;
  nextDue?: Date | number; // Date or mileage
  isOverdue: boolean;
  isActive: boolean;
  notificationsSent: number;
  customMessage?: string;
  createdBy: string;
  createdAt: Date;
}

export interface Part {
  id: string;
  name: string;
  partNumber: string;
  category: PartCategory;
  cost: number;
  supplier?: string;
  supplierPartNumber?: string;
  inventoryLevel?: number;
  minStockLevel?: number;
  location?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export type PartCategory = 
  | 'Engine'
  | 'Transmission'
  | 'Brakes'
  | 'Tires'
  | 'Electrical'
  | 'Fluids'
  | 'Filters'
  | 'Body'
  | 'Suspension'
  | 'Other';

export interface PartUsage {
  id: string;
  partId: string;
  truckId: string;
  maintenanceEntryId: string;
  quantity: number;
  installDate: Date;
  cost: number;
  warranty?: string;
}

export interface DowntimeEvent {
  id: string;
  truckId: string;
  startDate: Date;
  endDate?: Date;
  cause: DowntimeCause;
  description?: string;
  estimatedCost?: number;
  actualCost?: number;
  isOngoing: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export type DowntimeCause = 
  | 'Scheduled Maintenance'
  | 'Unexpected Failure'
  | 'Accident'
  | 'Inspection'
  | 'Waiting for Parts'
  | 'Driver Unavailable'
  | 'Weather'
  | 'Other';

// Analytics & Reporting
export interface FleetStats {
  totalTrucks: number;
  activeTrucks: number;
  trucksInRepair: number;
  totalDowntimeHours: number;
  averageUptimePercentage: number;
  totalMaintenanceCost: number;
  overdueMaintenanceCount: number;
  costPerMile: number;
  lastUpdated: Date;
}

export interface TruckStats {
  truckId: string;
  totalDowntimeHours: number;
  uptimePercentage: number;
  totalMaintenanceCost: number;
  lastMaintenanceDate?: Date;
  overdueMaintenanceCount: number;
  averageCostPerMile: number;
  milesPerMonth: number;
}

// UI State Types
export interface FilterState {
  status?: TruckStatus[];
  maintenanceType?: MaintenanceType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  costRange?: {
    min: number;
    max: number;
  };
}

export interface ViewMode {
  trucks: 'cards' | 'list' | 'table';
  calendar: 'month' | 'week' | 'agenda';
  maintenance: 'list' | 'timeline';
}

// Notifications & Alerts
export interface Notification {
  id: string;
  type: 'reminder' | 'overdue' | 'alert' | 'info';
  title: string;
  message: string;
  entityType?: 'truck' | 'maintenance' | 'part';
  entityId?: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  expiresAt?: Date;
}

// Import/Export Types
export interface ImportResult {
  success: boolean;
  importedCount: number;
  errorCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ImportWarning {
  row: number;
  field: string;
  message: string;
  value: any;
}

// Form Validation
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormState {
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: ValidationError[];
}

// Company/Organization
export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  settings: CompanySettings;
  subscription: SubscriptionInfo;
  createdAt: Date;
}

export interface CompanySettings {
  defaultMileageReminder: number;
  defaultDateReminder: number;
  currency: string;
  dateFormat: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  features: {
    customFields: boolean;
    bulkImport: boolean;
    advancedReports: boolean;
    integrations: boolean;
  };
}

export interface SubscriptionInfo {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  truckLimit: number;
  expiresAt?: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Component and Position types for simulation/breadboard
export interface Position {
  x: number;
  y: number;
}

export type ComponentType = 'arduino' | 'esp32' | 'esp8266' | 'led' | 'resistor' | 'button' | 'potentiometer' | 'servo' | 'arduino-uno' | 'ultrasonic-sensor';

export interface Component {
  id: string;
  type: ComponentType;
  name?: string;
  position: Position;
  pins: Pin[];
  properties?: Record<string, any>;
  rotation?: number;
  svgData?: string;
}

export interface Pin {
  id: string;
  componentId: string;
  position: Position;
  type: 'input' | 'output' | 'power' | 'ground';
  connected?: boolean;
}

// Search & Filter Types
export interface SearchFilters {
  query?: string;
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  costRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Simulation and Editor Types for Breadboard Canvas
export interface SimulationState {
  components: Component[];
  connections: Connection[];
  wires: any[];
  isRunning: boolean;
  time: number;
}

export interface Connection {
  id: string;
  fromComponent: string;
  fromPin: string;
  toComponent: string;
  toPin: string;
}

export interface EditorState {
  mode: 'select' | 'place' | 'wire' | 'pan';
  selectedComponentType?: ComponentType;
  selectedComponents: string[];
}
