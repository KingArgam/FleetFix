import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, AlertTriangle, Download, Upload, Eye } from 'lucide-react';
import { SearchFilters, TruckStatus, Truck } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { TruckForm } from '../forms/TruckForm';
import { SearchAndFilter } from '../common/SearchAndFilter';
import '../../styles/enhanced.css';

const EnhancedTrucksPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, addTruck, updateTruck, deleteTruck, saveTempTruckForm, clearTempTruckForm } = useAppContext();
  const { trucks, tempTruckForm } = state;
  
  const [filteredTrucks, setFilteredTrucks] = useState<Truck[]>([]);
  const [paginatedTrucks, setPaginatedTrucks] = useState<Truck[]>([]);
  const [showTruckForm, setShowTruckForm] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | undefined>();
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const totalPages = Math.ceil(filteredTrucks.length / itemsPerPage);

  const applyFilters = useCallback(() => {
    let filtered = state.trucks;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
  filtered = filtered.filter((truck: Truck) => 
        truck.licensePlate?.toLowerCase().includes(query) ||
        truck.model?.toLowerCase().includes(query) ||
        truck.make?.toLowerCase().includes(query) ||
        truck.nickname?.toLowerCase().includes(query)
      );
    }

    if (filters.status && filters.status.length > 0) {
  filtered = filtered.filter((truck: Truck) => 
        filters.status!.includes(truck.status as TruckStatus)
      );
    }

    if (filters.dateRange) {

    }

    setFilteredTrucks(filtered);
    

    setCurrentPage(1);
  }, [state.trucks, searchQuery, filters]);


  useEffect(() => {
    applyFilters();
  }, [applyFilters]);


  useEffect(() => {
    applyFilters();
  }, []);


  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedTrucks(filteredTrucks.slice(startIndex, endIndex));
  }, [filteredTrucks, currentPage, itemsPerPage]);

  const handleTruckSaved = (truck: Truck) => {
    setShowTruckForm(false);
    setEditingTruck(undefined);

  };

  const handleEditTruck = (truck: Truck) => {
    setEditingTruck(truck);
    setShowTruckForm(true);
  };

  const handleViewTruckDetails = (truck: Truck) => {
    navigate(`/trucks/${truck.id}`);
  };

  const handleDeleteTruck = async (truck: Truck) => {
    if (window.confirm(`Are you sure you want to delete ${truck.licensePlate}? This action cannot be undone.`)) {
      try {
        await deleteTruck(truck.id);

      } catch (error) {
        console.error('Error deleting truck:', error);
        alert('Failed to delete truck. Please try again.');
      }
    }
  };


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  setSelectedTrucks([]); 
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
  setCurrentPage(1); 
    setSelectedTrucks([]);
  };

    const handleBulkStatusUpdate = async (status: TruckStatus) => {
    if (selectedTrucks.length === 0) return;
    
    try {

      await Promise.all(selectedTrucks.map((truckId: string) => 
        updateTruck(truckId, { status })
      ));
      
      setSelectedTrucks([]);

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
      setSelectedTrucks(filteredTrucks.map((truck: Truck) => truck.id));
    }
  };

  const handleStartDowntime = async (truck: Truck) => {
    const reason = prompt(`Why is ${truck.licensePlate} going out of service?`);
    if (!reason) return;

    try {

      const downtimeData = {
        truckId: truck.id,
        truckLicense: truck.licensePlate,
        startTime: new Date(),
        reason: reason,
        category: 'unscheduled',
        isActive: true,
        createdBy: state.currentUser?.id || '',
        updatedBy: state.currentUser?.id || ''
      };


      const existingDowntime = JSON.parse(localStorage.getItem('downtimeRecords') || '[]');
      const newDowntime = {
        ...downtimeData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      existingDowntime.push(newDowntime);
      localStorage.setItem('downtimeRecords', JSON.stringify(existingDowntime));


      await updateTruck(truck.id, { status: 'Out for Repair' });
      
      console.log('Started downtime for truck:', truck.licensePlate);
    } catch (error) {
      console.error('Error starting downtime:', error);
      alert('Failed to start downtime. Please try again.');
    }
  };

  const handleEndDowntime = async (truck: Truck) => {
    const notes = prompt(`Any notes for ending downtime for ${truck.licensePlate}?`);
    
    try {

      const existingDowntime = JSON.parse(localStorage.getItem('downtimeRecords') || '[]');
      const activeDowntime = existingDowntime.find((d: any) => 
        d.truckId === truck.id && d.isActive
      );

      if (activeDowntime) {
        activeDowntime.endTime = new Date();
        activeDowntime.isActive = false;
        activeDowntime.notes = notes || '';
        activeDowntime.duration = new Date().getTime() - new Date(activeDowntime.startTime).getTime();
        activeDowntime.updatedAt = new Date();
        
        localStorage.setItem('downtimeRecords', JSON.stringify(existingDowntime));
      }


      await updateTruck(truck.id, { status: 'In Service' });
      
      console.log('Ended downtime for truck:', truck.licensePlate);
    } catch (error) {
      console.error('Error ending downtime:', error);
      alert('Failed to end downtime. Please try again.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Make', 'Model', 'Year', 'License Plate', 'VIN', 'Status', 'Mileage'];
    const csvContent = [
      headers.join(','),
      ...filteredTrucks.map((truck: Truck) => [
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
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(Boolean);
          const headers = lines[0].split(',');
          const trucksData = lines.slice(1).map(line => {
            const values = line.split(',');
            const truck: any = {};
            headers.forEach((header, idx) => {
              truck[header.trim()] = values[idx]?.trim();
            });
            return truck;
          });

          for (const truck of trucksData) {
            await addTruck({
              make: truck['Make'],
              model: truck['Model'],
              year: Number(truck['Year']),
              licensePlate: truck['License Plate'],
              vin: truck['VIN'],
              status: truck['Status'],
              mileage: Number(truck['Mileage']),
              nickname: truck['Nickname'] || '',
            });
          }
          alert('CSV import complete!');
        };
        reader.readAsText(file);
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
      {paginatedTrucks.map((truck: Truck) => (
        <div key={truck.id} className="truck-card">
          <div className="truck-card-header">
            <div className="truck-info">
              <h3 
                onClick={() => handleViewTruckDetails(truck)}
                className="truck-title-clickable"
                title="View truck details"
              >
                {truck.make} {truck.model}
              </h3>
              <span className="truck-license">{truck.licensePlate}</span>
            </div>
            <div className="truck-actions">
              <input
                type="checkbox"
                checked={selectedTrucks.includes(truck.id)}
                onChange={() => handleSelectTruck(truck.id)}
                className="truck-checkbox"
              />
              
              <select
                value={truck.status}
                onChange={e => {
                  const newStatus = e.target.value;
                  updateTruck(truck.id, { status: newStatus as TruckStatus });
                  setTimeout(() => {
                    const note = prompt(`Add a note for status '${newStatus}' (optional):`, '');
                    if (note !== null && note.trim() !== '') {
                      const customFields = { ...(truck.customFields || {}), statusNote: note };
                      updateTruck(truck.id, { customFields });
                    }
                  }, 100);
                }}
                className="action-btn status-dropdown status-dropdown-shrink"
                title="Change Status"
              >
                <option value="In Service">In Service</option>
                <option value="Needs Attention">Needs Attention</option>
                <option value="Out for Repair">Out for Repair</option>
                <option value="Retired">Retired</option>
              </select>
              <button 
                onClick={() => handleViewTruckDetails(truck)} 
                className="action-btn view"
                title="View Details"
              >
                <Eye size={16} />
              </button>
              <div className="edit-delete-actions">
                <button onClick={() => handleEditTruck(truck)} className="action-btn edit">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDeleteTruck(truck)} className="action-btn delete">
                  <Trash2 size={16} />
                </button>
              </div>
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
          {paginatedTrucks.map((truck: Truck) => (
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
                <select
                  value={truck.status}
                  onChange={e => {
                    const newStatus = e.target.value;
                    updateTruck(truck.id, { status: newStatus as TruckStatus });
                    setTimeout(() => {
                      const note = prompt(`Add a note for status '${newStatus}' (optional):`, '');
                      if (note !== null && note.trim() !== '') {
                        const customFields = { ...(truck.customFields || {}), statusNote: note };
                        updateTruck(truck.id, { customFields });
                      }
                    }, 100);
                  }}
                  className="action-btn status-dropdown status-dropdown-shrink"
                  title="Change Status"
                  
                >
                  <option value="In Service">In Service</option>
                  <option value="Needs Attention">Needs Attention</option>
                  <option value="Out for Repair">Out for Repair</option>
                  <option value="Retired">Retired</option>
                </select>
              </td>
              <td>{truck.nickname || '-'}</td>
              <td>
                <div className="table-actions">
                  <button 
                    onClick={() => handleViewTruckDetails(truck)} 
                    className="action-btn view" 
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
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

      
      {filteredTrucks.length > 0 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTrucks.length)} of {filteredTrucks.length} trucks
            </span>
            <div className="items-per-page">
              <label>Show:</label>
              <select 
                value={itemsPerPage} 
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              <span>per page</span>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="pagination-buttons">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

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
