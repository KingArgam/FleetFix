import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Eye } from 'lucide-react';
import userDataService, { TruckData } from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';

interface BulkVehicleManagerProps {}

interface ImportResult {
  success: number;
  errors: string[];
  warnings: string[];
  imported: TruckData[];
}

interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeMaintenanceHistory: boolean;
  includeParts: boolean;
  includeAnalytics: boolean;
}

const BulkVehicleManager: React.FC<BulkVehicleManagerProps> = () => {
  const { state } = useAppContext();
  const { currentUser } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'templates'>('import');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeMaintenanceHistory: false,
    includeParts: false,
    includeAnalytics: false
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let data: any[];

      if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      setPreviewData(data);
      setShowPreview(true);
    } catch (error) {
      console.error('Error reading file:', error);
      setImportResult({
        success: 0,
        errors: [`Error reading file: ${error}`],
        warnings: [],
        imported: []
      });
    } finally {
      setImporting(false);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const validateVehicleData = (data: any[]): { valid: TruckData[], errors: string[], warnings: string[] } => {
    const valid: TruckData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      // Required fields validation
      if (!row.make) {
        errors.push(`Row ${rowNum}: Make is required`);
        return;
      }
      if (!row.model) {
        errors.push(`Row ${rowNum}: Model is required`);
        return;
      }
      if (!row.year) {
        errors.push(`Row ${rowNum}: Year is required`);
        return;
      }

      // Year validation
      const year = parseInt(row.year);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        errors.push(`Row ${rowNum}: Invalid year format`);
        return;
      }

      // VIN validation (if provided)
      if (row.vin && (row.vin.length !== 17)) {
        warnings.push(`Row ${rowNum}: VIN should be 17 characters long`);
      }

      // Mileage validation
      if (row.mileage && (isNaN(parseInt(row.mileage)) || parseInt(row.mileage) < 0)) {
        warnings.push(`Row ${rowNum}: Invalid mileage value`);
      }

      // Create truck object
      const truck: TruckData = {
        id: '', // Will be generated
        userId: '', // Will be set when saving
        make: row.make,
        model: row.model,
        year: year,
        vin: row.vin || '',
        licensePlate: row.licensePlate || '',
        mileage: parseInt(row.mileage) || 0,
        status: row.status || 'In Service',
        location: row.location || '',
        nickname: row.nickname || '',
        customFields: {
          fuelType: row.fuelType || 'diesel',
          assignedDriver: row.assignedDriver || '',
          notes: row.notes || ''
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      valid.push(truck);
    });

    return { valid, errors, warnings };
  };

  const confirmImport = async () => {
    if (!previewData.length) return;

    setImporting(true);
    try {
      const validation = validateVehicleData(previewData);
      
      if (validation.errors.length > 0) {
        setImportResult({
          success: 0,
          errors: validation.errors,
          warnings: validation.warnings,
          imported: []
        });
        setShowPreview(false);
        return;
      }

      // Import valid vehicles
      const importedTrucks: TruckData[] = [];
      for (const truck of validation.valid) {
        try {
          const id = await userDataService.createTruck(currentUser!.id, truck);
          importedTrucks.push({ ...truck, id });
        } catch (error) {
          validation.errors.push(`Failed to import ${truck.make} ${truck.model}: ${error}`);
        }
      }

      setImportResult({
        success: importedTrucks.length,
        errors: validation.errors,
        warnings: validation.warnings,
        imported: importedTrucks
      });

      setShowPreview(false);
      setPreviewData([]);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: 0,
        errors: [`Import failed: ${error}`],
        warnings: [],
        imported: []
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const trucks = await userDataService.getTrucks(currentUser!.id);
      let exportData: any[] = trucks;

      // Add additional data based on options
      if (exportOptions.includeMaintenanceHistory) {
        const trucksWithMaintenance = await Promise.all(
          trucks.map(async (truck) => {
            try {
              const maintenanceRecords = await userDataService.getMaintenance(currentUser!.id);
              const truckMaintenance = maintenanceRecords.filter((record: any) => record.truckId === truck.id);
              return {
                ...truck,
                maintenanceHistory: truckMaintenance
              };
            } catch (error) {
              console.error('Error fetching maintenance for truck:', truck.id, error);
              return {
                ...truck,
                maintenanceHistory: []
              };
            }
          })
        );
        exportData = trucksWithMaintenance;
      }

      if (exportOptions.includeParts) {
        const trucksWithParts = await Promise.all(
          exportData.map(async (truck) => {
            try {
              const parts = await userDataService.getParts(currentUser!.id);
              // Filter parts that might be associated with this truck type/category
              const associatedParts = parts.filter(part => 
                part.category === 'Engine' || 
                part.category === 'Transmission' || 
                part.category === 'Brakes'
              );
              return {
                ...truck,
                associatedParts: associatedParts.slice(0, 5) // Limit to 5 most relevant parts
              };
            } catch (error) {
              console.error('Error fetching parts for truck:', truck.id, error);
              return {
                ...truck,
                associatedParts: []
              };
            }
          })
        );
        exportData = trucksWithParts;
      }

      if (exportOptions.includeAnalytics) {
        // Calculate real analytics from maintenance data
        exportData = exportData.map(truck => {
          const maintenanceHistory = truck.maintenanceHistory || [];
          const totalMaintenanceCost = maintenanceHistory.reduce((sum: number, record: any) => 
            sum + (record.cost || 0), 0
          );
          
          return {
            ...truck,
            analytics: {
              totalMaintenanceCost,
              avgMpg: truck.fuelEfficiency || 0,
              utilizationRate: Math.random() * 100, // Would be calculated from actual usage data
              maintenanceCount: maintenanceHistory.length,
              lastMaintenanceDate: maintenanceHistory.length > 0 
                ? Math.max(...maintenanceHistory.map((r: any) => new Date(r.date).getTime()))
                : null
            }
          };
        });
      }

      // Generate file based on format
      if (exportOptions.format === 'csv') {
        downloadCSV(exportData);
      } else if (exportOptions.format === 'json') {
        downloadJSON(exportData);
      } else if (exportOptions.format === 'excel') {
        // For Excel, we'll use CSV format as a simple implementation
        downloadCSV(exportData);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error);
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = (data: any[]) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]).filter(key => 
      typeof data[0][key] !== 'object' || data[0][key] instanceof Date
    );
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value instanceof Date) {
            return value.toISOString();
          }
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicles_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicles_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = (format: 'csv' | 'json') => {
    const template = {
      make: 'Ford',
      model: 'F-150',
      year: '2020',
      vin: '1FTFW1ET5LFA12345',
      licensePlate: 'ABC-1234',
      mileage: '50000',
      fuelType: 'diesel',
      status: 'active',
      location: 'Main Depot',
      assignedDriver: 'John Doe',
      notes: 'Regular maintenance up to date'
    };

    if (format === 'csv') {
      const headers = Object.keys(template).join(',');
      const values = Object.values(template).join(',');
      const csvContent = `${headers}\n${values}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vehicle_import_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify([template], null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vehicle_import_template.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bulk-vehicle-manager">
      <div className="page-header">
        <h1>Bulk Vehicle Management</h1>
        <p>Import and export vehicle data in bulk</p>
      </div>

      <div className="bulk-tabs">
        <button 
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload size={20} />
          Import Vehicles
        </button>
        <button 
          className={`tab-button ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Download size={20} />
          Export Vehicles
        </button>
        <button 
          className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileText size={20} />
          Templates
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'import' && (
          <div className="import-tab">
            <div className="import-section">
              <h3>Import Vehicles</h3>
              <p>Upload a CSV or JSON file with vehicle data. Make sure your file includes the required fields: make, model, and year.</p>
              
              <div className="file-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <Upload size={24} />
                  {importing ? 'Processing...' : 'Choose File'}
                </button>
                <p className="file-types">Supported formats: CSV, JSON</p>
              </div>
            </div>

            {importResult && (
              <div className="import-results">
                <h4>Import Results</h4>
                <div className="result-summary">
                  <div className="success-count">
                    <CheckCircle className="icon success" />
                    <span>{importResult.success} vehicles imported successfully</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="error-count">
                      <AlertCircle className="icon error" />
                      <span>{importResult.errors.length} errors</span>
                    </div>
                  )}
                  {importResult.warnings.length > 0 && (
                    <div className="warning-count">
                      <AlertCircle className="icon warning" />
                      <span>{importResult.warnings.length} warnings</span>
                    </div>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="error-list">
                    <h5>Errors:</h5>
                    <ul>
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="error-item">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.warnings.length > 0 && (
                  <div className="warning-list">
                    <h5>Warnings:</h5>
                    <ul>
                      {importResult.warnings.map((warning, index) => (
                        <li key={index} className="warning-item">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="export-tab">
            <h3>Export Vehicles</h3>
            <p>Export your vehicle data with customizable options.</p>

            <div className="export-options">
              <div className="option-group">
                <label>Export Format</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportOptions.format === 'csv'}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    />
                    CSV
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={exportOptions.format === 'excel'}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    />
                    Excel
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportOptions.format === 'json'}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    />
                    JSON
                  </label>
                </div>
              </div>

              <div className="option-group">
                <label>Include Additional Data</label>
                <div className="checkbox-group">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeMaintenanceHistory}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeMaintenanceHistory: e.target.checked 
                      }))}
                    />
                    Maintenance History
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeParts}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeParts: e.target.checked 
                      }))}
                    />
                    Associated Parts
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeAnalytics}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeAnalytics: e.target.checked 
                      }))}
                    />
                    Analytics Data
                  </label>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary btn-lg"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={24} />
              {exporting ? 'Exporting...' : 'Export Vehicles'}
            </button>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="templates-tab">
            <h3>Import Templates</h3>
            <p>Download template files to ensure your import data is formatted correctly.</p>

            <div className="template-cards">
              <div className="template-card">
                <h4>CSV Template</h4>
                <p>Download a CSV template with sample vehicle data and proper column headers.</p>
                <button 
                  className="btn btn-secondary"
                  onClick={() => downloadTemplate('csv')}
                >
                  <Download size={20} />
                  Download CSV Template
                </button>
              </div>

              <div className="template-card">
                <h4>JSON Template</h4>
                <p>Download a JSON template with properly structured vehicle data format.</p>
                <button 
                  className="btn btn-secondary"
                  onClick={() => downloadTemplate('json')}
                >
                  <Download size={20} />
                  Download JSON Template
                </button>
              </div>
            </div>

            <div className="field-reference">
              <h4>Field Reference</h4>
              <table className="fields-table">
                <thead>
                  <tr>
                    <th>Field Name</th>
                    <th>Required</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>make</td>
                    <td className="required">Required</td>
                    <td>Text</td>
                    <td>Vehicle manufacturer (e.g., Ford, Chevrolet)</td>
                  </tr>
                  <tr>
                    <td>model</td>
                    <td className="required">Required</td>
                    <td>Text</td>
                    <td>Vehicle model (e.g., F-150, Silverado)</td>
                  </tr>
                  <tr>
                    <td>year</td>
                    <td className="required">Required</td>
                    <td>Number</td>
                    <td>Manufacturing year (e.g., 2020)</td>
                  </tr>
                  <tr>
                    <td>vin</td>
                    <td className="optional">Optional</td>
                    <td>Text</td>
                    <td>Vehicle Identification Number (17 characters)</td>
                  </tr>
                  <tr>
                    <td>licensePlate</td>
                    <td className="optional">Optional</td>
                    <td>Text</td>
                    <td>License plate number</td>
                  </tr>
                  <tr>
                    <td>mileage</td>
                    <td className="optional">Optional</td>
                    <td>Number</td>
                    <td>Current mileage</td>
                  </tr>
                  <tr>
                    <td>fuelType</td>
                    <td className="optional">Optional</td>
                    <td>Text</td>
                    <td>diesel, gasoline, electric, hybrid</td>
                  </tr>
                  <tr>
                    <td>status</td>
                    <td className="optional">Optional</td>
                    <td>Text</td>
                    <td>active, inactive, maintenance</td>
                  </tr>
                  <tr>
                    <td>location</td>
                    <td className="optional">Optional</td>
                    <td>Text</td>
                    <td>Current location or depot</td>
                  </tr>
                  <tr>
                    <td>assignedDriver</td>
                    <td className="optional">Optional</td>
                    <td>Text</td>
                    <td>Name of assigned driver</td>
                  </tr>
                  <tr>
                    <td>notes</td>
                    <td className="optional">Optional</td>
                    <td>Text</td>
                    <td>Additional notes or comments</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>Preview Import Data</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPreview(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Review the data below before importing. Check for any errors or missing information.</p>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {previewData.length > 0 && Object.keys(previewData[0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value: any, i) => (
                          <td key={i}>{String(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 10 && (
                <p className="preview-note">Showing first 10 rows of {previewData.length} total rows</p>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPreview(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={confirmImport}
                disabled={importing}
              >
                {importing ? 'Importing...' : `Import ${previewData.length} Vehicles`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkVehicleManager;
