import React, { useState } from 'react';
import userDataService, { MaintenanceData } from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';

interface MaintenanceFormProps {
  maintenance?: MaintenanceData;
  truckId?: string;
  onSuccess: (maintenance: MaintenanceData) => void;
  onCancel: () => void;
  trucks?: any[];
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ 
  maintenance, 
  truckId, 
  onSuccess, 
  onCancel,
  trucks = []
}) => {
  const { state } = useAppContext();
  const [formData, setFormData] = useState({
    truckId: maintenance?.truckId || truckId || '',
    type: maintenance?.type || 'scheduled',
    description: maintenance?.description || '',
    scheduledDate: maintenance?.scheduledDate ? new Date(maintenance.scheduledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: maintenance?.status || 'scheduled',
    cost: maintenance?.cost || 0,
    notes: maintenance?.notes || '',
    technician: maintenance?.technician || '',
    parts: maintenance?.parts || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const maintenanceTypes = ['scheduled', 'emergency', 'preventive'];
  const statusOptions = ['scheduled', 'in-progress', 'completed', 'cancelled'];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      if (maintenance) {
        // Update existing maintenance
        await userDataService.updateMaintenance(maintenance.id, {
          ...formData,
          scheduledDate: new Date(formData.scheduledDate),
          cost: Number(formData.cost),
        });
        onSuccess(maintenance);
      } else {
        // Create new maintenance
        const newMaintenanceId = await userDataService.createMaintenance(state.currentUser?.id || '', {
          ...formData,
          scheduledDate: new Date(formData.scheduledDate),
          cost: Number(formData.cost),
        });
        
        const newMaintenance: MaintenanceData = {
          ...formData,
          id: newMaintenanceId,
          userId: state.currentUser?.id || '',
          scheduledDate: new Date(formData.scheduledDate),
          cost: Number(formData.cost),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        onSuccess(newMaintenance);
      }
    } catch (error) {
      console.error('Error saving maintenance:', error);
      setErrors(['Failed to save maintenance. Please try again.']);
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
                {trucks.map(truck => (
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
              <label htmlFor="scheduledDate">Scheduled Date *</label>
              <input 
                type="date"
                id="scheduledDate"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cost">Cost</label>
              <input 
                type="number"
                id="cost"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                className="form-control"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cost">Cost ($)</label>
              <input 
                type="number"
                id="cost"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                className="form-control"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="technician">Technician</label>
              <input 
                type="text"
                id="technician"
                value={formData.technician}
                onChange={(e) => handleInputChange('technician', e.target.value)}
                className="form-control"
                placeholder="Mechanic name or shop"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select 
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="form-control"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
