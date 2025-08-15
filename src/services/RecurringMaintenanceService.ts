import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { RecurringMaintenance, CalendarEvent, MaintenanceEntry } from '../types/index';
import { calendarService } from './CalendarService';
import { notificationService } from './NotificationService';

export class RecurringMaintenanceService {
  private collectionName = 'recurring_maintenance';

  async createRecurringMaintenance(maintenance: Omit<RecurringMaintenance, 'id' | 'createdAt' | 'updatedAt' | 'nextDueDate' | 'completedCount' | 'averageCost'>): Promise<string> {
    try {
      const nextDueDate = this.calculateNextDueDate(maintenance.schedule);
      
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...maintenance,
        nextDueDate: Timestamp.fromDate(nextDueDate),
        completedCount: 0,
        averageCost: maintenance.estimatedCost,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      
      if (maintenance.isActive) {
        const fullMaintenance: RecurringMaintenance = {
          id: docRef.id,
          ...maintenance,
          nextDueDate,
          completedCount: 0,
          averageCost: maintenance.estimatedCost,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await this.createCalendarEvents(docRef.id, fullMaintenance);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating recurring maintenance:', error);
      throw error;
    }
  }

  async updateRecurringMaintenance(maintenanceId: string, updates: Partial<RecurringMaintenance>): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      if (updates.schedule) {
        updateData.nextDueDate = Timestamp.fromDate(this.calculateNextDueDate(updates.schedule));
      }

      await updateDoc(doc(db, this.collectionName, maintenanceId), updateData);

      
      if (updates.schedule || updates.isActive === false) {
        await this.updateCalendarEvents(maintenanceId, updates);
      }
    } catch (error) {
      console.error('Error updating recurring maintenance:', error);
      throw error;
    }
  }

  async deleteRecurringMaintenance(maintenanceId: string): Promise<void> {
    try {
      
      await this.removeCalendarEvents(maintenanceId);
      
      
      await deleteDoc(doc(db, this.collectionName, maintenanceId));
    } catch (error) {
      console.error('Error deleting recurring maintenance:', error);
      throw error;
    }
  }

  async getRecurringMaintenance(activeOnly = true): Promise<RecurringMaintenance[]> {
    try {
      let q = query(collection(db, this.collectionName), orderBy('nextDueDate', 'asc'));
      
      if (activeOnly) {
        q = query(
          collection(db, this.collectionName),
          where('isActive', '==', true),
          orderBy('nextDueDate', 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          nextDueDate: data.nextDueDate?.toDate(),
          lastPerformed: data.lastPerformed?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as RecurringMaintenance;
      });
    } catch (error) {
      console.error('Error fetching recurring maintenance:', error);
      throw error;
    }
  }

  async getRecurringMaintenanceById(maintenanceId: string): Promise<RecurringMaintenance | null> {
    try {
      const docRef = doc(db, this.collectionName, maintenanceId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          nextDueDate: data.nextDueDate?.toDate(),
          lastPerformed: data.lastPerformed?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as RecurringMaintenance;
      }
      return null;
    } catch (error) {
      console.error('Error fetching recurring maintenance by ID:', error);
      throw error;
    }
  }

  async getOverdueMaintenance(): Promise<RecurringMaintenance[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true),
        where('nextDueDate', '<=', Timestamp.fromDate(now)),
        orderBy('nextDueDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          nextDueDate: data.nextDueDate?.toDate(),
          lastPerformed: data.lastPerformed?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as RecurringMaintenance;
      });
    } catch (error) {
      console.error('Error fetching overdue maintenance:', error);
      throw error;
    }
  }

  async markMaintenanceCompleted(maintenanceId: string, completedDate: Date, actualCost?: number): Promise<void> {
    try {
      const maintenance = await this.getRecurringMaintenanceById(maintenanceId);
      if (!maintenance) throw new Error('Maintenance not found');

      const newCompletedCount = maintenance.completedCount + 1;
      const newAverageCost = actualCost 
        ? ((maintenance.averageCost * maintenance.completedCount) + actualCost) / newCompletedCount
        : maintenance.averageCost;

      const nextDueDate = this.calculateNextDueDate(maintenance.schedule, completedDate);

      await updateDoc(doc(db, this.collectionName, maintenanceId), {
        lastPerformed: Timestamp.fromDate(completedDate),
        completedCount: newCompletedCount,
        averageCost: newAverageCost,
        nextDueDate: Timestamp.fromDate(nextDueDate),
        updatedAt: Timestamp.now()
      });

      
      await this.createCalendarEvents(maintenanceId, maintenance);

      
      notificationService.addNotification({
        type: 'maintenance',
        title: `${maintenance.name} Completed`,
        message: `Recurring maintenance "${maintenance.name}" has been completed. Next due: ${nextDueDate.toLocaleDateString()}`,
        priority: 'low',
        actionRequired: false,
        relatedEntity: {
          type: 'maintenance',
          id: maintenanceId,
          name: maintenance.name
        }
      });
    } catch (error) {
      console.error('Error marking maintenance completed:', error);
      throw error;
    }
  }

  async checkDueMaintenances(): Promise<void> {
    try {
      const allMaintenance = await this.getRecurringMaintenance(true);
      const now = new Date();

      for (const maintenance of allMaintenance) {
        const daysUntilDue = Math.ceil((maintenance.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        
        for (const daysBefore of maintenance.notifications.daysBeforeDue) {
          if (daysUntilDue === daysBefore) {
            const urgency = daysBefore <= 1 ? 'urgent' : daysBefore <= 7 ? 'high' : 'medium';
            
            notificationService.addNotification({
              type: 'maintenance',
              title: `Maintenance Due ${daysBefore === 0 ? 'Today' : `in ${daysBefore} day${daysBefore > 1 ? 's' : ''}`}`,
              message: `${maintenance.name} is ${daysBefore === 0 ? 'due today' : `due in ${daysBefore} day${daysBefore > 1 ? 's' : ''}`}. Estimated cost: $${maintenance.estimatedCost}`,
              priority: urgency,
              actionRequired: true,
              relatedEntity: {
                type: 'maintenance',
                id: maintenance.id,
                name: maintenance.name
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking due maintenances:', error);
      throw error;
    }
  }

  private calculateNextDueDate(schedule: RecurringMaintenance['schedule'], fromDate?: Date): Date {
    const baseDate = fromDate || schedule.startDate;
    const nextDate = new Date(baseDate);

    if (schedule.frequency === 'time' && schedule.timeInterval) {
      switch (schedule.timeInterval.unit) {
        case 'days':
          nextDate.setDate(nextDate.getDate() + schedule.timeInterval.value);
          break;
        case 'weeks':
          nextDate.setDate(nextDate.getDate() + (schedule.timeInterval.value * 7));
          break;
        case 'months':
          nextDate.setMonth(nextDate.getMonth() + schedule.timeInterval.value);
          break;
        case 'years':
          nextDate.setFullYear(nextDate.getFullYear() + schedule.timeInterval.value);
          break;
      }
    }

    
    

    return nextDate;
  }

  private async createCalendarEvents(maintenanceId: string, maintenance: RecurringMaintenance): Promise<void> {
    try {
      
      await this.removeCalendarEvents(maintenanceId);

      
      for (const truckId of maintenance.truckIds) {
        const eventData: Omit<CalendarEvent, 'id'> = {
          title: `${maintenance.name} (Recurring)`,
          description: maintenance.description || '',
          start: maintenance.nextDueDate,
          end: new Date(maintenance.nextDueDate.getTime() + (maintenance.estimatedDuration * 60 * 1000)),
          type: 'maintenance',
          status: 'scheduled',
          priority: 'medium',
          truckId,
          assignedTo: maintenance.assignedTo,
          cost: maintenance.estimatedCost,
          notes: `Recurring maintenance - ${maintenance.instructions || ''}`,
          recurrence: {
            frequency: maintenance.schedule.timeInterval?.unit === 'days' ? 'daily' :
                      maintenance.schedule.timeInterval?.unit === 'weeks' ? 'weekly' :
                      maintenance.schedule.timeInterval?.unit === 'months' ? 'monthly' : 'yearly',
            interval: maintenance.schedule.timeInterval?.value || 1,
            endDate: maintenance.schedule.endDate
          },
          createdAt: new Date(),
          createdBy: maintenance.createdBy,
          updatedAt: new Date()
        };

        await calendarService.createEvent(eventData);
      }
    } catch (error) {
      console.error('Error creating calendar events for recurring maintenance:', error);
    }
  }

  private async updateCalendarEvents(maintenanceId: string, updates: Partial<RecurringMaintenance>): Promise<void> {
    try {
      if (updates.isActive === false) {
        
        await this.removeCalendarEvents(maintenanceId);
      } else {
        
        const maintenance = await this.getRecurringMaintenanceById(maintenanceId);
        if (maintenance) {
          await this.createCalendarEvents(maintenanceId, maintenance);
        }
      }
    } catch (error) {
      console.error('Error updating calendar events:', error);
    }
  }

  private async removeCalendarEvents(maintenanceId: string): Promise<void> {
    try {
      
      const events = await calendarService.getEvents();
      const relatedEvents = events.filter(event => 
        event.notes?.includes(`Recurring maintenance`) && 
        event.title.includes('(Recurring)')
      );

      for (const event of relatedEvents) {
        await calendarService.deleteEvent(event.id);
      }
    } catch (error) {
      console.error('Error removing calendar events:', error);
    }
  }

  async generateMaintenanceScheduleReport(truckId?: string): Promise<{
    upcomingMaintenance: Array<RecurringMaintenance & { daysUntilDue: number }>;
    overdueMaintenance: RecurringMaintenance[];
    completedThisMonth: number;
    estimatedMonthlyCost: number;
  }> {
    try {
      const allMaintenance = await this.getRecurringMaintenance(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      let filteredMaintenance = allMaintenance;
      if (truckId) {
        filteredMaintenance = allMaintenance.filter(m => m.truckIds.includes(truckId));
      }

      const upcomingMaintenance = filteredMaintenance
        .filter(m => m.nextDueDate > now)
        .map(m => ({
          ...m,
          daysUntilDue: Math.ceil((m.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      const overdueMaintenance = filteredMaintenance
        .filter(m => m.nextDueDate <= now);

      const completedThisMonth = filteredMaintenance
        .filter(m => m.lastPerformed && m.lastPerformed >= monthStart && m.lastPerformed <= monthEnd)
        .length;

      const estimatedMonthlyCost = filteredMaintenance
        .filter(m => m.nextDueDate >= monthStart && m.nextDueDate <= monthEnd)
        .reduce((total, m) => total + m.estimatedCost, 0);

      return {
        upcomingMaintenance,
        overdueMaintenance,
        completedThisMonth,
        estimatedMonthlyCost
      };
    } catch (error) {
      console.error('Error generating maintenance schedule report:', error);
      throw error;
    }
  }

  async startMaintenanceScheduler(): Promise<() => void> {
    
    const intervalId = setInterval(() => {
      this.checkDueMaintenances();
    }, 60 * 60 * 1000); 

    
    this.checkDueMaintenances();

    return () => {
      clearInterval(intervalId);
    };
  }
}

export const recurringMaintenanceService = new RecurringMaintenanceService();
