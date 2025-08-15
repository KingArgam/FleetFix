import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Truck, Part } from '../../types';

interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: string[];
}

const BulkVehicleManager: React.FC = () => {
  const { state, addTruck, updateTruck, deleteTruck, addPart } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkOperationResult | null>(null);
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const importedTrucks: Truck[] = [];
      const errors: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim());
        
        try {
          const truck: Truck = {
            id: Date.now() + i + '',
            vin: values[headers.indexOf('VIN')] || '',
            licensePlate: values[headers.indexOf('License Plate')] || '',
            make: values[headers.indexOf('Make')] || '',
            model: values[headers.indexOf('Model')] || '',
            year: parseInt(values[headers.indexOf('Year')]) || new Date().getFullYear(),
            mileage: parseInt(values[headers.indexOf('Mileage')]) || 0,
            nickname: values[headers.indexOf('Nickname')] || '',
            status: (values[headers.indexOf('Status')] as any) || 'In Service',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'bulk-import',
            updatedBy: 'bulk-import'
          };
          
          if (truck.vin && truck.licensePlate && truck.make && truck.model) {
            importedTrucks.push(truck);
          } else {
            errors.push(`Row ${i + 1}: Missing required fields (VIN, License Plate, Make, Model)`);
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error}`);
        }
      }
      
      
      for (const truck of importedTrucks) {
        await addTruck(truck);
      }
      
      setUploadResult({
        success: true,
        processed: importedTrucks.length,
        errors
      });
    } catch (error) {
      setUploadResult({
        success: false,
        processed: 0,
        errors: [`File processing error: ${error}`]
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = () => {
    const trucks = state.trucks;
    if (trucks.length === 0) {
      alert('No trucks to export');
      return;
    }

    const csvHeaders = [
      'VIN',
      'License Plate',
      'Make',
      'Model',
      'Year',
      'Mileage',
      'Nickname',
      'Status',
      'Created Date'
    ];

    const csvContent = [
      csvHeaders.join(','),
  ...trucks.map((truck: Truck) => [
        truck.vin,
        truck.licensePlate,
        truck.make,
        truck.model,
        truck.year,
        truck.mileage,
        truck.nickname || '',
        truck.status,
        truck.createdAt.toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fleet-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (selectedTrucks.length === 0) {
      alert('Please select trucks to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedTrucks.length} truck(s)?`)) {
      return;
    }

    try {
      for (const truckId of selectedTrucks) {
        await deleteTruck(truckId);
      }
      setSelectedTrucks([]);
      alert(`Successfully deleted ${selectedTrucks.length} truck(s)`);
    } catch (error) {
      alert(`Error deleting trucks: ${error}`);
    }
  };

  const toggleTruckSelection = (truckId: string) => {
    setSelectedTrucks(prev => 
      prev.includes(truckId) 
        ? prev.filter(id => id !== truckId)
        : [...prev, truckId]
    );
  };

  const selectAllTrucks = () => {
    if (selectedTrucks.length === state.trucks.length) {
      setSelectedTrucks([]);
    } else {
  setSelectedTrucks(state.trucks.map((truck: Truck) => truck.id));
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'VIN',
      'License Plate',
      'Make',
      'Model',
      'Year',
      'Mileage',
      'Nickname',
      'Status'
    ];

    const templateContent = [
      templateHeaders.join(','),
      '1HGBH41JXMN109186,ABC-1234,Ford,F-150,2023,25000,Truck 1,In Service',
      '1HGBH41JXMN109187,DEF-5678,Chevrolet,Silverado,2022,30000,Truck 2,In Service'
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fleet-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bulk-vehicle-manager">
      <div className="page-header">
        <h1>Bulk Vehicle Management</h1>
        <p>Import, export, and manage multiple vehicles at once</p>
      </div>

      <div className="bulk-operations-grid">
        {}
        <div className="bulk-operation-card">
          <div className="card-header">
            <Upload className="card-icon" />
            <h3>Import Vehicles</h3>
          </div>
          <div className="card-content">
            <p>Upload a CSV file to import multiple vehicles at once.</p>
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="upload-button"
              >
                {isUploading ? 'Uploading...' : 'Choose CSV File'}
              </button>
              <button
                onClick={downloadTemplate}
                className="template-button"
              >
                <FileText size={16} />
                Download Template
              </button>
            </div>
            
            {uploadResult && (
              <div className={`upload-result ${uploadResult.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  {uploadResult.success ? (
                    <CheckCircle className="result-icon success" />
                  ) : (
                    <AlertCircle className="result-icon error" />
                  )}
                  <span>
                    {uploadResult.success 
                      ? `Successfully imported ${uploadResult.processed} vehicles`
                      : 'Import failed'
                    }
                  </span>
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="error-list">
                    <h4>Errors:</h4>
                    <ul>
                      {uploadResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {}
        <div className="bulk-operation-card">
          <div className="card-header">
            <Download className="card-icon" />
            <h3>Export Vehicles</h3>
          </div>
          <div className="card-content">
            <p>Export all vehicle data to a CSV file for backup or external use.</p>
            <button
              onClick={handleExport}
              className="export-button"
              disabled={state.trucks.length === 0}
            >
              <Download size={16} />
              Export All Vehicles ({state.trucks.length})
            </button>
          </div>
        </div>

        {}
        <div className="bulk-operation-card">
          <div className="card-header">
            <Trash2 className="card-icon danger" />
            <h3>Bulk Delete</h3>
          </div>
          <div className="card-content">
            <p>Select multiple vehicles to delete them all at once.</p>
            <div className="bulk-actions">
              <button
                onClick={selectAllTrucks}
                className="select-all-button"
              >
                {selectedTrucks.length === state.trucks.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedTrucks.length === 0}
                className="bulk-delete-button"
              >
                <Trash2 size={16} />
                Delete Selected ({selectedTrucks.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      {state.trucks.length > 0 && (
        <div className="vehicle-selection-table">
          <div className="table-header">
            <h3>Vehicle Selection</h3>
            <span>{selectedTrucks.length} of {state.trucks.length} selected</span>
          </div>
          <div className="table-container">
            <table className="bulk-manager-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedTrucks.length === state.trucks.length}
                      onChange={selectAllTrucks}
                    />
                  </th>
                  <th>License Plate</th>
                  <th>Make & Model</th>
                  <th>Year</th>
                  <th>Mileage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.trucks.map((truck: Truck) => (
                  <tr key={truck.id} className={selectedTrucks.includes(truck.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedTrucks.includes(truck.id)}
                        onChange={() => toggleTruckSelection(truck.id)}
                      />
                    </td>
                    <td>{truck.licensePlate}</td>
                    <td>{truck.make} {truck.model}</td>
                    <td>{truck.year}</td>
                    <td>{truck.mileage.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${truck.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {truck.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkVehicleManager;
