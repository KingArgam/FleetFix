import React, { useState } from 'react';
import { Truck, TruckStatus, ValidationError } from '../../types';
import { useAppContext } from '../../contexts/AppContext';

import '../../styles/enhanced.css';

interface TruckFormProps {
  truck?: Truck;
  onSuccess: (truck: Truck) => void;
  onCancel: () => void;
}

export const TruckForm: React.FC<TruckFormProps> = ({ truck, onSuccess, onCancel }) => {
  const { state, addTruck, updateTruck } = useAppContext();
  const [formData, setFormData] = useState({
    vin: truck?.vin || '',
    licensePlate: truck?.licensePlate || '',
    make: truck?.make || '',
    model: truck?.model || '',
    year: truck?.year || new Date().getFullYear(),
    mileage: truck?.mileage || '',
    nickname: truck?.nickname || '',
    status: truck?.status || 'In Service' as TruckStatus,
    customFields: truck?.customFields || {}
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);


  const truckCustomFields: any[] = [];

  const getFieldError = (fieldName: string): string | undefined => {
    const error = errors.find(e => e.field === fieldName);
    return error?.message;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || new Date().getFullYear() : 
              name === 'mileage' ? (value === '' ? '' : parseInt(value) || '') : value
    }));
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    try {

      const truckData: Truck = {
        id: truck?.id || Date.now().toString(),
        vin: formData.vin,
        licensePlate: formData.licensePlate,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        mileage: typeof formData.mileage === 'string' && formData.mileage === '' ? 0 : 
                 typeof formData.mileage === 'number' ? formData.mileage : parseInt(formData.mileage) || 0,
        nickname: formData.nickname,
        status: formData.status as TruckStatus,
        customFields: formData.customFields,
        createdAt: truck?.createdAt || new Date(),
        updatedAt: new Date(),
        createdBy: truck?.createdBy || state.currentUser?.id || 'unknown',
        updatedBy: state.currentUser?.id || 'unknown'
      };

      if (truck) {

        await updateTruck(truck.id, truckData);
        onSuccess(truckData);
      } else {

        await addTruck(truckData);
        onSuccess(truckData);
      }
    } catch (error) {
      console.error('Error saving truck:', error);
      setErrors([{ field: 'general', message: 'Failed to save truck. Please try again.', code: 'SAVE_ERROR' }]);
    }
  };

  const statusOptions: TruckStatus[] = ['In Service', 'Out for Repair', 'Needs Attention', 'Retired'];

  return (
    <div className="truck-form-overlay">
      <div className="truck-form-modal">
        <div className="truck-form-header">
          <h2>{truck ? 'Edit Truck' : 'Add New Truck'}</h2>
          <button type="button" onClick={onCancel} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="truck-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="vin">VIN *</label>
              <input
                type="text"
                id="vin"
                name="vin"
                value={formData.vin}
                onChange={handleInputChange}
                maxLength={17}
                className={getFieldError('vin') ? 'error' : ''}
                required
              />
              {getFieldError('vin') && <span className="error-message">{getFieldError('vin')}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="licensePlate">License Plate *</label>
              <input
                type="text"
                id="licensePlate"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleInputChange}
                className={getFieldError('licensePlate') ? 'error' : ''}
                required
              />
              {getFieldError('licensePlate') && <span className="error-message">{getFieldError('licensePlate')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="make">Make *</label>
              <input
                type="text"
                id="make"
                name="make"
                value={formData.make}
                onChange={handleInputChange}
                className={getFieldError('make') ? 'error' : ''}
                required
              />
              {getFieldError('make') && <span className="error-message">{getFieldError('make')}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="model">Model *</label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                className={getFieldError('model') ? 'error' : ''}
                required
              />
              {getFieldError('model') && <span className="error-message">{getFieldError('model')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="year">Year *</label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                min="1990"
                max={new Date().getFullYear() + 1}
                className={getFieldError('year') ? 'error' : ''}
                required
              />
              {getFieldError('year') && <span className="error-message">{getFieldError('year')}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="mileage">Mileage *</label>
              <input
                type="number"
                id="mileage"
                name="mileage"
                value={formData.mileage}
                onChange={handleInputChange}
                min="0"
                className={getFieldError('mileage') ? 'error' : ''}
                required
              />
              {getFieldError('mileage') && <span className="error-message">{getFieldError('mileage')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nickname">Nickname</label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className={getFieldError('status') ? 'error' : ''}
                required
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              {getFieldError('status') && <span className="error-message">{getFieldError('status')}</span>}
            </div>
          </div>

          {truckCustomFields.length > 0 && (
            <div className="custom-fields-section">
              <h3>Additional Information</h3>
              {truckCustomFields.map(field => (
                <div key={field.id} className="form-group">
                  <label htmlFor={field.id}>
                    {field.name} {field.required && '*'}
                  </label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      id={field.id}
                      value={formData.customFields[field.id] || ''}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      id={field.id}
                      value={formData.customFields[field.id] || field.defaultValue || ''}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((option: string) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      id={field.id}
                      value={formData.customFields[field.id] || ''}
                      onChange={(e) => handleCustomFieldChange(field.id, parseFloat(e.target.value) || 0)}
                      required={field.required}
                    />
                  )}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      id={field.id}
                      value={formData.customFields[field.id] || ''}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      required={field.required}
                    />
                  )}
                  {field.type === 'boolean' && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        id={field.id}
                        checked={formData.customFields[field.id] || false}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                      />
                      <span className="checkmark"></span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {truck ? 'Update Truck' : 'Add Truck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
