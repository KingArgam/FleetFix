import React, { useState, useEffect } from 'react';
import { MaintenanceForm } from '../forms/MaintenanceForm';
import { useAppContext } from '../../contexts/AppContext';

const MaintenancePage: React.FC<any> = ({ trucks: propTrucks, maintenanceEntries: propMaintenanceEntries, onAddEntry }) => {
  const { state, addMaintenance } = useAppContext();
  const { trucks: stateTrucks, maintenance: stateMaintenance } = state;
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [displayedEntries, setDisplayedEntries] = useState<any[]>([]);

  // Use data from props or state
  const trucks = propTrucks || stateTrucks;
  const maintenanceEntries = propMaintenanceEntries || stateMaintenance;

  // Update displayed entries when maintenance data changes
  useEffect(() => {
    setDisplayedEntries(maintenanceEntries || []);
  }, [maintenanceEntries]);

  const handleAddMaintenanceClick = () => {
    setShowMaintenanceForm(true);
  };

  const handleMaintenanceSaved = async (entry: any) => {
    // Use AppContext to add maintenance entry
    await addMaintenance(entry);
    // Only call props callback if there's no addMaintenance function (for backward compatibility)
    if (onAddEntry && !addMaintenance) {
      onAddEntry(entry);
    }
    setShowMaintenanceForm(false);
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
                      <button className="btn btn-sm btn-secondary" onClick={() => {/* openEditModal(entry) */}}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => {/* handleDelete(entry.id) */}} style={{ marginLeft: '8px' }}>Delete</button>
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
          onSuccess={handleMaintenanceSaved}
          onCancel={() => setShowMaintenanceForm(false)}
        />
      )}
    </div>
  );
};

export default MaintenancePage;
