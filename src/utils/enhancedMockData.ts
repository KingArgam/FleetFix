import { 
  Truck, 
  MaintenanceEntry, 
  Part, 
  DowntimeEvent,
  TruckStatus,
  MaintenanceType,
  PartCategory,
  DowntimeCause,
  AuditLog,
  MaintenanceReminder,
  User,
  FleetStats,
  CustomField,
  Company,
  UserRole 
} from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@fleetfix.com',
    name: 'John Smith',
    role: 'admin' as UserRole,
    companyId: 'company-1',
    isActive: true,
    lastLogin: new Date('2024-01-15T08:30:00Z'),
    createdAt: new Date('2023-01-01T00:00:00Z'),
    preferences: {
      theme: 'light',
      notifications: {
        inApp: true
      },
      language: 'en',
      timezone: 'America/New_York'
    }
  },
  {
    id: 'user-2',
    email: 'mechanic@fleetfix.com',
    name: 'Sarah Johnson',
    role: 'editor' as UserRole,
    companyId: 'company-1',
    isActive: true,
    lastLogin: new Date('2024-01-15T07:45:00Z'),
    createdAt: new Date('2023-02-15T00:00:00Z'),
    preferences: {
      theme: 'dark',
      notifications: {
        inApp: true
      },
      language: 'en',
      timezone: 'America/New_York'
    }
  }
];

// Mock Company
export const mockCompany: Company = {
  id: 'company-1',
  name: 'FleetFix Demo Company',
  address: '123 Fleet Street, Transport City, TC 12345',
  phone: '(555) 123-4567',
  email: 'contact@fleetfix.com',
  settings: {
    defaultMileageReminder: 5000,
    defaultDateReminder: 90,
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af'
    },
    features: {
      customFields: true,
      bulkImport: true,
      advancedReports: true,
      integrations: true
    }
  },
  subscription: {
    plan: 'pro',
    status: 'active',
    truckLimit: 100,
    expiresAt: new Date('2024-12-31T23:59:59Z')
  },
  createdAt: new Date('2023-01-01T00:00:00Z')
};

// Mock Custom Fields
export const mockCustomFields: CustomField[] = [
  {
    id: 'cf-1',
    name: 'Driver Assigned',
    type: 'text',
    required: false,
    entityType: 'truck',
    displayOrder: 1,
    isActive: true
  },
  {
    id: 'cf-2',
    name: 'Fuel Type',
    type: 'select',
    options: ['Diesel', 'Gasoline', 'Electric', 'Hybrid'],
    required: true,
    defaultValue: 'Diesel',
    entityType: 'truck',
    displayOrder: 2,
    isActive: true
  },
  {
    id: 'cf-3',
    name: 'Service Priority',
    type: 'select',
    options: ['Low', 'Medium', 'High', 'Critical'],
    required: false,
    defaultValue: 'Medium',
    entityType: 'maintenance',
    displayOrder: 1,
    isActive: true
  }
];

export const mockTrucks: Truck[] = [
  {
    id: 'truck-1',
    vin: '1HGBH41JXMN109186',
    licensePlate: 'FLT-001',
    make: 'Freightliner',
    model: 'Cascadia',
    year: 2019,
    mileage: 345000,
    nickname: 'Big Blue',
    status: 'In Service' as TruckStatus,
    customFields: {
      'cf-1': 'Mike Johnson',
      'cf-2': 'Diesel'
    },
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-08-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'truck-2',
    vin: '1FUJGLDR53LM76543',
    licensePlate: 'FLT-002',
    make: 'Peterbilt',
    model: '579',
    year: 2020,
    mileage: 298000,
    nickname: 'Red Thunder',
    status: 'Out for Repair' as TruckStatus,
    customFields: {
      'cf-1': 'Sarah Davis',
      'cf-2': 'Diesel'
    },
    createdAt: new Date('2023-03-20'),
    updatedAt: new Date('2024-07-28'),
    createdBy: 'user-1',
    updatedBy: 'user-2',
  },
  {
    id: 'truck-3',
    vin: '1FUJBCAL46AX12345',
    licensePlate: 'FLT-003',
    make: 'Kenworth',
    model: 'T680',
    year: 2021,
    mileage: 187000,
    nickname: 'Silver Bullet',
    status: 'Needs Attention' as TruckStatus,
    customFields: {
      'cf-1': 'Tom Wilson',
      'cf-2': 'Diesel'
    },
    createdAt: new Date('2023-05-10'),
    updatedAt: new Date('2024-07-30'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'truck-4',
    vin: '1M1AH07Y9KM123456',
    licensePlate: 'FLT-004',
    make: 'Mack',
    model: 'Anthem',
    year: 2018,
    mileage: 412000,
    nickname: 'Old Reliable',
    status: 'In Service' as TruckStatus,
    customFields: {
      'cf-1': 'Lisa Brown',
      'cf-2': 'Diesel'
    },
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2024-07-25'),
    createdBy: 'user-1',
    updatedBy: 'user-2',
  },
  {
    id: 'truck-5',
    vin: '4V4NC9TJ4EN123789',
    licensePlate: 'FLT-005',
    make: 'Volvo',
    model: 'VNL',
    year: 2022,
    mileage: 89000,
    nickname: 'Nordic Express',
    status: 'In Service' as TruckStatus,
    customFields: {
      'cf-1': 'Alex Rodriguez',
      'cf-2': 'Diesel'
    },
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2024-08-02'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
  }
];

export const mockMaintenanceEntries: MaintenanceEntry[] = [
  {
    id: 'maint-1',
    truckId: 'truck-1',
    type: 'Oil Change' as MaintenanceType,
    date: new Date('2024-07-15'),
    mileage: 343000,
    cost: 385.75,
    notes: 'Routine 15W-40 oil change with new filter, DEF top-off',
    performedBy: 'Quick Lube Express',
    invoiceNumber: 'INV-2024-1001',
    customFields: {
      'cf-3': 'Medium'
    },
    createdAt: new Date('2024-07-15'),
    createdBy: 'user-2'
  },
  {
    id: 'maint-2',
    truckId: 'truck-2',
    type: 'Engine Service' as MaintenanceType,
    date: new Date('2024-07-20'),
    mileage: 297500,
    cost: 3247.85,
    notes: 'Engine overheating issue - replaced thermostat, water pump, and coolant system flush',
    performedBy: 'City Truck Repair',
    invoiceNumber: 'INV-2024-1002',
    customFields: {
      'cf-3': 'High'
    },
    createdAt: new Date('2024-07-20'),
    createdBy: 'user-2'
  },
  {
    id: 'maint-3',
    truckId: 'truck-3',
    type: 'Brake Inspection' as MaintenanceType,
    date: new Date('2024-07-22'),
    mileage: 186800,
    cost: 275.00,
    notes: 'Annual brake inspection - all systems pass, adjusted slack adjusters',
    performedBy: 'Safety First Inspections',
    invoiceNumber: 'INV-2024-1003',
    customFields: {
      'cf-3': 'Low'
    },
    createdAt: new Date('2024-07-22'),
    createdBy: 'user-1'
  },
  {
    id: 'maint-4',
    truckId: 'truck-4',
    type: 'Tire Replacement' as MaintenanceType,
    date: new Date('2024-07-25'),
    mileage: 411800,
    cost: 4785.50,
    notes: 'Replaced all 6 drive tires - showing significant wear, wheel alignment performed',
    performedBy: 'Big Rig Tire Center',
    invoiceNumber: 'INV-2024-1004',
    customFields: {
      'cf-3': 'Critical'
    },
    createdAt: new Date('2024-07-25'),
    createdBy: 'user-2'
  },
  {
    id: 'maint-5',
    truckId: 'truck-5',
    type: 'DOT Inspection' as MaintenanceType,
    date: new Date('2024-08-01'),
    mileage: 88950,
    cost: 185.00,
    notes: 'Annual DOT inspection completed - all systems pass, documentation updated',
    performedBy: 'Certified DOT Inspector',
    invoiceNumber: 'INV-2024-1005',
    customFields: {
      'cf-3': 'Medium'
    },
    createdAt: new Date('2024-08-01'),
    createdBy: 'user-1'
  }
];

export const mockMaintenanceReminders: MaintenanceReminder[] = [
  {
    id: 'rem-1',
    truckId: 'truck-1',
    type: 'Oil Change' as MaintenanceType,
    reminderType: 'mileage',
    mileageInterval: 15000,
    lastMileage: 343000,
    nextDue: 358000,
    isOverdue: false,
    isActive: true,
    notificationsSent: 0,
    createdBy: 'user-1',
    createdAt: new Date('2024-07-15')
  },
  {
    id: 'rem-2',
    truckId: 'truck-3',
    type: 'DOT Inspection' as MaintenanceType,
    reminderType: 'date',
    dateInterval: 365,
    lastPerformed: new Date('2023-07-22'),
    nextDue: new Date('2024-07-22'),
    isOverdue: true,
    isActive: true,
    notificationsSent: 2,
    customMessage: 'Annual DOT inspection is overdue - schedule immediately',
    createdBy: 'user-1',
    createdAt: new Date('2023-07-22')
  }
];

export const mockParts: Part[] = [
  {
    id: 'part-1',
    name: 'Engine Oil Filter',
    partNumber: 'FLT-ENG-001',
    category: 'Filters' as PartCategory,
    cost: 47.25,
    supplier: 'Fleet Parts Supply',
    supplierPartNumber: 'FPS-12345',
    inventoryLevel: 24,
    minStockLevel: 10,
    location: 'Warehouse A - Shelf 12',
    createdAt: new Date('2023-01-01'),
    createdBy: 'user-1'
  },
  {
    id: 'part-2',
    name: '15W-40 Engine Oil (5 Gallon)',
    partNumber: 'OIL-ENG-002',
    category: 'Fluids' as PartCategory,
    cost: 167.50,
    supplier: 'Lubricants Direct',
    supplierPartNumber: 'LD-15W40-5G',
    inventoryLevel: 8,
    minStockLevel: 5,
    location: 'Warehouse B - Bay 3',
    createdAt: new Date('2023-01-01'),
    createdBy: 'user-1'
  },
  {
    id: 'part-3',
    name: 'Brake Pads (Set of 4)',
    partNumber: 'BRK-PAD-003',
    category: 'Brakes' as PartCategory,
    cost: 285.75,
    supplier: 'Brake Solutions Inc',
    supplierPartNumber: 'BSI-BP-HD4',
    inventoryLevel: 6,
    minStockLevel: 4,
    location: 'Warehouse A - Shelf 8',
    createdAt: new Date('2023-01-15'),
    createdBy: 'user-1'
  },
  {
    id: 'part-4',
    name: 'Drive Tire 11R22.5',
    partNumber: 'TIR-DRV-004',
    category: 'Tires' as PartCategory,
    cost: 695.00,
    supplier: 'Commercial Tire Depot',
    supplierPartNumber: 'CTD-11R225-DR',
    inventoryLevel: 12,
    minStockLevel: 8,
    location: 'Tire Storage - Row C',
    createdAt: new Date('2023-02-01'),
    createdBy: 'user-1'
  },
  {
    id: 'part-5',
    name: 'Coolant Thermostat',
    partNumber: 'COL-THM-005',
    category: 'Engine' as PartCategory,
    cost: 134.80,
    supplier: 'Engine Parts Plus',
    supplierPartNumber: 'EPP-THERM-180',
    inventoryLevel: 3,
    minStockLevel: 5,
    location: 'Warehouse A - Shelf 15',
    createdAt: new Date('2023-03-01'),
    createdBy: 'user-1'
  }
];

export const mockDowntimeEvents: DowntimeEvent[] = [
  {
    id: 'down-1',
    truckId: 'truck-2',
    startDate: new Date('2024-07-18'),
    endDate: new Date('2024-07-21'),
    cause: 'Unexpected Failure' as DowntimeCause,
    description: 'Engine overheating - thermostat and water pump failure',
    estimatedCost: 2800.00,
    actualCost: 3247.85,
    isOngoing: false,
    severity: 'high',
    createdAt: new Date('2024-07-18'),
    createdBy: 'user-2'
  },
  {
    id: 'down-2',
    truckId: 'truck-4',
    startDate: new Date('2024-07-23'),
    endDate: new Date('2024-07-26'),
    cause: 'Scheduled Maintenance' as DowntimeCause,
    description: 'Tire replacement and brake service',
    estimatedCost: 4500.00,
    actualCost: 4785.50,
    isOngoing: false,
    severity: 'medium',
    createdAt: new Date('2024-07-23'),
    createdBy: 'user-1'
  },
  {
    id: 'down-3',
    truckId: 'truck-3',
    startDate: new Date('2024-08-05'),
    cause: 'Waiting for Parts' as DowntimeCause,
    description: 'Transmission leak - waiting for seal kit delivery',
    estimatedCost: 1875.00,
    isOngoing: true,
    severity: 'medium',
    createdAt: new Date('2024-08-05'),
    createdBy: 'user-2'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    action: 'update',
    entityType: 'truck',
    entityId: 'truck-2',
    userId: 'user-2',
    userName: 'Sarah Johnson',
    changes: {
      status: { old: 'In Service', new: 'Out for Repair' },
      updatedAt: { old: '2024-07-15T10:00:00Z', new: '2024-07-18T14:30:00Z' }
    },
    timestamp: new Date('2024-07-18T14:30:00Z'),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ipAddress: '192.168.1.100'
  },
  {
    id: 'audit-2',
    action: 'create',
    entityType: 'maintenance',
    entityId: 'maint-2',
    userId: 'user-2',
    userName: 'Sarah Johnson',
    timestamp: new Date('2024-07-20T09:15:00Z'),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ipAddress: '192.168.1.100'
  },
  {
    id: 'audit-3',
    action: 'update',
    entityType: 'part',
    entityId: 'part-5',
    userId: 'user-1',
    userName: 'John Smith',
    changes: {
      inventoryLevel: { old: 5, new: 3 },
      updatedAt: { old: '2024-07-15T00:00:00Z', new: '2024-07-20T11:00:00Z' }
    },
    timestamp: new Date('2024-07-20T11:00:00Z'),
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    ipAddress: '192.168.1.101'
  }
];

export const mockFleetStats: FleetStats = {
  totalTrucks: 5,
  activeTrucks: 3,
  trucksInRepair: 1,
  totalDowntimeHours: 168,
  averageUptimePercentage: 92.5,
  totalMaintenanceCost: 8879.10,
  overdueMaintenanceCount: 1,
  costPerMile: 1.24,
  lastUpdated: new Date('2024-08-05T08:00:00Z')
};

// Legacy compatibility - maintaining the original mockData structure
export const mockData = {
  trucks: mockTrucks,
  maintenance: mockMaintenanceEntries,
  parts: mockParts,
  downtime: mockDowntimeEvents
};
