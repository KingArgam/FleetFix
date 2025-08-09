import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';

const Dashboard: React.FC = () => {
  const { state } = useAppContext();
  const { trucks, maintenance, loading, currentUser } = state;

  // Memoize calculations to prevent re-computation on every render
  const dashboardStats = useMemo(() => {
    if (!trucks || !maintenance) return {
      activeTrucks: 0,
      trucksInMaintenance: 0,
      retiredTrucks: 0,
      pendingMaintenance: 0,
      totalTrucks: 0
    };

    // Filter maintenance to only include records after account creation
    const accountCreationDate = currentUser?.createdAt ? new Date(currentUser.createdAt) : new Date();
    const filteredMaintenance = maintenance.filter(record => 
      new Date(record.date) >= accountCreationDate
    );

    return {
      activeTrucks: trucks.filter((t) => t.status === 'In Service').length,
      trucksInMaintenance: trucks.filter((t) => t.status === 'Out for Repair' || t.status === 'Needs Attention').length,
      retiredTrucks: trucks.filter((t) => t.status === 'Retired').length,
      pendingMaintenance: filteredMaintenance.filter((m) => m.status === 'scheduled').length,
      totalTrucks: trucks.length
    };
  }, [trucks, maintenance, currentUser]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

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
              const accountCreationDate = currentUser?.createdAt ? new Date(currentUser.createdAt) : new Date();
              const filteredMaintenance = maintenance?.filter(record => 
                new Date(record.date) >= accountCreationDate
              ) || [];
              
              return filteredMaintenance.slice(0, 5).map((entry) => (
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
              const accountCreationDate = currentUser?.createdAt ? new Date(currentUser.createdAt) : new Date();
              const filteredMaintenance = maintenance?.filter(record => 
                new Date(record.date) >= accountCreationDate
              ) || [];
              
              return filteredMaintenance.length === 0 ? <p>No maintenance entries found</p> : null;
            })()}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Fleet Overview</h3>
          </div>
          <div className="card-body">
            {trucks?.slice(0, 5).map((truck) => (
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
