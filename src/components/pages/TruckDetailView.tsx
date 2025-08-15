import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  DollarSign,
  Wrench,
  MapPin,
  Fuel
} from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Truck, MaintenanceEntry, Part } from '../../types';

interface TruckDetailViewProps {}

interface TabType {
  id: 'overview' | 'maintenance' | 'parts' | 'downtime' | 'analytics';
  label: string;
  icon: React.ElementType;
}

const tabs: TabType[] = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'maintenance', label: 'Maintenance Logs', icon: Wrench },
  { id: 'parts', label: 'Parts History', icon: Package },
  { id: 'downtime', label: 'Downtime Records', icon: Clock },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp }
];

const TruckDetailView: React.FC<TruckDetailViewProps> = () => {
  const { truckId } = useParams();
  const navigate = useNavigate();
  const { state } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<TabType['id']>('overview');
  const [truck, setTruck] = useState<Truck | null>(null);
  const [maintenanceEntries, setMaintenanceEntries] = useState<MaintenanceEntry[]>([]);
  const [partsHistory, setPartsHistory] = useState<Part[]>([]);
  const [downtimeRecords, setDowntimeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (truckId) {
      loadTruckData();
    }
  }, [truckId]);

  const loadTruckData = async () => {
    setLoading(true);
    try {
      
  const foundTruck = state.trucks?.find((t: Truck) => t.id === truckId);
      if (foundTruck) {
        setTruck(foundTruck);
      }

      
      if (state.currentUser) {
        const [maintenance, parts] = await Promise.all([
          Promise.resolve(state.maintenance || []),
          Promise.resolve(state.parts || [])
        ]);

        
  const truckMaintenance = maintenance.filter((m: MaintenanceEntry) => m.truckId === truckId);
  
  const truckParts = parts; 

        setMaintenanceEntries(truckMaintenance);
        setPartsHistory(truckParts);
      }

      
      const downtimeData = JSON.parse(localStorage.getItem('downtimeRecords') || '[]');
      const truckDowntime = downtimeData.filter((d: any) => d.truckId === truckId);
      setDowntimeRecords(truckDowntime);

    } catch (error) {
      console.error('Error loading truck data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTruckStats = () => {
    if (!truck) return { totalCost: 0, totalDowntimeHours: 0, avgCostPerMile: 0, reliability: 100 };

    const totalCost = maintenanceEntries.reduce((sum, entry) => sum + (entry.cost || 0), 0);
    const totalDowntimeMs = downtimeRecords.reduce((sum, record) => {
      const start = new Date(record.startTime);
      const end = record.endTime ? new Date(record.endTime) : new Date();
      return sum + (end.getTime() - start.getTime());
    }, 0);
    const totalDowntimeHours = Math.round(totalDowntimeMs / (1000 * 60 * 60));
    const avgCostPerMile = truck.mileage > 0 ? totalCost / truck.mileage : 0;
    const reliability = Math.max(0, 100 - (downtimeRecords.length * 5));

    return { totalCost, totalDowntimeHours, avgCostPerMile, reliability };
  };

  const renderOverviewTab = () => {
    if (!truck) return null;
    
    const stats = calculateTruckStats();
    
    return (
      <div className="overview-tab">
        <div className="truck-info-card">
          <div className="truck-info-header">
            <div className="truck-title">
              <h2>{truck.make} {truck.model}</h2>
              <span className="truck-year">{truck.year}</span>
            </div>
            <span className={`status-badge ${truck.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {truck.status}
            </span>
          </div>
          
          <div className="truck-details-grid">
            <div className="detail-item">
              <div className="detail-icon">
                <MapPin size={20} />
              </div>
              <div className="detail-content">
                <span className="detail-label">License Plate</span>
                <span className="detail-value">{truck.licensePlate}</span>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">
                <Settings size={20} />
              </div>
              <div className="detail-content">
                <span className="detail-label">VIN</span>
                <span className="detail-value">{truck.vin}</span>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">
                <Fuel size={20} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Mileage</span>
                <span className="detail-value">{truck.mileage.toLocaleString()} miles</span>
              </div>
            </div>
            
            {truck.nickname && (
              <div className="detail-item">
                <div className="detail-icon">
                  <Settings size={20} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Nickname</span>
                  <span className="detail-value">{truck.nickname}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon cost">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">${stats.totalCost.toLocaleString()}</span>
              <span className="stat-label">Total Maintenance Cost</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon downtime">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalDowntimeHours}h</span>
              <span className="stat-label">Total Downtime</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon reliability">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.reliability}%</span>
              <span className="stat-label">Reliability Score</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon efficiency">
              <Fuel size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">${stats.avgCostPerMile.toFixed(2)}</span>
              <span className="stat-label">Cost per Mile</span>
            </div>
          </div>
        </div>

        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {maintenanceEntries.slice(0, 5).map(entry => (
              <div key={entry.id} className="activity-item">
                <div className="activity-icon">
                  <Wrench size={16} />
                </div>
                <div className="activity-content">
                  <span className="activity-title">{entry.type}</span>
                  <span className="activity-date">{new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <span className="activity-cost">${entry.cost}</span>
              </div>
            ))}
            {maintenanceEntries.length === 0 && (
              <div className="empty-activity">
                <p>No maintenance records found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMaintenanceTab = () => (
    <div className="maintenance-tab">
      <div className="tab-header">
        <h3>Maintenance History</h3>
        <span className="entry-count">{maintenanceEntries.length} entries</span>
      </div>
      
      <div className="maintenance-list">
        {maintenanceEntries.length === 0 ? (
          <div className="empty-state">
            <Wrench size={48} />
            <h4>No maintenance records</h4>
            <p>Maintenance entries for this truck will appear here</p>
          </div>
        ) : (
          maintenanceEntries.map(entry => (
            <div key={entry.id} className="maintenance-entry-card">
              <div className="entry-header">
                <div className="entry-info">
                  <h4>{entry.type}</h4>
                  <span className="entry-date">{new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <div className="entry-cost">${entry.cost}</div>
              </div>
              
              <div className="entry-details">
                <div className="detail-row">
                  <span className="label">Mileage:</span>
                  <span className="value">{entry.mileage.toLocaleString()} miles</span>
                </div>
                {entry.performedBy && (
                  <div className="detail-row">
                    <span className="label">Performed by:</span>
                    <span className="value">{entry.performedBy}</span>
                  </div>
                )}
                {entry.notes && (
                  <div className="detail-row">
                    <span className="label">Notes:</span>
                    <span className="value">{entry.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderPartsTab = () => (
    <div className="parts-tab">
      <div className="tab-header">
        <h3>Parts History</h3>
        <span className="entry-count">{partsHistory.length} parts used</span>
      </div>
      
      <div className="parts-list">
        {partsHistory.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <h4>No parts records</h4>
            <p>Parts used on this truck will appear here</p>
          </div>
        ) : (
          partsHistory.map(part => (
            <div key={part.id} className="part-entry-card">
              <div className="part-header">
                <div className="part-info">
                  <h4>{part.name}</h4>
                  <span className="part-number">{part.partNumber}</span>
                </div>
                <div className="part-cost">${part.cost}</div>
              </div>
              
              <div className="part-details">
                <div className="detail-row">
                  <span className="label">Category:</span>
                  <span className="value">{part.category}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Stock:</span>
                  {}
                  <span className="value">N/A</span>
                </div>
                {part.supplier && (
                  <div className="detail-row">
                    <span className="label">Supplier:</span>
                    <span className="value">{part.supplier}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderDowntimeTab = () => (
    <div className="downtime-tab">
      <div className="tab-header">
        <h3>Downtime History</h3>
        <span className="entry-count">{downtimeRecords.length} incidents</span>
      </div>
      
      <div className="downtime-list">
        {downtimeRecords.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} />
            <h4>No downtime records</h4>
            <p>Downtime incidents for this truck will appear here</p>
          </div>
        ) : (
          downtimeRecords.map(record => (
            <div key={record.id} className="downtime-entry-card">
              <div className="entry-header">
                <div className="entry-info">
                  <h4>{record.reason}</h4>
                  <span className={`category-badge ${record.category?.toLowerCase()}`}>
                    {record.category}
                  </span>
                </div>
                {record.isActive && (
                  <span className="status-badge active">ONGOING</span>
                )}
              </div>
              
              <div className="entry-details">
                <div className="detail-row">
                  <span className="label">Started:</span>
                  <span className="value">{new Date(record.startTime).toLocaleString()}</span>
                </div>
                {record.endTime && (
                  <div className="detail-row">
                    <span className="label">Ended:</span>
                    <span className="value">{new Date(record.endTime).toLocaleString()}</span>
                  </div>
                )}
                {record.cost && (
                  <div className="detail-row">
                    <span className="label">Cost:</span>
                    <span className="value">${record.cost.toLocaleString()}</span>
                  </div>
                )}
                {record.description && (
                  <div className="detail-row">
                    <span className="label">Description:</span>
                    <span className="value">{record.description}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => {
    const stats = calculateTruckStats();
    
    return (
      <div className="analytics-tab">
        <div className="analytics-grid">
          <div className="analytics-card">
            <h4>Monthly Breakdown</h4>
            <div className="cost-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">Maintenance</span>
                <span className="breakdown-value">${(stats.totalCost * 0.7).toFixed(2)}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Repairs</span>
                <span className="breakdown-value">${(stats.totalCost * 0.3).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="analytics-card">
            <h4>Performance Metrics</h4>
            <div className="performance-metrics">
              <div className="metric-item">
                <span className="metric-label">Uptime</span>
                <span className="metric-value">{stats.reliability}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Efficiency</span>
                <span className="metric-value">${stats.avgCostPerMile.toFixed(2)}/mile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading truck details...</div>
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertTriangle size={48} />
          <h2>Truck Not Found</h2>
          <p>The requested truck could not be found.</p>
          <button onClick={() => navigate('/trucks')} className="btn-primary">
            Back to Trucks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="truck-detail-view">
      <div className="detail-header">
        <div className="header-navigation">
          <button onClick={() => navigate('/trucks')} className="back-btn">
            <ArrowLeft size={20} />
            Back to Trucks
          </button>
        </div>
        
        <div className="header-content">
          <div className="truck-header-info">
            <h1>{truck.make} {truck.model} ({truck.licensePlate})</h1>
            <span className={`status-badge ${truck.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {truck.status}
            </span>
          </div>
          
          <div className="header-actions">
            {/* Edit and Delete buttons removed as requested */}
          </div>
        </div>
      </div>

      <div className="detail-navigation">
        <div className="nav-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="detail-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'maintenance' && renderMaintenanceTab()}
        {activeTab === 'parts' && renderPartsTab()}
        {activeTab === 'downtime' && renderDowntimeTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>
    </div>
  );
};

export default TruckDetailView;
