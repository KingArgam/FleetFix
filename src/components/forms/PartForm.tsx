import React, { useState, useEffect } from 'react';
import { Part, ValidationError, PartCategory } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import '../../styles/enhanced.css';

interface PartFormProps {
  part?: Part;
  onSuccess: (part: Part) => void;
  onCancel: () => void;
}

export const PartForm: React.FC<PartFormProps> = ({ part, onSuccess, onCancel }) => {
  const { state, addPart, updatePart } = useAppContext();
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: part?.name || '',
    partNumber: part?.partNumber || '',
    category: part?.category || 'Other' as PartCategory,
    cost: part?.cost?.toString() || '',
    supplier: part?.supplier || '',
    inventoryLevel: part?.inventoryLevel?.toString() || '',
    minStockLevel: part?.minStockLevel?.toString() || '',
    location: part?.location || ''
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {

    setSuppliers([
      'AutoZone',
      'NAPA Auto Parts', 
      'O\'Reilly Auto Parts',
      'Advance Auto Parts',
      'CarQuest',
      'Fleet Supply Co.'
    ]);
  }, []);

  const partCategories: PartCategory[] = [
    'Engine',
    'Transmission',
    'Brakes',
    'Tires',
    'Electrical',
    'Fluids',
    'Filters',
    'Body',
    'Suspension',
    'Other'
  ];

  const getFieldError = (fieldName: string): string | undefined => {
    const error = errors.find(e => e.field === fieldName);
    return error?.message;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.currentUser) {
      setErrors([{ field: 'general', message: 'User not authenticated', code: 'AUTH_ERROR' }]);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {

      const newPart: Part = {
        id: part?.id || Date.now().toString(),
        name: formData.name,
        partNumber: formData.partNumber,
        category: formData.category,
        cost: formData.cost === '' ? 0 : parseFloat(formData.cost),
        supplier: formData.supplier,
        inventoryLevel: formData.inventoryLevel === '' ? 0 : parseFloat(formData.inventoryLevel),
        minStockLevel: formData.minStockLevel === '' ? 0 : parseFloat(formData.minStockLevel),
        location: formData.location,
        createdAt: new Date(),
        createdBy: state.currentUser?.id || 'unknown'
      };
      
      if (part) {
        await updatePart(part.id, newPart);
      } else {
        await addPart(newPart);
      }
      
      onSuccess(newPart);
    } catch (error) {
      console.error('Error submitting part form:', error);
      if (error instanceof Error) {
        setErrors([{ field: 'general', message: error.message, code: 'SUBMIT_ERROR' }]);
      } else {
        setErrors([{ field: 'general', message: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }]);
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="part-form-overlay">
      <div className="part-form-modal">
        <div className="part-form-header">
          <h2>{part ? 'Edit Part' : 'Add New Part'}</h2>
          <button type="button" onClick={onCancel} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="part-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Part Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={getFieldError('name') ? 'error' : ''}
                required
              />
              {getFieldError('name') && <span className="error-message">{getFieldError('name')}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="partNumber">Part Number *</label>
              <input
                type="text"
                id="partNumber"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleInputChange}
                className={getFieldError('partNumber') ? 'error' : ''}
                required
              />
              {getFieldError('partNumber') && <span className="error-message">{getFieldError('partNumber')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={getFieldError('category') ? 'error' : ''}
                required
              >
                {partCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {getFieldError('category') && <span className="error-message">{getFieldError('category')}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="cost">Cost ($) *</label>
              <input
                type="number"
                id="cost"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={getFieldError('cost') ? 'error' : ''}
                required
              />
              {getFieldError('cost') && <span className="error-message">{getFieldError('cost')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="supplier">Supplier</label>
              <select
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
              >
                <option value="">Select a supplier...</option>
                {suppliers.map((supplier, index) => (
                  <option key={index} value={supplier}>
                    {supplier}
                  </option>
                ))}
                <option value="other">Other (Custom)</option>
              </select>
              {formData.supplier === 'other' && (
                <input
                  type="text"
                  placeholder="Enter custom supplier name"
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  style={{ marginTop: '8px' }}
                />
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="inventoryLevel">Current Inventory</label>
              <input
                type="number"
                id="inventoryLevel"
                name="inventoryLevel"
                value={formData.inventoryLevel}
                onChange={handleInputChange}
                min="0"
                className={getFieldError('inventoryLevel') ? 'error' : ''}
              />
              {getFieldError('inventoryLevel') && <span className="error-message">{getFieldError('inventoryLevel')}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="minStockLevel">Minimum Stock Level</label>
              <input
                type="number"
                id="minStockLevel"
                name="minStockLevel"
                value={formData.minStockLevel}
                onChange={handleInputChange}
                min="0"
                className={getFieldError('minStockLevel') ? 'error' : ''}
              />
              {getFieldError('minStockLevel') && <span className="error-message">{getFieldError('minStockLevel')}</span>}
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="location">Storage Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Warehouse A - Shelf 12"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : part ? 'Update Part' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
