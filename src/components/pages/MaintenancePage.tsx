import React, { useState } from 'react';
import { MaintenanceForm } from '../forms/MaintenanceForm';

const MaintenancePage: React.FC<any> = ({ trucks, maintenanceEntries, onAddEntry }) => {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  const handleAddMaintenanceClick = () => {
    setShowMaintenanceForm(true);
  };

  const handleMaintenanceSaved = (entry: any) => {
    onAddEntry(entry);
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
              {maintenanceEntries?.map((entry: any) => {
                const truck = trucks?.find((t: any) => t.id === entry.truckId);
                return (
                  <tr key={entry.id}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{truck?.nickname || truck?.licensePlate || 'Unknown'}</td>
                    <td>{entry.type}</td>
                    <td>{entry.mileage.toLocaleString()}</td>
                    <td>${entry.cost}</td>
                    <td>{entry.performedBy || 'N/A'}</td>
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
          trucks={trucks}
          onSuccess={handleMaintenanceSaved}
          onCancel={() => setShowMaintenanceForm(false)}
        />
      )}
    </div>
  );
};

export default MaintenancePage;
