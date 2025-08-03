import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Download, Upload } from 'lucide-react';
import { SearchFilters, TruckStatus } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { TruckData } from '../../services/UserDataService';
import userDataService from '../../services/UserDataService';
import { TruckForm } from '../forms/TruckForm';
import { SearchAndFilter } from '../common/SearchAndFilter';
import '../../styles/enhanced.css';

const EnhancedTrucksPage: React.FC = () => {
  const { state, addTruck, updateTruck, deleteTruck, saveTempTruckForm, clearTempTruckForm } = useAppContext();
  const { trucks, loading, tempTruckForm } = state;
  
  const [filteredTrucks, setFilteredTrucks] = useState<TruckData[]>([]);
  const [showTruckForm, setShowTruckForm] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckData | undefined>();
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});

  const applyFilters = useCallback(() => {
    let filtered = trucks;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(truck => 
        truck.licensePlate?.toLowerCase().includes(query) ||
        truck.model?.toLowerCase().includes(query) ||
        truck.make?.toLowerCase().includes(query) ||
        truck.nickname?.toLowerCase().includes(query)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(truck => 
        filters.status!.includes(truck.status as TruckStatus)
      );
    }

    if (filters.dateRange) {
      // Apply date filtering if needed
    }

    setFilteredTrucks(filtered);
  }, [trucks, searchQuery, filters]);

  const handleTruckSaved = (truck: TruckData) => {
    setShowTruckForm(false);
    setEditingTruck(undefined);
    // Data will be updated automatically via AppContext
  };

  const handleEditTruck = (truck: TruckData) => {
    setEditingTruck(truck);
    setShowTruckForm(true);
  };

  const handleDeleteTruck = async (truck: TruckData) => {
    if (window.confirm(`Are you sure you want to delete ${truck.licensePlate}? This action cannot be undone.`)) {
      try {
        await deleteTruck(truck.id);
        // Refresh will happen automatically via context listeners
      } catch (error) {
        console.error('Error deleting truck:', error);
        alert('Failed to delete truck. Please try again.');
      }
    }
  };

    const handleBulkStatusUpdate = async (status: TruckStatus) => {
    if (selectedTrucks.length === 0) return;
    
    try {
      // Update each selected truck's status
      await Promise.all(selectedTrucks.map((truckId: string) => 
        updateTruck(truckId, { status })
      ));
      
      setSelectedTrucks([]);
      // Refresh will happen automatically via context listeners
    } catch (error) {
      console.error('Error updating truck statuses:', error);
    }
  };

  const handleSelectTruck = (truckId: string) => {
    setSelectedTrucks((prev: string[]) => 
      prev.includes(truckId) 
        ? prev.filter((id: string) => id !== truckId)
        : [...prev, truckId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTrucks.length === filteredTrucks.length) {
      setSelectedTrucks([]);
    } else {
      setSelectedTrucks(filteredTrucks.map((truck: TruckData) => truck.id));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Make', 'Model', 'Year', 'License Plate', 'VIN', 'Status', 'Mileage'];
    const csvContent = [
      headers.join(','),
      ...filteredTrucks.map((truck: TruckData) => [
        truck.make,
        truck.model,
        truck.year,
        truck.licensePlate,
        truck.vin,
        truck.status,
        truck.mileage
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trucks_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        alert('CSV import functionality would be implemented here. File selected: ' + file.name);
        // In a real implementation, you would:
        // 1. Parse the CSV file
        // 2. Validate the data
        // 3. Import the trucks using dataService.importTrucksFromCSV() or similar
        // 4. Refresh the truck list
      }
    };
    input.click();
  };

  const getStatusBadgeClass = (status: TruckStatus) => {
    switch (status) {
      case 'In Service': return 'status-badge status-active';
      case 'Out for Repair': return 'status-badge status-maintenance';
      case 'Needs Attention': return 'status-badge status-warning';
      case 'Retired': return 'status-badge status-inactive';
      default: return 'status-badge';
    }
  };

  const renderCardView = () => (
    <div className="trucks-grid">
      {filteredTrucks.map((truck: TruckData) => (
        <div key={truck.id} className="truck-card">
          <div className="truck-card-header">
            <div className="truck-info">
              <h3>{truck.make} {truck.model}</h3>
              <span className="truck-license">{truck.licensePlate}</span>
            </div>
            <div className="truck-actions">
              <input
                type="checkbox"
                checked={selectedTrucks.includes(truck.id)}
                onChange={() => handleSelectTruck(truck.id)}
                className="truck-checkbox"
              />
              <button onClick={() => handleEditTruck(truck)} className="action-btn edit">
                <Edit size={16} />
              </button>
              <button onClick={() => handleDeleteTruck(truck)} className="action-btn delete">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="truck-details">
            <div className="detail-row">
              <span className="label">Year:</span>
              <span className="value">{truck.year}</span>
            </div>
            <div className="detail-row">
              <span className="label">Mileage:</span>
              <span className="value">{truck.mileage.toLocaleString()} miles</span>
            </div>
            <div className="detail-row">
              <span className="label">Nickname:</span>
              <span className="value">{truck.nickname || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className={getStatusBadgeClass(truck.status)}>{truck.status}</span>
            </div>
            {truck.customFields && Object.keys(truck.customFields).length > 0 && (
              <div className="custom-fields">
                {Object.entries(truck.customFields).map(([key, value]) => (
                  <div key={key} className="detail-row">
                    <span className="label">{key}:</span>
                    <span className="value">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="trucks-table-container">
      <table className="trucks-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedTrucks.length === filteredTrucks.length && filteredTrucks.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            <th>License Plate</th>
            <th>Make & Model</th>
            <th>Year</th>
            <th>Mileage</th>
            <th>Status</th>
            <th>Nickname</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTrucks.map((truck: TruckData) => (
            <tr key={truck.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedTrucks.includes(truck.id)}
                  onChange={() => handleSelectTruck(truck.id)}
                />
              </td>
              <td className="license-plate">{truck.licensePlate}</td>
              <td>{truck.make} {truck.model}</td>
              <td>{truck.year}</td>
              <td>{truck.mileage.toLocaleString()}</td>
              <td>
                <span className={getStatusBadgeClass(truck.status)}>{truck.status}</span>
              </td>
              <td>{truck.nickname || '-'}</td>
              <td>
                <div className="table-actions">
                  <button onClick={() => handleEditTruck(truck)} className="action-btn edit" title="Edit">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDeleteTruck(truck)} className="action-btn delete" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="trucks-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Fleet Trucks</h1>
          <p>Manage your fleet vehicles and track their status</p>
        </div>
        <div className="header-actions">
          <button onClick={handleExportCSV} className="btn-secondary">
            <Download size={16} />
            Export CSV
          </button>
          <button onClick={handleImportCSV} className="btn-secondary">
            <Upload size={16} />
            Import
          </button>
          <button 
            onClick={() => setShowTruckForm(true)} 
            className="btn-primary"
          >
            <Plus size={16} />
            Add Truck
          </button>
        </div>
      </div>

      <SearchAndFilter
        entityType="trucks"
        onSearch={setSearchQuery}
        onFilter={setFilters}
        onClear={() => {
          setSearchQuery('');
          setFilters({});
        }}
        currentFilters={filters}
      />

      <div className="content-header">
        <div className="content-info">
          <span className="results-count">
            {filteredTrucks.length} of {trucks.length} trucks
          </span>
          {selectedTrucks.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedTrucks.length} selected</span>
              <button 
                onClick={() => handleBulkStatusUpdate('In Service')}
                className="bulk-action-btn"
              >
                Mark In Service
              </button>
              <button 
                onClick={() => handleBulkStatusUpdate('Out for Repair')}
                className="bulk-action-btn"
              >
                Mark Out for Repair
              </button>
              <button 
                onClick={() => handleBulkStatusUpdate('Needs Attention')}
                className="bulk-action-btn"
              >
                Mark Needs Attention
              </button>
            </div>
          )}
        </div>
        <div className="view-controls">
          <button 
            onClick={() => setViewMode('cards')}
            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
          >
            Cards
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
          >
            Table
          </button>
        </div>
      </div>

      {filteredTrucks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <AlertTriangle size={48} />
          </div>
          <h3>No trucks found</h3>
          <p>
            {searchQuery || Object.keys(filters).length > 0 
              ? 'No trucks match your current search and filters.'
              : 'Get started by adding your first truck to the fleet.'
            }
          </p>
          {(!searchQuery && Object.keys(filters).length === 0) && (
            <button 
              onClick={() => setShowTruckForm(true)} 
              className="btn-primary"
            >
              <Plus size={16} />
              Add Your First Truck
            </button>
          )}
        </div>
      ) : (
        viewMode === 'cards' ? renderCardView() : renderTableView()
      )}

      {showTruckForm && (
        <TruckForm
          truck={editingTruck}
          onSuccess={handleTruckSaved}
          onCancel={() => {
            setShowTruckForm(false);
            setEditingTruck(undefined);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedTrucksPage;
