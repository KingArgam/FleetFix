import React, { useState } from 'react';
import { MaintenanceEntry, MaintenanceType, Truck } from '../../types';
import { useAppContext } from '../../contexts/AppContext';

interface MaintenanceFormProps {
  maintenance?: MaintenanceEntry;
  truckId?: string;
  onSuccess: (maintenance: MaintenanceEntry) => void;
  onCancel: () => void;
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ 
  maintenance, 
  truckId, 
  onSuccess, 
  onCancel
}) => {
  const { state, updateMaintenance } = useAppContext();
  const [formData, setFormData] = useState({
    truckId: maintenance?.truckId || truckId || '',
    type: maintenance?.type || 'General Repair' as MaintenanceType,
    notes: maintenance?.notes || '',
    date: maintenance?.date ? new Date(maintenance.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    mileage: maintenance?.mileage || '',
    cost: maintenance?.cost || '',
    performedBy: maintenance?.performedBy || '',
    invoiceNumber: maintenance?.invoiceNumber || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const maintenanceTypes: MaintenanceType[] = [
    'Oil Change',
    'Tire Replacement', 
    'Brake Inspection',
    'Engine Service',
    'Transmission Service',
    'DOT Inspection',
    'General Repair',
    'Preventive Maintenance',
    'Emergency Repair',
    'Annual Inspection',
    'Safety Check'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {

      const maintenanceData: MaintenanceEntry = {
        id: maintenance?.id || Date.now().toString(),
        truckId: formData.truckId,
        type: formData.type,
        date: new Date(formData.date),
        mileage: typeof formData.mileage === 'string' && formData.mileage === '' ? 0 : 
                 typeof formData.mileage === 'number' ? formData.mileage : parseInt(formData.mileage) || 0,
        cost: typeof formData.cost === 'string' && formData.cost === '' ? 0 : 
              typeof formData.cost === 'number' ? formData.cost : parseFloat(formData.cost) || 0,
        notes: formData.notes,
        performedBy: formData.performedBy,
        invoiceNumber: formData.invoiceNumber,
        createdAt: maintenance?.createdAt || new Date(),
        createdBy: maintenance?.createdBy || state.currentUser?.id || 'unknown',
        updatedAt: new Date(),
        updatedBy: state.currentUser?.id || 'unknown'
      };

      if (maintenance) {

        await updateMaintenance(maintenance.id, maintenanceData);
        onSuccess(maintenanceData);
      } else {

        onSuccess(maintenanceData);
      }
    } catch (error) {
      console.error('Error saving maintenance:', error);
      alert('Failed to save maintenance record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{maintenance ? 'Edit Maintenance Entry' : 'Log New Maintenance'}</h2>
          <button type="button" onClick={onCancel} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="maintenance-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="truckId">Truck *</label>
              <select 
                id="truckId"
                value={formData.truckId}
                onChange={(e) => handleInputChange('truckId', e.target.value)}
                required
                className="form-control"
              >
                <option value="">Select a truck</option>
                {state.trucks.map((truck: Truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.nickname || truck.licensePlate} - {truck.make} {truck.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="type">Maintenance Type *</label>
              <select 
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                required
                className="form-control"
              >
                {maintenanceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mileage">Mileage</label>
              <input 
                type="number"
                id="mileage"
                value={formData.mileage}
                onChange={(e) => handleInputChange('mileage', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                className="form-control"
                min="0"
                placeholder="Current mileage"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cost">Cost ($)</label>
              <input 
                type="number"
                id="cost"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                className="form-control"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="performedBy">Performed By</label>
              <input 
                type="text"
                id="performedBy"
                value={formData.performedBy}
                onChange={(e) => handleInputChange('performedBy', e.target.value)}
                className="form-control"
                placeholder="Mechanic name or shop"
              />
            </div>

            <div className="form-group">
              <label htmlFor="invoiceNumber">Invoice Number</label>
              <input 
                type="text"
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                className="form-control"
                placeholder="INV-12345"
              />
            </div>

          </div>

          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea 
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="form-control"
              rows={4}
              placeholder="Additional notes about the maintenance..."
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Saving...' : (maintenance ? 'Update' : 'Save Maintenance')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceForm;
