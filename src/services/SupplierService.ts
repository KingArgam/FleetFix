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
import { Supplier, SupplierPricing, SupplierContract, SupplierPerformance } from '../types/index';

export class SupplierService {
  private collectionName = 'suppliers';

  async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...supplier,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<void> {
    try {
      const supplierRef = doc(db, this.collectionName, supplierId);
      await updateDoc(supplierRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  async deleteSupplier(supplierId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, supplierId), {
        isActive: false,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  async getSuppliers(activeOnly = true): Promise<Supplier[]> {
    try {
      let q = query(collection(db, this.collectionName), orderBy('name', 'asc'));
      
      if (activeOnly) {
        q = query(
          collection(db, this.collectionName),
          where('isActive', '==', true),
          orderBy('name', 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Supplier[];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  }

  async getSupplier(supplierId: string): Promise<Supplier | null> {
    try {
      const docRef = doc(db, this.collectionName, supplierId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Supplier;
      }
      return null;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }
  }

  async getSuppliersByCategory(category: string): Promise<Supplier[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('categories', 'array-contains', category),
        where('isActive', '==', true),
        orderBy('rating', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Supplier[];
    } catch (error) {
      console.error('Error fetching suppliers by category:', error);
      throw error;
    }
  }

  async updateSupplierPerformance(supplierId: string, performance: Partial<SupplierPerformance>): Promise<void> {
    try {
      const supplierRef = doc(db, this.collectionName, supplierId);
      await updateDoc(supplierRef, {
        performance: {
          ...performance,
          lastUpdated: Timestamp.now()
        },
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating supplier performance:', error);
      throw error;
    }
  }

  async addSupplierPricing(supplierId: string, pricing: SupplierPricing): Promise<void> {
    try {
      const supplier = await this.getSupplier(supplierId);
      if (!supplier) throw new Error('Supplier not found');

      const updatedPricing = [...(supplier.pricing || []), {
        ...pricing,
        validFrom: pricing.validFrom,
        validTo: pricing.validTo
      }];

      await this.updateSupplier(supplierId, { pricing: updatedPricing });
    } catch (error) {
      console.error('Error adding supplier pricing:', error);
      throw error;
    }
  }

  async updateSupplierPricing(supplierId: string, partId: string, updates: Partial<SupplierPricing>): Promise<void> {
    try {
      const supplier = await this.getSupplier(supplierId);
      if (!supplier) throw new Error('Supplier not found');

      const updatedPricing = supplier.pricing?.map(p => 
        p.partId === partId ? { ...p, ...updates } : p
      ) || [];

      await this.updateSupplier(supplierId, { pricing: updatedPricing });
    } catch (error) {
      console.error('Error updating supplier pricing:', error);
      throw error;
    }
  }

  async getSupplierPricingForPart(partId: string): Promise<Array<Supplier & { pricing: SupplierPricing }>> {
    try {
      const suppliers = await this.getSuppliers();
      const suppliersWithPricing = suppliers
        .map(supplier => {
          const pricing = supplier.pricing?.find(p => p.partId === partId);
          return pricing ? { ...supplier, pricing } : null;
        })
        .filter((item): item is Supplier & { pricing: SupplierPricing } => item !== null)
        .sort((a, b) => a.pricing.price - b.pricing.price);
      
      return suppliersWithPricing;
    } catch (error) {
      console.error('Error fetching supplier pricing for part:', error);
      throw error;
    }
  }

  async addSupplierContract(supplierId: string, contract: Omit<SupplierContract, 'id'>): Promise<void> {
    try {
      const supplier = await this.getSupplier(supplierId);
      if (!supplier) throw new Error('Supplier not found');

      const newContract = {
        ...contract,
        id: Date.now().toString(), 
        startDate: contract.startDate,
        endDate: contract.endDate
      };

      const updatedContracts = [...(supplier.contracts || []), newContract];
      await this.updateSupplier(supplierId, { contracts: updatedContracts });
    } catch (error) {
      console.error('Error adding supplier contract:', error);
      throw error;
    }
  }

  async searchSuppliers(searchTerm: string): Promise<Supplier[]> {
    try {
      const suppliers = await this.getSuppliers();
      return suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching suppliers:', error);
      throw error;
    }
  }

  async getTopSuppliers(limit = 5): Promise<Supplier[]> {
    try {
      const suppliers = await this.getSuppliers();
      return suppliers
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching top suppliers:', error);
      throw error;
    }
  }
}

export const supplierService = new SupplierService();
