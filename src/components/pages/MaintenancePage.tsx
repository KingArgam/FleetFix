import React, { useState, useEffect } from 'react';
import { MaintenanceForm } from '../forms/MaintenanceForm';
import { useAppContext } from '../../contexts/AppContext';

const MaintenancePage: React.FC<any> = ({ trucks: propTrucks, maintenanceEntries: propMaintenanceEntries, onAddEntry }) => {
  const { state, addMaintenance, updateMaintenance, deleteMaintenance } = useAppContext();
  const { trucks: stateTrucks, maintenance: stateMaintenance } = state;
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [displayedEntries, setDisplayedEntries] = useState<any[]>([]);


  const trucks = propTrucks || stateTrucks;
  const maintenanceEntries = propMaintenanceEntries || stateMaintenance;


  useEffect(() => {
    setDisplayedEntries(maintenanceEntries || []);
  }, [maintenanceEntries]);

  const handleAddMaintenanceClick = () => {
    setEditingMaintenance(null);
    setShowMaintenanceForm(true);
  };

  const handleEditMaintenance = (entry: any) => {
    setEditingMaintenance(entry);
    setShowMaintenanceForm(true);
  };

  const handleDeleteMaintenance = async (entry: any) => {
    if (window.confirm(`Are you sure you want to delete this maintenance entry? This action cannot be undone.`)) {
      try {
        await deleteMaintenance(entry.id);
      } catch (error) {
        console.error('Error deleting maintenance entry:', error);
        alert('Failed to delete maintenance entry. Please try again.');
      }
    }
  };

  const handleMaintenanceSaved = async (entry: any) => {
    if (editingMaintenance) {
      
      await updateMaintenance(editingMaintenance.id, entry);
    } else {
      
      await addMaintenance(entry);
      
      if (onAddEntry && !addMaintenance) {
        onAddEntry(entry);
      }
    }
    
    setShowMaintenanceForm(false);
    setEditingMaintenance(null);
  };

  return (
    <div className="maintenance-page">
      <div className="page-header">
        <h1>Maintenance Logs</h1>
        <button className="btn btn-primary" onClick={handleAddMaintenanceClick}>+ Log Maintenance</button>
      </div>

      <div className="card">
        <div className="card-body">
          <table className="maintenance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Truck</th>
                <th>Type</th>
                <th>Mileage</th>
                <th>Cost</th>
                <th>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {displayedEntries?.map((entry: any) => {
                const truck = trucks?.find((t: any) => t.id === entry.truckId);
                return (
                  <tr key={entry.id}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{truck?.nickname || truck?.licensePlate || 'Unknown'}</td>
                    <td>{entry.type}</td>
                    <td>{entry.mileage.toLocaleString()}</td>
                    <td>${entry.cost}</td>
                    <td>{entry.performedBy || 'N/A'}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEditMaintenance(entry)}
                        title="Edit maintenance entry"
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleDeleteMaintenance(entry)} 
                        style={{ marginLeft: '8px' }}
                        title="Delete maintenance entry"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              }) || (
                <tr>
                  <td colSpan={6}>No maintenance entries found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showMaintenanceForm && (
        <MaintenanceForm
          maintenance={editingMaintenance}
          onSuccess={handleMaintenanceSaved}
          onCancel={() => {
            setShowMaintenanceForm(false);
            setEditingMaintenance(null);
          }}
        />
      )}
    </div>
  );
};

export default MaintenancePage;
