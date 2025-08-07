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
  getDoc
} from 'firebase/firestore';
import { CalendarEvent } from '../types/index';

export class CalendarService {
  private collectionName = 'calendar_events';

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...event,
        start: Timestamp.fromDate(new Date(event.start)),
        end: event.end ? Timestamp.fromDate(new Date(event.end)) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      if (updates.start) {
        updateData.start = Timestamp.fromDate(new Date(updates.start));
      }
      if (updates.end) {
        updateData.end = Timestamp.fromDate(new Date(updates.end));
      }

      await updateDoc(eventRef, updateData);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, eventId));
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  async getEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      let q = query(collection(db, this.collectionName), orderBy('start', 'asc'));
      
      if (startDate && endDate) {
        q = query(
          collection(db, this.collectionName),
          where('start', '>=', Timestamp.fromDate(startDate)),
          where('start', '<=', Timestamp.fromDate(endDate)),
          orderBy('start', 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start: data.start.toDate(),
          end: data.end ? data.end.toDate() : null,
        } as CalendarEvent;
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  async getEventsByTruck(truckId: string): Promise<CalendarEvent[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('truckId', '==', truckId),
        orderBy('start', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start: data.start.toDate(),
          end: data.end ? data.end.toDate() : null,
        } as CalendarEvent;
      });
    } catch (error) {
      console.error('Error fetching events by truck:', error);
      throw error;
    }
  }

  async updateEventStatus(eventId: string, status: CalendarEvent['status']): Promise<void> {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      await updateDoc(eventRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      throw error;
    }
  }

  async bulkUpdateEvents(updates: Array<{ id: string; updates: Partial<CalendarEvent> }>): Promise<void> {
    try {
      const batch = updates.map(async ({ id, updates }) => {
        await this.updateEvent(id, updates);
      });
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error bulk updating events:', error);
      throw error;
    }
  }
}

export const calendarService = new CalendarService();
