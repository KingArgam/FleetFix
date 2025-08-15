import { useState } from 'react';
import { 
  Truck, 
  MaintenanceEntry, 
  Part, 
  DowntimeEvent, 
  ValidationError, 
  TruckStatus
} from '../types';

export class DataService {
  private static instance: DataService;
  private trucks: Truck[] = [];
  private maintenanceEntries: MaintenanceEntry[] = [];
  private parts: Part[] = [];
  private downtimeEvents: DowntimeEvent[] = [];
  private currentUserId: string | null = null;

  private constructor() {
  this.loadFromStorage();
  }

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }


  private loadFromStorage(): void {
    try {
      if (!this.currentUserId) return;
      const storedTrucks = localStorage.getItem(`fleetfix_trucks_${this.currentUserId}`);
      const storedMaintenance = localStorage.getItem(`fleetfix_maintenance_${this.currentUserId}`);
      const storedParts = localStorage.getItem(`fleetfix_parts_${this.currentUserId}`);
      const storedDowntime = localStorage.getItem(`fleetfix_downtime_${this.currentUserId}`);

      this.trucks = storedTrucks ? JSON.parse(storedTrucks) : [];
      this.maintenanceEntries = storedMaintenance ? JSON.parse(storedMaintenance) : [];
      this.parts = storedParts ? JSON.parse(storedParts) : [];
      this.downtimeEvents = storedDowntime ? JSON.parse(storedDowntime) : [];
    } catch (error) {
      console.error('Error loading from storage:', error);
      this.trucks = [];
      this.maintenanceEntries = [];
      this.parts = [];
      this.downtimeEvents = [];
    }
  }


  private saveToStorage(): void {
    try {
      if (!this.currentUserId) return;
      localStorage.setItem(`fleetfix_trucks_${this.currentUserId}`, JSON.stringify(this.trucks));
      localStorage.setItem(`fleetfix_maintenance_${this.currentUserId}`, JSON.stringify(this.maintenanceEntries));
      localStorage.setItem(`fleetfix_parts_${this.currentUserId}`, JSON.stringify(this.parts));
      localStorage.setItem(`fleetfix_downtime_${this.currentUserId}`, JSON.stringify(this.downtimeEvents));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }


  private validateTruck(truck: Partial<Truck>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!truck.vin || truck.vin.length !== 17) {
      errors.push({ field: 'vin', message: 'VIN must be exactly 17 characters', code: 'INVALID_VIN' });
    }

    if (!truck.licensePlate || truck.licensePlate.trim().length === 0) {
      errors.push({ field: 'licensePlate', message: 'License plate is required', code: 'REQUIRED_FIELD' });
    }

    if (!truck.make || truck.make.trim().length === 0) {
      errors.push({ field: 'make', message: 'Make is required', code: 'REQUIRED_FIELD' });
    }

    if (!truck.model || truck.model.trim().length === 0) {
      errors.push({ field: 'model', message: 'Model is required', code: 'REQUIRED_FIELD' });
    }

    if (!truck.year || truck.year < 1990 || truck.year > new Date().getFullYear() + 1) {
      errors.push({ field: 'year', message: 'Year must be between 1990 and next year', code: 'INVALID_YEAR' });
    }

    if (!truck.mileage || truck.mileage < 0) {
      errors.push({ field: 'mileage', message: 'Mileage must be non-negative', code: 'INVALID_MILEAGE' });
    }


    if (truck.vin && this.trucks.some(t => t.vin === truck.vin && t.id !== truck.id)) {
      errors.push({ field: 'vin', message: 'VIN already exists', code: 'DUPLICATE_VIN' });
    }


    if (truck.licensePlate && this.trucks.some(t => t.licensePlate === truck.licensePlate && t.id !== truck.id)) {
      errors.push({ field: 'licensePlate', message: 'License plate already exists', code: 'DUPLICATE_LICENSE' });
    }

    return errors;
  }

  private validateMaintenanceEntry(entry: Partial<MaintenanceEntry>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!entry.truckId) {
      errors.push({ field: 'truckId', message: 'Truck selection is required', code: 'REQUIRED_FIELD' });
    }

    if (!entry.type) {
      errors.push({ field: 'type', message: 'Maintenance type is required', code: 'REQUIRED_FIELD' });
    }

    if (!entry.date) {
      errors.push({ field: 'date', message: 'Date is required', code: 'REQUIRED_FIELD' });
    } else if (entry.date > new Date()) {
      errors.push({ field: 'date', message: 'Date cannot be in the future', code: 'INVALID_DATE' });
    }

    if (!entry.cost || entry.cost < 0) {
      errors.push({ field: 'cost', message: 'Cost must be non-negative', code: 'INVALID_COST' });
    }

    if (!entry.mileage || entry.mileage < 0) {
      errors.push({ field: 'mileage', message: 'Mileage must be non-negative', code: 'INVALID_MILEAGE' });
    }


    if (entry.truckId && !this.trucks.find(t => t.id === entry.truckId)) {
      errors.push({ field: 'truckId', message: 'Selected truck does not exist', code: 'INVALID_TRUCK' });
    }

    return errors;
  }

  private validatePart(part: Partial<Part>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!part.name || part.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Part name is required', code: 'REQUIRED_FIELD' });
    }

    if (!part.partNumber || part.partNumber.trim().length === 0) {
      errors.push({ field: 'partNumber', message: 'Part number is required', code: 'REQUIRED_FIELD' });
    }

    if (!part.category) {
      errors.push({ field: 'category', message: 'Category is required', code: 'REQUIRED_FIELD' });
    }

    if (!part.cost || part.cost < 0) {
      errors.push({ field: 'cost', message: 'Cost must be non-negative', code: 'INVALID_COST' });
    }

    if (part.inventoryLevel !== undefined && part.inventoryLevel < 0) {
      errors.push({ field: 'inventoryLevel', message: 'Inventory level must be non-negative', code: 'INVALID_INVENTORY' });
    }

    if (part.minStockLevel !== undefined && part.minStockLevel < 0) {
      errors.push({ field: 'minStockLevel', message: 'Minimum stock level must be non-negative', code: 'INVALID_MIN_STOCK' });
    }


    if (part.partNumber && this.parts.some(p => p.partNumber === part.partNumber && p.id !== part.id)) {
      errors.push({ field: 'partNumber', message: 'Part number already exists', code: 'DUPLICATE_PART_NUMBER' });
    }

    return errors;
  }

  private logAuditEntry(action: 'create' | 'update' | 'delete', entityType: string, entityId: string, changes?: any) {
  return;
  }


  setCurrentUser(userId: string) {
    this.currentUserId = userId;
    this.loadFromStorage();
  }


  async createTruck(truckData: Omit<Truck, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<{ success: boolean; data?: Truck; errors?: ValidationError[] }> {
    const errors = this.validateTruck(truckData);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const newTruck: Truck = {
      ...truckData,
      id: `truck-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.currentUserId!,
      updatedBy: this.currentUserId!
    };

    this.trucks.push(newTruck);
  this.saveToStorage(); 
    this.logAuditEntry('create', 'truck', newTruck.id);

    return { success: true, data: newTruck };
  }

  async updateTruck(id: string, updates: Partial<Truck>): Promise<{ success: boolean; data?: Truck; errors?: ValidationError[] }> {
    const truckIndex = this.trucks.findIndex(t => t.id === id);
    if (truckIndex === -1) {
      return { success: false, errors: [{ field: 'id', message: 'Truck not found', code: 'NOT_FOUND' }] };
    }

    const currentTruck = this.trucks[truckIndex];
  const updatedTruck = { ...currentTruck, ...updates, id }; 

    const errors = this.validateTruck(updatedTruck);
    if (errors.length > 0) {
      return { success: false, errors };
    }


    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(updates).forEach(key => {
      if (currentTruck[key as keyof Truck] !== updates[key as keyof Truck]) {
        changes[key] = {
          old: currentTruck[key as keyof Truck],
          new: updates[key as keyof Truck]
        };
      }
    });

    updatedTruck.updatedAt = new Date();
  updatedTruck.updatedBy = this.currentUserId!;

    this.trucks[truckIndex] = updatedTruck;
    this.logAuditEntry('update', 'truck', id, changes);

    return { success: true, data: updatedTruck };
  }

  async deleteTruck(id: string): Promise<{ success: boolean; errors?: ValidationError[] }> {
    const truckIndex = this.trucks.findIndex(t => t.id === id);
    if (truckIndex === -1) {
      return { success: false, errors: [{ field: 'id', message: 'Truck not found', code: 'NOT_FOUND' }] };
    }


    const hasMaintenanceRecords = this.maintenanceEntries.some(m => m.truckId === id);
    const hasDowntimeRecords = this.downtimeEvents.some(d => d.truckId === id);

    if (hasMaintenanceRecords || hasDowntimeRecords) {
      return { 
        success: false, 
        errors: [{ 
          field: 'id', 
          message: 'Cannot delete truck with existing maintenance or downtime records', 
          code: 'HAS_DEPENDENCIES' 
        }] 
      };
    }

    this.trucks.splice(truckIndex, 1);
  this.saveToStorage(); 
    this.logAuditEntry('delete', 'truck', id);

    return { success: true };
  }

  getTrucks(): Truck[] {
    return [...this.trucks];
  }

  getTruck(id: string): Truck | undefined {
    return this.trucks.find(t => t.id === id);
  }


  async createMaintenanceEntry(entryData: Omit<MaintenanceEntry, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Promise<{ success: boolean; data?: MaintenanceEntry; errors?: ValidationError[] }> {
    const errors = this.validateMaintenanceEntry(entryData);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const newEntry: MaintenanceEntry = {
      ...entryData,
      id: `maint-${Date.now()}`,
      createdAt: new Date(),
  createdBy: this.currentUserId!
    };

    this.maintenanceEntries.push(newEntry);
  this.saveToStorage(); 
    this.logAuditEntry('create', 'maintenance', newEntry.id);

    return { success: true, data: newEntry };
  }

  async updateMaintenanceEntry(id: string, updates: Partial<MaintenanceEntry>): Promise<{ success: boolean; data?: MaintenanceEntry; errors?: ValidationError[] }> {
    const entryIndex = this.maintenanceEntries.findIndex(e => e.id === id);
    if (entryIndex === -1) {
      return { success: false, errors: [{ field: 'id', message: 'Maintenance entry not found', code: 'NOT_FOUND' }] };
    }

    const currentEntry = this.maintenanceEntries[entryIndex];
    const updatedEntry = { ...currentEntry, ...updates, id };

    const errors = this.validateMaintenanceEntry(updatedEntry);
    if (errors.length > 0) {
      return { success: false, errors };
    }


    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(updates).forEach(key => {
      if (currentEntry[key as keyof MaintenanceEntry] !== updates[key as keyof MaintenanceEntry]) {
        changes[key] = {
          old: currentEntry[key as keyof MaintenanceEntry],
          new: updates[key as keyof MaintenanceEntry]
        };
      }
    });

    updatedEntry.updatedAt = new Date();
  updatedEntry.updatedBy = this.currentUserId!;

    this.maintenanceEntries[entryIndex] = updatedEntry;
    this.logAuditEntry('update', 'maintenance', id, changes);

    return { success: true, data: updatedEntry };
  }

  async deleteMaintenanceEntry(id: string): Promise<{ success: boolean; errors?: ValidationError[] }> {
    const entryIndex = this.maintenanceEntries.findIndex(e => e.id === id);
    if (entryIndex === -1) {
      return { success: false, errors: [{ field: 'id', message: 'Maintenance entry not found', code: 'NOT_FOUND' }] };
    }

    this.maintenanceEntries.splice(entryIndex, 1);
  this.saveToStorage(); 
    this.logAuditEntry('delete', 'maintenance', id);

    return { success: true };
  }

  getMaintenanceEntries(truckId?: string): MaintenanceEntry[] {
    if (truckId) {
      return this.maintenanceEntries.filter(e => e.truckId === truckId);
    }
    return [...this.maintenanceEntries];
  }


  async createPart(partData: Omit<Part, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Promise<{ success: boolean; data?: Part; errors?: ValidationError[] }> {
    const errors = this.validatePart(partData);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const newPart: Part = {
      ...partData,
      id: `part-${Date.now()}`,
      createdAt: new Date(),
  createdBy: this.currentUserId!
    };

    this.parts.push(newPart);
  this.saveToStorage(); 
    this.logAuditEntry('create', 'part', newPart.id);

    return { success: true, data: newPart };
  }

  async updatePart(id: string, updates: Partial<Part>): Promise<{ success: boolean; data?: Part; errors?: ValidationError[] }> {
    const partIndex = this.parts.findIndex(p => p.id === id);
    if (partIndex === -1) {
      return { success: false, errors: [{ field: 'id', message: 'Part not found', code: 'NOT_FOUND' }] };
    }

    const currentPart = this.parts[partIndex];
    const updatedPart = { ...currentPart, ...updates, id };

    const errors = this.validatePart(updatedPart);
    if (errors.length > 0) {
      return { success: false, errors };
    }


    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(updates).forEach(key => {
      if (currentPart[key as keyof Part] !== updates[key as keyof Part]) {
        changes[key] = {
          old: currentPart[key as keyof Part],
          new: updates[key as keyof Part]
        };
      }
    });

    updatedPart.updatedAt = new Date();
  updatedPart.updatedBy = this.currentUserId!;

    this.parts[partIndex] = updatedPart;
    this.logAuditEntry('update', 'part', id, changes);

    return { success: true, data: updatedPart };
  }

  async deletePart(id: string): Promise<{ success: boolean; errors?: ValidationError[] }> {
    const partIndex = this.parts.findIndex(p => p.id === id);
    if (partIndex === -1) {
      return { success: false, errors: [{ field: 'id', message: 'Part not found', code: 'NOT_FOUND' }] };
    }

    this.parts.splice(partIndex, 1);
  this.saveToStorage(); 
    this.logAuditEntry('delete', 'part', id);

    return { success: true };
  }

  getParts(): Part[] {
    return [...this.parts];
  }


  searchTrucks(query: string): Truck[] {
    const searchTerm = query.toLowerCase();
    return this.trucks.filter(truck => 
      truck.make.toLowerCase().includes(searchTerm) ||
      truck.model.toLowerCase().includes(searchTerm) ||
      truck.licensePlate.toLowerCase().includes(searchTerm) ||
      truck.vin.toLowerCase().includes(searchTerm) ||
      (truck.nickname && truck.nickname.toLowerCase().includes(searchTerm))
    );
  }

  filterTrucksByStatus(status: TruckStatus[]): Truck[] {
    return this.trucks.filter(truck => status.includes(truck.status));
  }

  getMaintenanceByDateRange(startDate: Date, endDate: Date): MaintenanceEntry[] {
    return this.maintenanceEntries.filter(entry => 
      entry.date >= startDate && entry.date <= endDate
    );
  }

  getPartsLowStock(): Part[] {
    return this.parts.filter(part => 
      part.inventoryLevel !== undefined && 
      part.minStockLevel !== undefined && 
      part.inventoryLevel <= part.minStockLevel
    );
  }


  async bulkUpdateTruckStatus(truckIds: string[], status: TruckStatus): Promise<{ success: boolean; updatedCount: number; errors?: ValidationError[] }> {
    let updatedCount = 0;
    const errors: ValidationError[] = [];

    for (const truckId of truckIds) {
      const result = await this.updateTruck(truckId, { status });
      if (result.success) {
        updatedCount++;
      } else if (result.errors) {
        errors.push(...result.errors);
      }
    }

    return { success: errors.length === 0, updatedCount, errors: errors.length > 0 ? errors : undefined };
  }


  exportTrucksToCSV(): string {
    const headers = ['ID', 'VIN', 'License Plate', 'Make', 'Model', 'Year', 'Mileage', 'Status', 'Nickname'];
    const rows = this.trucks.map(truck => [
      truck.id,
      truck.vin,
      truck.licensePlate,
      truck.make,
      truck.model,
      truck.year,
      truck.mileage,
      truck.status,
      truck.nickname || ''
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  exportMaintenanceToCSV(): string {
    const headers = ['ID', 'Truck ID', 'Type', 'Date', 'Mileage', 'Cost', 'Performed By', 'Notes'];
    const rows = this.maintenanceEntries.map(entry => [
      entry.id,
      entry.truckId,
      entry.type,
      entry.date.toISOString().split('T')[0],
      entry.mileage,
      entry.cost,
      entry.performedBy || '',
      entry.notes || ''
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}


export function useDataService(userId: string) {
  const [dataService] = useState(() => {
    const ds = DataService.getInstance();
    ds.setCurrentUser(userId);
    return ds;
  });
  return { dataService };
}
