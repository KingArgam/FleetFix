import React, { useState } from 'react';
import { SupplierData } from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';
import userDataService from '../../services/UserDataService';

import '../../styles/enhanced.css';

interface SupplierFormProps {
  supplier?: SupplierData;
  onSuccess: (supplier: SupplierData) => void;
  onCancel: () => void;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onSuccess, onCancel }) => {
  const { state } = useAppContext();
  const { currentUser } = state;

  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    website: supplier?.website || '',
    status: supplier?.status || 'active',
    paymentTerms: supplier?.paymentTerms || '',
    defaultLeadTimeDays: supplier?.defaultLeadTimeDays || 7,
    notes: supplier?.notes || ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'defaultLeadTimeDays' ? parseInt(value) || 7 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      console.error('No current user found');
      return;
    }

    if (!formData.name || !formData.name.trim()) {
      alert('Supplier name is required');
      return;
    }

    const supplierData = {
      ...formData,
      name: formData.name.trim(),
      defaultLeadTimeDays: formData.defaultLeadTimeDays || 7,
      // Provide default category for backend compatibility
      category: 'parts' as const
    };

    let result: SupplierData;
    
    if (supplier) {
      // Update existing supplier - prepare result immediately
      result = {
        ...supplier,
        ...supplierData,
        updatedAt: new Date()
      };
    } else {
      // Create new supplier - prepare result immediately with temporary ID
      result = {
        id: Date.now().toString(), // Temporary ID that will be replaced
        userId: currentUser.id,
        ...supplierData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Call onSuccess immediately for instant UI response
    onSuccess(result);

    // Handle backend operations in background
    try {
      if (supplier) {
        // Update existing supplier in background
        console.log('Updating existing supplier:', supplier.id);
        await userDataService.updateSupplier(supplier.id, {
          ...supplierData,
          updatedAt: new Date()
        });
        console.log('Supplier updated successfully');
      } else {
        // Create new supplier in background
        console.log('Creating new supplier:', supplierData);
        const supplierId = await userDataService.createSupplier(currentUser.id, supplierData);
        console.log('Supplier created successfully with ID:', supplierId);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save supplier. Please try again.';
      alert(errorMessage);
    }
  };

  const statusOptions = ['active', 'inactive'];

  return (
    <div className="truck-form-overlay">
      <div className="truck-form-modal">
        <div className="truck-form-header">
          <h2>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button type="button" onClick={onCancel} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="truck-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Company Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactPerson">Contact Person</label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                placeholder="Enter contact person name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full address"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="defaultLeadTimeDays">Lead Time (Days) *</label>
              <input
                type="number"
                id="defaultLeadTimeDays"
                name="defaultLeadTimeDays"
                value={formData.defaultLeadTimeDays}
                onChange={handleInputChange}
                placeholder="7"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="paymentTerms">Payment Terms</label>
              <input
                type="text"
                id="paymentTerms"
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleInputChange}
                placeholder="e.g., Net 30"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about this supplier"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};