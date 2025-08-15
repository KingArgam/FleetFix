

import { DataServiceFactory } from '../services/DataServiceFactory';
import { Truck, TruckStatus } from '../types';

export class FleetFixDataManager {
  private dataService: any;

  constructor() {
    
    this.dataService = DataServiceFactory.getDataService();
  }

  
  async addNewTruck(truckData: Omit<Truck, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) {
    try {
      console.log('Creating new truck:', truckData);
      const result = await this.dataService.createTruck(truckData);
      
      if (result.success && result.data) {
        console.log('Truck created successfully:', result.data);
        return result.data;
      } else {
        console.error('Failed to create truck:', result.errors);
        throw new Error(`Failed to create truck: ${result.errors?.[0]?.message}`);
      }
    } catch (error) {
      console.error('Error creating truck:', error);
      throw error;
    }
  }

  
  async getTrucksWithFilters(status?: TruckStatus[]) {
    try {
      const filters = status ? { status } : undefined;
      const trucks = await this.dataService.getTrucks(filters);
      console.log(`Retrieved ${trucks.length} trucks`);
      return trucks;
    } catch (error) {
      console.error('Error fetching trucks:', error);
      return [];
    }
  }

  
  async updateMultipleTruckStatus(truckIds: string[], newStatus: TruckStatus) {
    try {
      console.log(`Updating ${truckIds.length} trucks to status: ${newStatus}`);
      const result = await this.dataService.bulkUpdateTruckStatus(truckIds, newStatus);
      
      if (result.success) {
        console.log(`Successfully updated ${result.updatedCount} trucks`);
        return result.updatedCount;
      } else {
        console.error('Bulk update failed:', result.errors);
        throw new Error(`Bulk update failed: ${result.errors?.[0]?.message}`);
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  
  async exportFleetData() {
    try {
      console.log('Exporting fleet data...');
      const trucksCSV = await this.dataService.exportTrucksToCSV();
      const maintenanceCSV = await this.dataService.exportMaintenanceToCSV();
      
      
      this.downloadCSV(trucksCSV, 'fleet-trucks.csv');
      this.downloadCSV(maintenanceCSV, 'fleet-maintenance.csv');
      
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  
  async searchFleetData(query: string) {
    try {
      console.log('Searching fleet data for:', query);
      
      
      const [trucks, allParts] = await Promise.all([
        this.dataService.searchTrucks(query),
        this.dataService.getParts()
      ]);
      
      
      const lowStockParts = allParts.filter((part: any) => 
        part.inventoryLevel && part.minStockLevel && 
        part.inventoryLevel <= part.minStockLevel
      );
      
      return {
        trucks,
        lowStockParts: lowStockParts.filter((part: any) => 
          part.name.toLowerCase().includes(query.toLowerCase()) ||
          part.partNumber.toLowerCase().includes(query.toLowerCase())
        ),
        searchQuery: query
      };
    } catch (error) {
      console.error('Error searching fleet data:', error);
      return { trucks: [], lowStockParts: [], searchQuery: query };
    }
  }

  
  switchToMockMode() {
    console.log('Switching to mock data service');
    DataServiceFactory.reset();
    this.dataService = DataServiceFactory.getDataService();
  }

  switchToBackendMode() {
    console.log('Switching to backend data service');
    try {
      DataServiceFactory.reset();
      this.dataService = DataServiceFactory.getDataService();
    } catch (error) {
      console.warn('Failed to switch to backend, staying with current service:', error);
    }
  }

  
  getServiceInfo() {
    return {
      type: this.dataService.constructor.name,
      timestamp: new Date().toISOString()
    };
  }

  
  private downloadCSV(csvData: string, filename: string) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}