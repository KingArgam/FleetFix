import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { StockAlert, Part } from '../types/index';
import { notificationService } from './NotificationService';

export class StockAlertService {
  private collectionName = 'stock_alerts';
  private partsCollectionName = 'parts';

  async createStockAlert(alert: Omit<StockAlert, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...alert,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating stock alert:', error);
      throw error;
    }
  }

  async updateStockAlert(alertId: string, updates: Partial<StockAlert>): Promise<void> {
    try {
      const alertRef = doc(db, this.collectionName, alertId);
      const updateData: any = { ...updates };
      
      if (updates.lastTriggered) {
        updateData.lastTriggered = Timestamp.fromDate(updates.lastTriggered);
      }
      if (updates.acknowledgedAt) {
        updateData.acknowledgedAt = Timestamp.fromDate(updates.acknowledgedAt);
      }

      await updateDoc(alertRef, updateData);
    } catch (error) {
      console.error('Error updating stock alert:', error);
      throw error;
    }
  }

  async deleteStockAlert(alertId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, alertId));
    } catch (error) {
      console.error('Error deleting stock alert:', error);
      throw error;
    }
  }

  async getStockAlerts(activeOnly = true): Promise<StockAlert[]> {
    try {
      let q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      
      if (activeOnly) {
        q = query(
          collection(db, this.collectionName),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastTriggered: data.lastTriggered?.toDate(),
          acknowledgedAt: data.acknowledgedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
        } as StockAlert;
      });
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      throw error;
    }
  }

  async getAlertsByType(alertType: StockAlert['alertType']): Promise<StockAlert[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('alertType', '==', alertType),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastTriggered: data.lastTriggered?.toDate(),
          acknowledgedAt: data.acknowledgedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
        } as StockAlert;
      });
    } catch (error) {
      console.error('Error fetching alerts by type:', error);
      throw error;
    }
  }

  async getCriticalAlerts(): Promise<StockAlert[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('severity', '==', 'critical'),
        where('isActive', '==', true),
        where('acknowledged', '==', false),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastTriggered: data.lastTriggered?.toDate(),
          acknowledgedAt: data.acknowledgedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
        } as StockAlert;
      });
    } catch (error) {
      console.error('Error fetching critical alerts:', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string, notes?: string): Promise<void> {
    try {
      await this.updateStockAlert(alertId, {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date(),
        notes
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  async checkStockLevels(): Promise<void> {
    try {
      
      const partsQuery = query(
        collection(db, this.partsCollectionName),
        where('inventoryLevel', '>=', 0)
      );
      
      const partsSnapshot = await getDocs(partsQuery);
      const parts = partsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Part[];

      
      for (const part of parts) {
        await this.checkPartStockLevel(part);
      }
    } catch (error) {
      console.error('Error checking stock levels:', error);
      throw error;
    }
  }

  private async checkPartStockLevel(part: Part): Promise<void> {
    try {
      const currentStock = part.inventoryLevel || 0;
      const minStock = part.minStockLevel || 0;
      const reorderPoint = Math.max(minStock, Math.ceil(minStock * 1.2)); 

      let alertType: StockAlert['alertType'] | null = null;
      let severity: StockAlert['severity'] = 'info';

      if (currentStock === 0) {
        alertType = 'out_of_stock';
        severity = 'critical';
      } else if (currentStock <= minStock) {
        alertType = 'low_stock';
        severity = currentStock <= minStock * 0.5 ? 'critical' : 'warning';
      } else if (currentStock > minStock * 3) {
        alertType = 'overstock';
        severity = 'info';
      }

      if (alertType) {
        
        const existingAlertsQuery = query(
          collection(db, this.collectionName),
          where('partId', '==', part.id),
          where('alertType', '==', alertType),
          where('isActive', '==', true)
        );

        const existingAlerts = await getDocs(existingAlertsQuery);
        
        if (existingAlerts.empty) {
          
          const newAlert: Omit<StockAlert, 'id' | 'createdAt'> = {
            partId: part.id,
            partName: part.name,
            partNumber: part.partNumber,
            currentStock,
            minimumStock: minStock,
            reorderPoint,
            alertType,
            severity,
            isActive: true,
            lastTriggered: new Date(),
            acknowledged: false,
            suggestedReorderQuantity: this.calculateReorderQuantity(part),
            estimatedCost: (part.cost || 0) * this.calculateReorderQuantity(part)
          };

          const alertId = await this.createStockAlert(newAlert);

          
          await notificationService.addNotification({
            type: severity === 'critical' ? 'alert' : 'part',
            title: `Stock Alert: ${part.name}`,
            message: this.getAlertMessage(alertType, part.name, currentStock, minStock),
            priority: severity === 'critical' ? 'high' : 'medium',
            actionRequired: alertType !== 'overstock',
            relatedEntity: {
              type: 'part',
              id: part.id,
              name: part.name
            }
          });
        } else {
          
          const existingAlert = existingAlerts.docs[0];
          await this.updateStockAlert(existingAlert.id, {
            currentStock,
            lastTriggered: new Date(),
            severity,
            suggestedReorderQuantity: this.calculateReorderQuantity(part),
            estimatedCost: (part.cost || 0) * this.calculateReorderQuantity(part)
          });
        }
      } else {
        
        const existingAlertsQuery = query(
          collection(db, this.collectionName),
          where('partId', '==', part.id),
          where('isActive', '==', true)
        );

        const existingAlerts = await getDocs(existingAlertsQuery);
        for (const alertDoc of existingAlerts.docs) {
          await this.updateStockAlert(alertDoc.id, { isActive: false });
        }
      }
    } catch (error) {
      console.error('Error checking part stock level:', error);
    }
  }

  private calculateReorderQuantity(part: Part): number {
    const minStock = part.minStockLevel || 0;
    const currentStock = part.inventoryLevel || 0;
    
    
    
    const baseReorderQuantity = Math.max(minStock * 2, 10);
    const shortage = Math.max(0, minStock - currentStock);
    
    return baseReorderQuantity + shortage;
  }

  private getAlertMessage(alertType: StockAlert['alertType'], partName: string, currentStock: number, minStock: number): string {
    switch (alertType) {
      case 'out_of_stock':
        return `${partName} is out of stock. Immediate reorder required.`;
      case 'low_stock':
        return `${partName} is running low (${currentStock} remaining, minimum: ${minStock}). Consider reordering.`;
      case 'overstock':
        return `${partName} is overstocked (${currentStock} in inventory). Consider adjusting order quantities.`;
      default:
        return `Stock alert for ${partName}`;
    }
  }

  async startStockMonitoring(): Promise<() => void> {
    
    const partsQuery = query(collection(db, this.partsCollectionName));
    
    const unsubscribe = onSnapshot(partsQuery, async (snapshot) => {
      const changedParts = snapshot.docChanges()
        .filter(change => change.type === 'modified')
        .map(change => ({
          id: change.doc.id,
          ...change.doc.data()
        })) as Part[];

      
      for (const part of changedParts) {
        await this.checkPartStockLevel(part);
      }
    });

    
    const intervalId = setInterval(() => {
      this.checkStockLevels();
    }, 60 * 60 * 1000); 

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }

  async generateStockReport(): Promise<{
    summary: {
      totalAlerts: number;
      criticalAlerts: number;
      outOfStock: number;
      lowStock: number;
      overstock: number;
    };
    alerts: StockAlert[];
  }> {
    try {
      const alerts = await this.getStockAlerts(true);
      
      const summary = {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        outOfStock: alerts.filter(a => a.alertType === 'out_of_stock').length,
        lowStock: alerts.filter(a => a.alertType === 'low_stock').length,
        overstock: alerts.filter(a => a.alertType === 'overstock').length
      };

      return { summary, alerts };
    } catch (error) {
      console.error('Error generating stock report:', error);
      throw error;
    }
  }
}

export const stockAlertService = new StockAlertService();
