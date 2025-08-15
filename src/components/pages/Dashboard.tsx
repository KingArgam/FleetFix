import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Truck, MaintenanceEntry } from '../../types';

const Dashboard: React.FC = () => {
  const { state } = useAppContext();
  const { trucks, maintenance, currentUser } = state;

  
  const dashboardStats = useMemo(() => {
    if (!trucks || !maintenance) return {
      activeTrucks: 0,
      trucksInMaintenance: 0,
      retiredTrucks: 0,
      pendingMaintenance: 0,
      totalTrucks: 0
    };

    return {
      activeTrucks: trucks.filter((t: Truck) => t.status === 'In Service').length,
      trucksInMaintenance: trucks.filter((t: Truck) => t.status === 'Out for Repair').length,
      retiredTrucks: trucks.filter((t: Truck) => t.status === 'Retired').length,
      pendingMaintenance: trucks.filter((t: Truck) => t.status === 'Needs Attention').length,
      totalTrucks: trucks.length
    };
  }, [trucks, maintenance]);



  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>FleetFix Dashboard</h1>
        <p>Fleet management at your fingertips</p>
      </div>

      <div className="grid grid-cols-4 mb-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="stat-number">{dashboardStats.totalTrucks}</div>
            <div className="stat-label">Total Trucks</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="stat-number text-green-600">{dashboardStats.activeTrucks}</div>
            <div className="stat-label">In Service</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="stat-number text-red-600">{dashboardStats.trucksInMaintenance}</div>
            <div className="stat-label">In Maintenance</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="stat-number text-yellow-600">{dashboardStats.pendingMaintenance}</div>
            <div className="stat-label">Pending Maintenance</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Maintenance</h3>
          </div>
          <div className="card-body">
            {(() => {
              // Show all maintenance entries regardless of date - sort by most recent first
              const sortedMaintenance = maintenance?.slice().sort((a: MaintenanceEntry, b: MaintenanceEntry) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              ) || [];
              
              return sortedMaintenance.slice(0, 5).map((entry: MaintenanceEntry) => (
                <div key={entry.id} className="maintenance-item">
                  <div className="flex justify-between">
                    <span>{entry.type}</span>
                    <span>{entry.cost ? `$${entry.cost}` : 'No cost'}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(entry.date).toLocaleDateString()}
                  </div>
                </div>
              ));
            })()}
            {(() => {
              const sortedMaintenance = maintenance?.slice().sort((a: MaintenanceEntry, b: MaintenanceEntry) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              ) || [];
              
              return sortedMaintenance.length === 0 ? <p>No maintenance entries found</p> : null;
            })()}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Fleet Overview</h3>
          </div>
          <div className="card-body">
            {trucks?.slice(0, 5).map((truck: Truck) => (
              <div key={truck.id} className="truck-item">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{truck.licensePlate}</span>
                    <div className="text-sm text-gray-500">
                      {truck.make} {truck.model} ({truck.year})
                    </div>
                  </div>
                  <span className={`status-badge status-${truck.status.toLowerCase().replace(' ', '-')}`}>
                    {truck.status}
                  </span>
                </div>
              </div>
            )) || <p>No trucks found</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
