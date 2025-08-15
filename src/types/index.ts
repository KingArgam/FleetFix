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

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';
  options?: string[]; 
  required: boolean;
  defaultValue?: any;
  entityType: 'truck' | 'maintenance' | 'part';
  displayOrder: number;
  isActive: boolean;
}

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
  images?: string[]; 
  performedBy?: string;
  invoiceNumber?: string;
  warrantyExpiration?: Date;
  status?: string;
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
  mileageInterval?: number; 
  dateInterval?: number; 
  lastPerformed?: Date;
  lastMileage?: number;
  nextDue?: Date | number; 
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

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

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

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  type: 'maintenance' | 'inspection' | 'repair' | 'delivery' | 'other';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  truckId?: string;
  truckName?: string;
  assignedTo?: string;
  location?: string;
  cost?: number;
  notes?: string;
  reminders?: {
  time: number; 
    sent: boolean;
  }[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    endAfterOccurrences?: number;
  };
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  website?: string;
  taxId?: string;
  paymentTerms: string;
  rating: number; 
  notes?: string;
  isActive: boolean;
  categories: PartCategory[];
  pricing: SupplierPricing[];
  contracts?: SupplierContract[];
  performance: SupplierPerformance;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface SupplierPricing {
  partId: string;
  partNumber: string;
  supplierPartNumber: string;
  price: number;
  currency: string;
  minimumQuantity: number;
  leadTime: number; 
  validFrom: Date;
  validTo?: Date;
  isPreferred: boolean;
}

export interface SupplierContract {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  value: number;
  terms: string;
  status: 'active' | 'expired' | 'terminated';
  documents?: string[]; 
}

export interface SupplierPerformance {
  averageLeadTime: number;
  onTimeDeliveryRate: number; 
  qualityRating: number; 
  costEffectiveness: number; 
  responsiveness: number; 
  lastUpdated: Date;
}

export interface StockAlert {
  id: string;
  partId: string;
  partName: string;
  partNumber: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock';
  severity: 'info' | 'warning' | 'critical';
  isActive: boolean;
  lastTriggered: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  notes?: string;
  suggestedReorderQuantity?: number;
  estimatedCost?: number;
  suppliers?: {
    supplierId: string;
    supplierName: string;
    price: number;
    leadTime: number;
  }[];
  createdAt: Date;
}

export interface RecurringMaintenance {
  id: string;
  name: string;
  description?: string;
  type: MaintenanceType;
  truckIds: string[]; 
  schedule: RecurrenceSchedule;
  estimatedDuration: number; 
  estimatedCost: number;
  partsRequired?: {
    partId: string;
    quantity: number;
  }[];
  instructions?: string;
  assignedTo?: string;
  isActive: boolean;
  nextDueDate: Date;
  lastPerformed?: Date;
  completedCount: number;
  averageCost: number;
  notifications: {
    daysBeforeDue: number[];
    emailEnabled: boolean;
    smsEnabled: boolean;
  };
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface RecurrenceSchedule {
  frequency: 'mileage' | 'time' | 'both';
  mileageInterval?: number; 
  timeInterval?: {
    value: number;
    unit: 'days' | 'weeks' | 'months' | 'years';
  };
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
}

export interface PasswordResetRequest {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestType: 'full_export' | 'specific_data';
  dataTypes?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  requestedAt: Date;
  completedAt?: Date;
  fileSize?: number;
  format: 'json' | 'csv' | 'pdf';
}

export interface UserDataPackage {
  personal: {
    user: User;
    preferences: UserPreferences;
    notifications: NotificationPreferences;
  };
  fleet: {
    trucks: Truck[];
    maintenance: MaintenanceEntry[];
    parts: Part[];
    downtime: DowntimeEvent[];
    calendar: CalendarEvent[];
  };
  activity: {
    auditLogs: AuditLog[];
    loginHistory: any[];
  };
  exportInfo: {
    requestedAt: Date;
    completedAt: Date;
    version: string;
  };
}
