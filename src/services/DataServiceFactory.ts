import { DataService } from './DataService';
import { BackendDataService } from './BackendDataService';
import { FirebaseDataService } from './FirebaseDataService';
import { currentConfig, isMockMode } from '../config/environment';

export interface IDataService {
  
}


export class DataServiceFactory {
  private static dataService: DataService | BackendDataService | FirebaseDataService | null = null;

  static getDataService(): DataService | BackendDataService | FirebaseDataService {
    if (!this.dataService) {
      if (process.env.REACT_APP_USE_FIREBASE === 'true') {
        
        this.dataService = FirebaseDataService.getInstance();
      } else if (!isMockMode() && currentConfig.AUTH_ENABLED) {
        
        this.dataService = new BackendDataService();
      } else {
        
        this.dataService = DataService.getInstance();
      }
    }
    return this.dataService;
  }

  static useFirebaseService(): void {
    this.dataService = FirebaseDataService.getInstance();
  }

  static useBackendService(): void {
    this.dataService = new BackendDataService();
  }

  static useMockService(): void {
    this.dataService = DataService.getInstance();
  }

  static getCurrentServiceType(): 'firebase' | 'backend' | 'mock' {
    if (this.dataService instanceof FirebaseDataService) {
      return 'firebase';
    } else if (this.dataService instanceof BackendDataService) {
      return 'backend';
    } else {
      return 'mock';
    }
  }

  static reset(): void {
    this.dataService = null;
  }
}

export default DataServiceFactory;

export {};
