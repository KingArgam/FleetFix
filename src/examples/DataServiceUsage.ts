// Example usage of the new DataServiceFactory for backend integration

import { DataServiceFactory } from '../services/DataServiceFactory';
import { Truck, TruckStatus } from '../types';

export class FleetFixDataManager {
  private dataService: any;

  constructor() {
    // Get the appropriate data service based on environment
    this.dataService = DataServiceFactory.getDataService();
  }

  // Example: Create a new truck with async/await
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

  // Example: Get all trucks with filtering
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

  // Example: Update truck status in bulk
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

  // Example: Export data to CSV
  async exportFleetData() {
    try {
      console.log('Exporting fleet data...');
      const trucksCSV = await this.dataService.exportTrucksToCSV();
      const maintenanceCSV = await this.dataService.exportMaintenanceToCSV();
      
      // Create downloadable files
      this.downloadCSV(trucksCSV, 'fleet-trucks.csv');
      this.downloadCSV(maintenanceCSV, 'fleet-maintenance.csv');
      
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Example: Search and filter operations
  async searchFleetData(query: string) {
    try {
      console.log('Searching fleet data for:', query);
      
      // Run searches in parallel
      const [trucks, allParts] = await Promise.all([
        this.dataService.searchTrucks(query),
        this.dataService.getParts()
      ]);
      
      // Filter for low stock parts
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

  // Example: Switch data service modes (useful for testing)
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

  // Get current service information
  getServiceInfo() {
    return {
      type: this.dataService.constructor.name,
      timestamp: new Date().toISOString()
    };
  }

  // Helper method to download CSV data
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

// Usage examples:

/*
// Create a new FleetFix data manager
const fleetManager = new FleetFixDataManager();

// Add a new truck
const newTruck = await fleetManager.addNewTruck({
  truckNumber: 'FL-001',
  make: 'Ford',
  model: 'Transit',
  year: 2023,
  vin: '1FTBW2CM5PKA12345',
  licensePlate: 'FLT-001',
  status: 'active',
  driver: 'John Doe',
  mileage: 1500,
  location: 'Denver, CO',
  customFields: {}
});

// Get all active trucks
const activeTrucks = await fleetManager.getTrucksWithFilters(['active']);

// Update multiple trucks to maintenance status
await fleetManager.updateMultipleTruckStatus(['truck1', 'truck2'], 'maintenance');

// Search fleet data
const searchResults = await fleetManager.searchFleetData('Ford');

// Export data
await fleetManager.exportFleetData();

// Check service info
console.log('Current service:', fleetManager.getServiceInfo());
*/
