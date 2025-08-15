import { 
  Truck, 
  MaintenanceEntry, 
  Part, 
  DowntimeEvent,
  ValidationError, 
  AuditLog,
  SearchFilters,
  TruckStatus,
  MaintenanceType,
  PartCategory,
  ApiResponse,
  PaginatedResponse
} from '../types';
import { apiService, ApiError } from './ApiService';


export class BackendDataService {
  private static instance: BackendDataService;

  static getInstance(): BackendDataService {
    if (!BackendDataService.instance) {
      BackendDataService.instance = new BackendDataService();
    }
    return BackendDataService.instance;
  }

  
  private handleApiError(error: any): { success: false; errors: ValidationError[] } {
    if (error instanceof ApiError) {
      
      if (error.statusCode === 400 && error.response?.validation) {
        
        return {
          success: false,
          errors: error.response.validation.map((v: any) => ({
            field: v.field,
            message: v.message,
            code: v.code || 'VALIDATION_ERROR'
          }))
        };
      }
      
      if (error.statusCode === 409) {
        
        return {
          success: false,
          errors: [{
            field: 'general',
            message: error.message,
            code: 'CONFLICT'
          }]
        };
      }
      
      if (error.statusCode === 404) {
        return {
          success: false,
          errors: [{
            field: 'id',
            message: 'Record not found',
            code: 'NOT_FOUND'
          }]
        };
      }
    }

    
    return {
      success: false,
      errors: [{
        field: 'general',
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      }]
    };
  }

  
  async createTruck(truckData: Omit<Truck, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<{ success: boolean; data?: Truck; errors?: ValidationError[] }> {
    try {
      const response = await apiService.post<Truck>('/trucks', truckData);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to create truck', code: 'CREATE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async updateTruck(id: string, updates: Partial<Truck>): Promise<{ success: boolean; data?: Truck; errors?: ValidationError[] }> {
    try {
      const response = await apiService.put<Truck>(`/trucks/${id}`, updates);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to update truck', code: 'UPDATE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async deleteTruck(id: string): Promise<{ success: boolean; errors?: ValidationError[] }> {
    try {
      const response = await apiService.delete(`/trucks/${id}`);
      
      if (response.success) {
        return { success: true };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to delete truck', code: 'DELETE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async getTrucks(filters?: SearchFilters): Promise<Truck[]> {
    try {
      const params: Record<string, any> = {};
      
      if (filters?.query) params.search = filters.query;
      if (filters?.status?.length) params.status = filters.status.join(',');
      if (filters?.dateRange?.start) params.startDate = filters.dateRange.start.toISOString();
      if (filters?.dateRange?.end) params.endDate = filters.dateRange.end.toISOString();
      
      const response = await apiService.get<PaginatedResponse<Truck>>('/trucks', params);
      
      if (response.success && response.data) {
        return response.data.items;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch trucks:', error);
      return [];
    }
  }

  async getTruck(id: string): Promise<Truck | undefined> {
    try {
      const response = await apiService.get<Truck>(`/trucks/${id}`);
      return response.success ? response.data : undefined;
    } catch (error) {
      console.error('Failed to fetch truck:', error);
      return undefined;
    }
  }

  
  async createMaintenanceEntry(entryData: Omit<MaintenanceEntry, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Promise<{ success: boolean; data?: MaintenanceEntry; errors?: ValidationError[] }> {
    try {
      const response = await apiService.post<MaintenanceEntry>('/maintenance', entryData);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to create maintenance entry', code: 'CREATE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async updateMaintenanceEntry(id: string, updates: Partial<MaintenanceEntry>): Promise<{ success: boolean; data?: MaintenanceEntry; errors?: ValidationError[] }> {
    try {
      const response = await apiService.put<MaintenanceEntry>(`/maintenance/${id}`, updates);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to update maintenance entry', code: 'UPDATE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async deleteMaintenanceEntry(id: string): Promise<{ success: boolean; errors?: ValidationError[] }> {
    try {
      const response = await apiService.delete(`/maintenance/${id}`);
      
      if (response.success) {
        return { success: true };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to delete maintenance entry', code: 'DELETE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async getMaintenanceEntries(truckId?: string, filters?: SearchFilters): Promise<MaintenanceEntry[]> {
    try {
      const params: Record<string, any> = {};
      
      if (truckId) params.truckId = truckId;
      if (filters?.query) params.search = filters.query;
      if (filters?.dateRange?.start) params.startDate = filters.dateRange.start.toISOString();
      if (filters?.dateRange?.end) params.endDate = filters.dateRange.end.toISOString();
      if (filters?.costRange?.min) params.minCost = filters.costRange.min;
      if (filters?.costRange?.max) params.maxCost = filters.costRange.max;
      
      const response = await apiService.get<PaginatedResponse<MaintenanceEntry>>('/maintenance', params);
      
      if (response.success && response.data) {
        return response.data.items;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch maintenance entries:', error);
      return [];
    }
  }

  
  async createPart(partData: Omit<Part, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Promise<{ success: boolean; data?: Part; errors?: ValidationError[] }> {
    try {
      const response = await apiService.post<Part>('/parts', partData);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to create part', code: 'CREATE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async updatePart(id: string, updates: Partial<Part>): Promise<{ success: boolean; data?: Part; errors?: ValidationError[] }> {
    try {
      const response = await apiService.put<Part>(`/parts/${id}`, updates);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to update part', code: 'UPDATE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async deletePart(id: string): Promise<{ success: boolean; errors?: ValidationError[] }> {
    try {
      const response = await apiService.delete(`/parts/${id}`);
      
      if (response.success) {
        return { success: true };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to delete part', code: 'DELETE_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async getParts(filters?: SearchFilters): Promise<Part[]> {
    try {
      const params: Record<string, any> = {};
      
      if (filters?.query) params.search = filters.query;
      if (filters?.status?.length) params.category = filters.status.join(',');
      if (filters?.costRange?.min) params.minCost = filters.costRange.min;
      if (filters?.costRange?.max) params.maxCost = filters.costRange.max;
      if (filters?.tags?.includes('low-stock')) params.lowStock = true;
      if (filters?.tags?.includes('out-of-stock')) params.outOfStock = true;
      
      const response = await apiService.get<PaginatedResponse<Part>>('/parts', params);
      
      if (response.success && response.data) {
        return response.data.items;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch parts:', error);
      return [];
    }
  }

  
  async searchTrucks(query: string): Promise<Truck[]> {
    return this.getTrucks({ query });
  }

  async filterTrucksByStatus(status: TruckStatus[]): Promise<Truck[]> {
    return this.getTrucks({ status });
  }

  async getMaintenanceByDateRange(startDate: Date, endDate: Date): Promise<MaintenanceEntry[]> {
    return this.getMaintenanceEntries(undefined, { dateRange: { start: startDate, end: endDate } });
  }

  async getPartsLowStock(): Promise<Part[]> {
    return this.getParts({ tags: ['low-stock'] });
  }

  
  async bulkUpdateTruckStatus(truckIds: string[], status: TruckStatus): Promise<{ success: boolean; updatedCount: number; errors?: ValidationError[] }> {
    try {
      const response = await apiService.post<{ updatedCount: number }>('/trucks/bulk-update-status', {
        truckIds,
        status
      });
      
      if (response.success && response.data) {
        return { success: true, updatedCount: response.data.updatedCount };
      }
      
      return {
        success: false,
        updatedCount: 0,
        errors: [{ field: 'general', message: response.error || 'Failed to update trucks', code: 'BULK_UPDATE_FAILED' }]
      };
    } catch (error) {
      const errorResult = this.handleApiError(error);
      return { ...errorResult, updatedCount: 0 };
    }
  }

  
  async exportTrucksToCSV(): Promise<string> {
    try {
      const response = await apiService.get<{ csv: string }>('/trucks/export/csv');
      
      if (response.success && response.data) {
        return response.data.csv;
      }
      
      throw new Error('Failed to export trucks');
    } catch (error) {
      console.error('Failed to export trucks:', error);
      throw error;
    }
  }

  async exportMaintenanceToCSV(): Promise<string> {
    try {
      const response = await apiService.get<{ csv: string }>('/maintenance/export/csv');
      
      if (response.success && response.data) {
        return response.data.csv;
      }
      
      throw new Error('Failed to export maintenance data');
    } catch (error) {
      console.error('Failed to export maintenance data:', error);
      throw error;
    }
  }

  
  async uploadMaintenanceImages(maintenanceId: string, files: File[]): Promise<{ success: boolean; imageUrls?: string[]; errors?: ValidationError[] }> {
    try {
      const uploadPromises = files.map(file => 
        apiService.uploadFile<{ url: string }>(`/maintenance/${maintenanceId}/images`, file)
      );
      
      const responses = await Promise.all(uploadPromises);
      const imageUrls = responses
        .filter((r: { success: boolean; data?: { url: string } }) => r.success && r.data)
        .map((r: { success: boolean; data?: { url: string } }) => r.data!.url);
      
      return { success: true, imageUrls };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  
  async importTrucksFromCSV(file: File): Promise<{ success: boolean; importedCount?: number; errors?: ValidationError[] }> {
    try {
      const response = await apiService.uploadFile<{ importedCount: number; errors?: any[] }>('/trucks/import/csv', file);
      
      if (response.success && response.data) {
        return { 
          success: true, 
          importedCount: response.data.importedCount,
          errors: response.data.errors?.map((e: any) => ({
            field: e.field,
            message: e.message,
            code: e.code || 'IMPORT_ERROR'
          }))
        };
      }
      
      return {
        success: false,
        errors: [{ field: 'general', message: response.error || 'Failed to import trucks', code: 'IMPORT_FAILED' }]
      };
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  
  async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    try {
      const params: Record<string, any> = {};
      if (entityType) params.entityType = entityType;
      if (entityId) params.entityId = entityId;
      
      const response = await apiService.get<PaginatedResponse<AuditLog>>('/audit-logs', params);
      
      if (response.success && response.data) {
        return response.data.items;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  
  async subscribeToUpdates(callback: (update: any) => void): Promise<WebSocket | null> {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          callback(update);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      return ws;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      return null;
    }
  }
}
