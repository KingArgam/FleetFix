import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Wrench, Calendar, Download, Filter, RefreshCw, Info } from 'lucide-react';
import { Truck, MaintenanceEntry, Part } from '../../types';
import { useAppContext } from '../../contexts/AppContext';

interface AnalyticsDashboardProps {}

interface AnalyticsData {
  fleetUtilization: number;
  totalMaintenanceCost: number;
  avgMaintenanceCostPerVehicle: number;
  mostCommonIssues: Array<{ issue: string; count: number }>;
  maintenanceTrends: Array<{ month: string; cost: number; count: number }>;
  vehicleReliability: Array<{ 
    vehicleId: string; 
    vehicleName: string; 
    reliability: number; 
    downtime: number;
    breakdown: {
      statusScore: number;
      maintenanceScore: number;
      emergencyPenalty: number;
      agePenalty: number;
      mileagePenalty: number;
      preventiveBonus: number;
      vehicleAge: number;
      mileage: number;
      emergencyRepairs: number;
      preventiveMaintenance: number;
      reactiveMaintenance: number;
      preventiveRatio: number;
      expectedMaintenancePerYear: number;
      actualMaintenanceThisYear: number;
    };
  }>;
  costBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  vehiclePerformance: Array<{ vehicleId: string; vehicleName: string; maintenanceCost: number; maintenanceCount: number; costPerMile: number; status: string }>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
  const { state } = useAppContext();
  const { trucks, maintenance, parts, currentUser } = state;
  
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '1y' | 'all'>('90d');
  const [activeChart, setActiveChart] = useState<'costs' | 'trends' | 'reliability'>('costs');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [showReliabilityBreakdown, setShowReliabilityBreakdown] = useState(false);
  const [downtimeRecords, setDowntimeRecords] = useState<any[]>([]);

  // Load downtime records from localStorage
  const loadDowntimeRecords = () => {
    const saved = localStorage.getItem('downtimeRecords');
    if (saved) {
      const parsed = JSON.parse(saved).map((record: any) => ({
        ...record,
        startTime: new Date(record.startTime),
        endTime: record.endTime ? new Date(record.endTime) : undefined,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt)
      }));
      setDowntimeRecords(parsed);
    } else {
      // Initialize with sample downtime records for demonstration
      const sampleRecords = [
        {
          id: 'downtime-1',
          truckId: 'truck-1',
          startTime: new Date('2025-08-05T09:30:00'),
          endTime: new Date('2025-08-05T15:45:00'),
          category: 'Mechanical Failure',
          reason: 'Brake system repair',
          cost: 850,
          isActive: false,
          createdAt: new Date('2025-08-05'),
          updatedAt: new Date('2025-08-05')
        },
        {
          id: 'downtime-2',
          truckId: 'truck-2',
          startTime: new Date('2025-08-07T14:00:00'),
          endTime: new Date('2025-08-08T11:30:00'),
          category: 'Scheduled Maintenance',
          reason: 'Oil change and tire rotation',
          cost: 450,
          isActive: false,
          createdAt: new Date('2025-08-07'),
          updatedAt: new Date('2025-08-08')
        },
        {
          id: 'downtime-3',
          truckId: 'truck-3',
          startTime: new Date('2025-08-08T16:20:00'),
          endTime: undefined, // Still ongoing
          category: 'Accident Damage',
          reason: 'Minor collision repair',
          cost: 0,
          isActive: true,
          createdAt: new Date('2025-08-08'),
          updatedAt: new Date('2025-08-08')
        }
      ];
      localStorage.setItem('downtimeRecords', JSON.stringify(sampleRecords));
      setDowntimeRecords(sampleRecords);
    }
  };

  useEffect(() => {
    loadDowntimeRecords();
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange, trucks, maintenance, parts, currentUser, downtimeRecords]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Calculate date filter
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Ensure we never show data from before user account creation
      const accountCreationDate = currentUser?.createdAt ? new Date(currentUser.createdAt) : new Date();
      if (startDate < accountCreationDate) {
        startDate = accountCreationDate;
      }

      // Filter maintenance records by date range
      const filteredRecords = maintenance.filter((record: MaintenanceEntry) => 
        new Date(record.date) >= startDate
      );

      // Also filter all maintenance records to not include data before account creation
      const filteredAllMaintenanceRecords = maintenance.filter((record: MaintenanceEntry) => 
        new Date(record.date) >= accountCreationDate
      );

      // Calculate analytics
      const analytics = await calculateAnalytics(trucks, filteredRecords, parts, filteredAllMaintenanceRecords);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = async (
    trucks: Truck[], 
    records: MaintenanceEntry[], 
    parts: Part[],
    allMaintenanceRecords: MaintenanceEntry[] // Add parameter for all maintenance data
  ): Promise<AnalyticsData> => {
    // Fleet utilization (mock calculation)
    const fleetUtilization = trucks.length > 0 
      ? (trucks.filter(t => t.status === 'In Service').length / trucks.length) * 100 
      : 0;

    // Total maintenance cost - USE ALL MAINTENANCE DATA, not filtered by date range
    const totalMaintenanceCost = allMaintenanceRecords.reduce((sum, record) => 
      sum + (record.cost || 0), 0
    );

    // Average cost per vehicle
    const avgMaintenanceCostPerVehicle = trucks.length > 0 
      ? totalMaintenanceCost / trucks.length 
      : 0;

    // Most frequent maintenance types - show actual maintenance types from logs
    const issueCount: { [key: string]: number } = {};
    records.forEach(record => {
      // Use the actual maintenance type as the issue category
      if (record.type) {
        const maintenanceType = record.type;
        issueCount[maintenanceType] = (issueCount[maintenanceType] || 0) + 1;
      }
    });

    const mostCommonIssues = (() => {
      const sortedIssues = Object.entries(issueCount)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => {
          // Sort by count (descending), then by name (ascending) for consistent ordering
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.issue.localeCompare(b.issue);
        });
      
      if (sortedIssues.length === 0) return [];
      
      // Simple logic: show all items, no complex filtering
      return sortedIssues;
    })();

    // Maintenance trends (monthly) - respects selected date range
    const monthlyData: { [key: string]: { cost: number; count: number; sortDate: Date } } = {};
    records.forEach(record => {
      const recordDate = new Date(record.date);
      const month = recordDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthlyData[month]) {
        monthlyData[month] = { 
          cost: 0, 
          count: 0, 
          sortDate: new Date(recordDate.getFullYear(), recordDate.getMonth(), 1) // First day of month for sorting
        };
      }
      monthlyData[month].cost += record.cost || 0;
      monthlyData[month].count += 1;
    });

    // Sort by actual date and show all months in the selected date range
    const maintenanceTrends = Object.entries(monthlyData)
      .map(([month, data]) => ({ 
        month, 
        cost: data.cost, 
        count: data.count,
        sortDate: data.sortDate 
      }))
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ month, cost, count }) => ({ month, cost, count })); // Remove sortDate from final result

    // Vehicle reliability - proper calculation based on multiple factors, using actual downtime records
    const vehicleReliability = trucks.map(truck => {
      const vehicleRecords = allMaintenanceRecords.filter(r => r.truckId === truck.id);
      const recentRecords = records.filter(r => r.truckId === truck.id);
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - truck.year;
      const mileage = truck.mileage || 0;
      const expectedMaintenancePerYear = Math.max(4, Math.floor(mileage / 15000));
      const actualMaintenanceThisYear = recentRecords.length;
      const maintenanceScore = Math.max(0, 100 - (actualMaintenanceThisYear / expectedMaintenancePerYear) * 30);
      const emergencyRepairs = vehicleRecords.filter(r =>
        r.type === 'Emergency Repair' ||
        (r.notes && r.notes.toLowerCase().includes('emergency'))
      ).length;
      const emergencyPenalty = emergencyRepairs * 10;
      const statusScore = truck.status === 'In Service' ? 100 :
        truck.status === 'Needs Attention' ? 70 :
        truck.status === 'Out for Repair' ? 30 : 50;
      const agePenalty = Math.min(20, vehicleAge * 2);
      const mileagePenalty = Math.min(15, Math.floor(mileage / 50000) * 3);
      const preventiveMaintenance = vehicleRecords.filter(r =>
        r.type === 'Oil Change' ||
        r.type === 'DOT Inspection' ||
        r.type === 'Preventive Maintenance' ||
        r.type === 'Brake Inspection' ||
        r.type === 'Tire Replacement'
      ).length;
      const reactiveMaintenance = vehicleRecords.filter(r =>
        r.type === 'Emergency Repair' ||
        r.type === 'Engine Service' ||
        r.type === 'Transmission Service'
      ).length;
      const totalMaintenance = preventiveMaintenance + reactiveMaintenance;
      const preventiveRatio = totalMaintenance > 0 ? (preventiveMaintenance / totalMaintenance) : 0.8;
      const preventiveBonus = preventiveRatio * 15;
      let reliability = statusScore;
      reliability = (reliability + maintenanceScore) / 2;
      reliability -= emergencyPenalty;
      reliability -= agePenalty;
      reliability -= mileagePenalty;
      reliability += preventiveBonus;
      reliability = Math.max(0, Math.min(100, reliability));
      // Use actual downtime records for downtime hours
      const truckDowntimeRecords = downtimeRecords.filter(record => record.truckId === truck.id);
      const actualDowntime = truckDowntimeRecords.reduce((total, record) => {
        const end = record.endTime ? new Date(record.endTime) : new Date();
        const start = new Date(record.startTime);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + duration;
      }, 0);
      const downtime = Math.round(actualDowntime * 10) / 10;
      return {
        vehicleId: truck.id,
        vehicleName: truck.nickname || `${truck.make} ${truck.model}`,
        reliability: parseFloat(reliability.toFixed(1)),
        downtime,
        breakdown: {
          statusScore,
          maintenanceScore: parseFloat(maintenanceScore.toFixed(1)),
          emergencyPenalty,
          agePenalty,
          mileagePenalty,
          preventiveBonus: parseFloat(preventiveBonus.toFixed(1)),
          vehicleAge,
          mileage,
          emergencyRepairs,
          preventiveMaintenance,
          reactiveMaintenance,
          preventiveRatio: parseFloat((preventiveRatio * 100).toFixed(1)),
          expectedMaintenancePerYear,
          actualMaintenanceThisYear
        }
      };
    }).sort((a, b) => b.reliability - a.reliability);

    // Cost breakdown - use filtered records for date range analysis
    const filteredMaintenanceCost = records.reduce((sum, record) => sum + (record.cost || 0), 0);
    const costBreakdown = [
      { category: 'Preventive Maintenance', amount: filteredMaintenanceCost * 0.6, percentage: 60 },
      { category: 'Repairs', amount: filteredMaintenanceCost * 0.25, percentage: 25 },
      { category: 'Parts Replacement', amount: filteredMaintenanceCost * 0.15, percentage: 15 }
    ];

    // Vehicle Performance Summary
    const vehiclePerformance = trucks.map(truck => {
      const vehicleMaintenanceRecords = allMaintenanceRecords.filter(record => record.truckId === truck.id);
      const maintenanceCost = vehicleMaintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
      const maintenanceCount = vehicleMaintenanceRecords.length;
      const costPerMile = truck.mileage > 0 ? maintenanceCost / truck.mileage : 0;
      
      return {
        vehicleId: truck.id,
        vehicleName: truck.nickname || `${truck.make} ${truck.model}`,
        maintenanceCost,
        maintenanceCount,
        costPerMile: parseFloat(costPerMile.toFixed(4)),
        status: truck.status
      };
    }).sort((a, b) => a.costPerMile - b.costPerMile); // Sort by cost per mile (best performance first)

    return {
      fleetUtilization,
      totalMaintenanceCost,
      avgMaintenanceCostPerVehicle,
      mostCommonIssues,
      maintenanceTrends,
      vehicleReliability,
      costBreakdown,
      vehiclePerformance
    };
  };

  const handleExport = async () => {
    if (!analyticsData) return;
    
    setLoading(true);
    try {
      const reportData = {
        dateRange,
        generatedAt: new Date().toISOString(),
        summary: {
          totalVehicles: trucks.length,
          fleetUtilization: analyticsData.fleetUtilization,
          totalMaintenanceCost: analyticsData.totalMaintenanceCost,
          avgCostPerVehicle: analyticsData.avgMaintenanceCostPerVehicle
        },
        trends: analyticsData.maintenanceTrends,
        issues: analyticsData.mostCommonIssues,
        reliability: analyticsData.vehicleReliability,
        costs: analyticsData.costBreakdown
      };

      if (exportFormat === 'csv') {
        exportAsCSV(reportData);
      } else if (exportFormat === 'excel') {
        exportAsExcel(reportData);
      } else {
        exportAsPDF(reportData);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAsCSV = (data: any) => {
    const csvContent = [
      // Summary
      'Fleet Analytics Report',
      `Generated: ${new Date().toLocaleDateString()}`,
      `Date Range: ${dateRange}`,
      '',
      'Summary',
      'Metric,Value',
      `Total Vehicles,${data.summary.totalVehicles}`,
      `Fleet Utilization,${data.summary.fleetUtilization.toFixed(1)}%`,
      `Total Maintenance Cost,$${data.summary.totalMaintenanceCost.toFixed(2)}`,
      `Average Cost Per Vehicle,$${data.summary.avgCostPerVehicle.toFixed(2)}`,
      '',
      // Trends
      'Monthly Trends',
      'Month,Cost,Count',
      ...data.trends.map((t: any) => `${t.month},$${t.cost.toFixed(2)},${t.count}`),
      '',
      // Issues
      'Most Frequent Maintenance',
      'Maintenance Type,Count',
      ...data.issues.map((i: any) => `${i.issue},${i.count}`),
      ''
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet_analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsExcel = (data: any) => {
    // For simplicity, we'll export as CSV format
    exportAsCSV(data);
  };

  const exportAsPDF = (data: any) => {
    // For a real implementation, you'd use a PDF library like jsPDF
    // For now, we'll create a simple HTML export
    const htmlContent = `
      <html>
        <head>
          <title>Fleet Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Fleet Analytics Report</h1>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
          <p>Date Range: ${dateRange}</p>
          
          <h2>Summary</h2>
          <table className="analytics-table">
            <tr><td>Total Vehicles</td><td>${data.summary.totalVehicles}</td></tr>
            <tr><td>Fleet Utilization</td><td>${data.summary.fleetUtilization.toFixed(1)}%</td></tr>
            <tr><td>Total Maintenance Cost</td><td>$${data.summary.totalMaintenanceCost.toFixed(2)}</td></tr>
            <tr><td>Average Cost Per Vehicle</td><td>$${data.summary.avgCostPerVehicle.toFixed(2)}</td></tr>
          </table>
          
          <h2>Monthly Trends</h2>
          <table className="analytics-table">
            <thead><tr><th>Month</th><th>Cost</th><th>Count</th></tr></thead>
            <tbody>
              ${data.trends.map((t: any) => 
                `<tr><td>${t.month}</td><td>$${t.cost.toFixed(2)}</td><td>${t.count}</td></tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading && !analyticsData) {
    return (
      <div className="analytics-dashboard loading">
        <div className="loading-spinner">
          <RefreshCw className="spinning" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="analytics-dashboard error">
        <p>Unable to load analytics data.</p>
        <button className="btn btn-primary" onClick={loadAnalyticsData}>
          <RefreshCw size={20} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>Fleet performance insights and reporting</p>
      </div>

      <div className="analytics-controls">
        <div className="date-range-selector">
          <label>Date Range:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as any)}
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
          {analyticsData && (
            <span className="date-range-info">
              • Analyzing {maintenance.filter((record: MaintenanceEntry) => {
                const now = new Date();
                let startDate = new Date();
                switch (dateRange) {
                  case '30d': startDate.setDate(now.getDate() - 30); break;
                  case '90d': startDate.setDate(now.getDate() - 90); break;
                  case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
                  default: startDate = new Date(0);
                }
                return new Date(record.date) >= startDate;
              }).length} maintenance records
            </span>
          )}
        </div>

        <div className="export-controls">
          <select
            className="status-dropdown"
            style={{ fontSize: '1.15rem', minWidth: 160, marginRight: 16 }}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            aria-label="Export format"
          >
            <option value="pdf">PDF Report</option>
            <option value="excel">Excel Export</option>
            <option value="csv">CSV Export</option>
          </select>
          <button
            className="btn btn-primary"
            style={{ fontSize: '1.15rem', padding: '10px 24px', minWidth: 120 }}
            onClick={handleExport}
            disabled={loading}
            aria-label="Export analytics data"
          >
            <Download size={22} style={{ marginRight: 8 }} />
            {loading ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </div>

      <div className="analytics-overview">
        <div className="overview-card">
          <div className="card-icon">
            <BarChart3 className="icon primary" />
          </div>
          <div className="card-content">
            <h3>{analyticsData.fleetUtilization.toFixed(1)}%</h3>
            <p>Fleet Utilization <small>(Real-time)</small></p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <DollarSign className="icon success" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(analyticsData.totalMaintenanceCost)}</h3>
            <p>Total Maintenance Cost <small>(All-time)</small></p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <Wrench className="icon warning" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(analyticsData.avgMaintenanceCostPerVehicle)}</h3>
            <p>Avg Cost Per Vehicle <small>(All-time)</small></p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <Calendar className="icon info" />
          </div>
          <div className="card-content">
            <h3>{maintenance.length}</h3>
            <p>Total Maintenance Records <small>(All-time)</small></p>
          </div>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="chart-tabs">
          <button 
            className={`tab-button ${activeChart === 'costs' ? 'active' : ''}`}
            onClick={() => setActiveChart('costs')}
          >
            Cost Breakdown
          </button>
          <button 
            className={`tab-button ${activeChart === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveChart('trends')}
          >
            Maintenance Trends
          </button>
          <button 
            className={`tab-button ${activeChart === 'reliability' ? 'active' : ''}`}
            onClick={() => setActiveChart('reliability')}
          >
            Vehicle Reliability
          </button>
        </div>

        <div className="chart-content">
          {activeChart === 'costs' && (
            <div className="chart-panel">
              <h3>Cost Breakdown</h3>
              <div className="cost-breakdown-chart">
                {analyticsData.costBreakdown.map((item, index) => (
                  <div key={index} className="cost-item">
                    <div className="cost-label">
                      <span className="category">{item.category}</span>
                      <span className="amount">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="cost-bar">
                      <div 
                        className="cost-fill" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="percentage">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeChart === 'trends' && (
            <div className="chart-panel">
              <h3>Maintenance Trends</h3>
              <div className="trends-chart">
                <div className="chart-area">
                  {analyticsData.maintenanceTrends.map((trend, index) => {
                    const maxCost = Math.max(...analyticsData.maintenanceTrends.map(t => t.cost));
                    const height = maxCost > 0 ? (trend.cost / maxCost) * 200 : 0;
                    
                    return (
                      <div key={index} className="trend-bar">
                        <div 
                          className="bar" 
                          style={{ height: `${height}px` }}
                          title={`${trend.month}: ${formatCurrency(trend.cost)} (${trend.count} records)`}
                        ></div>
                        <span className="month-label">{trend.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeChart === 'reliability' && (
            <div className="chart-panel">
              <div className="chart-header">
                <h3>Vehicle Reliability Scores</h3>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowReliabilityBreakdown(true)}
                >
                  <Info size={16} />
                  Breakdown
                </button>
              </div>
              <div className="reliability-chart">
                {analyticsData.vehicleReliability.slice(0, 10).map((vehicle, index) => (
                  <div key={index} className="reliability-item">
                    <div className="vehicle-info">
                      <span className="vehicle-name">{vehicle.vehicleName}</span>
                      <span className="downtime">{vehicle.downtime}h actual downtime</span>
                    </div>
                    <div className="reliability-bar">
                      <div 
                        className={`reliability-fill ${
                          vehicle.reliability >= 80 ? 'good' : 
                          vehicle.reliability >= 60 ? 'average' : 'poor'
                        }`}
                        style={{ width: `${vehicle.reliability}%` }}
                      ></div>
                    </div>
                    <span className="reliability-score">{vehicle.reliability.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="analytics-insights">
        <div className="insights-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Vehicle Performance Summary</h3>
            <button 
              onClick={() => setShowVehicleDetails(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Details
            </button>
          </div>
          <div className="vehicle-performance-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analyticsData.vehiclePerformance.slice(0, 3).map((vehicle, index) => (
              <div key={vehicle.vehicleId} className="performance-item" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div className="vehicle-info" style={{ flex: '1' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#212529' }}>
                    {vehicle.vehicleName}
                  </div>
                  <span className={`vehicle-status`} style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: vehicle.status === 'In Service' ? '#d4edda' : vehicle.status === 'Out for Repair' ? '#f8d7da' : '#fff3cd',
                    color: vehicle.status === 'In Service' ? '#155724' : vehicle.status === 'Out for Repair' ? '#721c24' : '#856404'
                  }}>
                    {vehicle.status}
                  </span>
                </div>
                <div className="performance-metrics" style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '12px',
                  flex: '2'
                }}>
                  <div className="metric">
                    <div style={{ color: '#6c757d' }}>Cost/Mile</div>
                    <div style={{ fontWeight: '600' }}>${vehicle.costPerMile.toFixed(4)}</div>
                  </div>
                  <div className="metric">
                    <div style={{ color: '#6c757d' }}>Records</div>
                    <div style={{ fontWeight: '600' }}>{vehicle.maintenanceCount}</div>
                  </div>
                  <div className="metric">
                    <div style={{ color: '#6c757d' }}>Total Cost</div>
                    <div style={{ fontWeight: '600' }}>{formatCurrency(vehicle.maintenanceCost)}</div>
                  </div>
                </div>
                <div className="performance-rank">
                  <span className={`rank-badge`} style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? '#28a745' : index < 2 ? '#007bff' : '#6c757d',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'center',
                    lineHeight: '28px'
                  }}>
                    #{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="insights-panel">
          <h3>Key Insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <TrendingUp className="insight-icon" />
              <span>Fleet utilization is {analyticsData.fleetUtilization > 80 ? 'optimal' : analyticsData.fleetUtilization > 60 ? 'good' : 'below target'} at {analyticsData.fleetUtilization.toFixed(1)}%</span>
            </div>
            <div className="insight-item">
              <DollarSign className="insight-icon" />
              <span>
                {(() => {
                  const trends = analyticsData.maintenanceTrends;
                  if (trends.length >= 2) {
                    const lastMonth = trends[trends.length - 1].cost;
                    const previousMonth = trends[trends.length - 2].cost;
                    const change = lastMonth - previousMonth;
                    const percentChange = previousMonth > 0 ? ((change / previousMonth) * 100).toFixed(1) : '0';
                    return `Maintenance costs ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(parseFloat(percentChange))}% from last period`;
                  }
                  return `Average maintenance cost: ${formatCurrency(analyticsData.avgMaintenanceCostPerVehicle)} per vehicle`;
                })()}
              </span>
            </div>
            <div className="insight-item">
              <Wrench className="insight-icon" />
              <span>
                {(() => {
                  if (analyticsData.mostCommonIssues.length > 0) {
                    const topIssue = analyticsData.mostCommonIssues[0];
                    return `Most frequent issue: ${topIssue.issue} (${topIssue.count} occurrences)`;
                  } else {
                    // Check if there are maintenance records but no categorized issues
                    const maintenanceRecords = maintenance.filter((record: MaintenanceEntry) => {
                      const now = new Date();
                      let startDate = new Date();
                      switch (dateRange) {
                        case '30d': startDate.setDate(now.getDate() - 30); break;
                        case '90d': startDate.setDate(now.getDate() - 90); break;
                        case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
                        default: startDate = new Date(0);
                      }
                      return new Date(record.date) >= startDate;
                    });
                    
                    if (maintenanceRecords.length === 0) {
                      return 'No maintenance records in selected period';
                    } else {
                      return `${maintenanceRecords.length} maintenance records found, but no clear issue patterns identified`;
                    }
                  }
                })()}
              </span>
            </div>
            <div className="insight-item">
              <BarChart3 className="insight-icon" />
              <span>
                {(() => {
                  const activeVehicles = trucks.filter(t => t.status === 'In Service').length;
                  const needsAttention = trucks.filter(t => t.status === 'Needs Attention').length;
                  const outForRepair = trucks.filter(t => t.status === 'Out for Repair').length;
                  
                  if (needsAttention > 0 || outForRepair > 0) {
                    return `${needsAttention + outForRepair} vehicles need attention (${needsAttention} maintenance, ${outForRepair} repairs)`;
                  }
                  return `All ${activeVehicles} active vehicles are operational`;
                })()}
              </span>
            </div>
            <div className="insight-item">
              <Calendar className="insight-icon" />
              <span>
                {(() => {
                  const trends = analyticsData.maintenanceTrends;
                  if (trends.length >= 1) {
                    const totalRecords = trends.reduce((sum, trend) => sum + trend.count, 0);
                    const avgPerMonth = totalRecords / trends.length;
                    return `Average ${avgPerMonth.toFixed(1)} maintenance records per month`;
                  }
                  return 'No maintenance trends available';
                })()}
              </span>
            </div>
            <div className="insight-item">
              <TrendingUp className="insight-icon" />
              <span>
                {(() => {
                  const preventiveCost = analyticsData.costBreakdown.find(c => c.category === 'Preventive Maintenance')?.amount || 0;
                  const repairCost = analyticsData.costBreakdown.find(c => c.category === 'Repairs')?.amount || 0;
                  const totalCost = preventiveCost + repairCost;
                  
                  if (totalCost > 0) {
                    const preventiveRatio = (preventiveCost / totalCost * 100).toFixed(0);
                    if (parseFloat(preventiveRatio) >= 60) {
                      return `Good preventive maintenance ratio: ${preventiveRatio}% preventive vs repairs`;
                    } else {
                      return `Consider more preventive maintenance: only ${preventiveRatio}% preventive vs repairs`;
                    }
                  }
                  return 'Insufficient data for cost analysis';
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Performance Details Modal - Compact Table View */}
      {showVehicleDetails && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div className="modal-header" style={{
              padding: '20px',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Fleet Performance Rankings</h3>
              <button 
                onClick={() => setShowVehicleDetails(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{
              maxHeight: 'calc(85vh - 140px)',
              overflow: 'auto'
            }}>
              {/* Compact Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px'
                }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '60px' }}>Rank</th>
                      <th style={{ padding: '12px 12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Vehicle</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '100px' }}>Status</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #dee2e6', width: '100px' }}>Cost/Mile</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #dee2e6', width: '80px' }}>Records</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #dee2e6', width: '120px' }}>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.vehiclePerformance.map((vehicle, index) => (
                      <tr key={vehicle.vehicleId} style={{
                        borderBottom: '1px solid #e9ecef',
                        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                      }}>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: index === 0 ? '#28a745' : index < 3 ? '#007bff' : index < 10 ? '#ffc107' : '#6c757d',
                            color: index < 10 && index >= 3 ? '#000' : 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'center',
                            lineHeight: '26px'
                          }}>
                            {index + 1}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>
                            {vehicle.vehicleName}
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '10px',
                            padding: '3px 6px',
                            borderRadius: '10px',
                            backgroundColor: vehicle.status === 'In Service' ? '#d4edda' : vehicle.status === 'Out for Repair' ? '#f8d7da' : '#fff3cd',
                            color: vehicle.status === 'In Service' ? '#155724' : vehicle.status === 'Out for Repair' ? '#721c24' : '#856404',
                            whiteSpace: 'nowrap'
                          }}>
                            {vehicle.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '500', fontFamily: 'monospace' }}>
                          ${vehicle.costPerMile.toFixed(4)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {vehicle.maintenanceCount}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '500' }}>
                          {formatCurrency(vehicle.maintenanceCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Summary Footer */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #e9ecef',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
                marginTop: '0'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                    ${analyticsData.vehiclePerformance[0]?.costPerMile.toFixed(4) || '0.0000'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Best Performer</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#dc3545' }}>
                    ${analyticsData.vehiclePerformance[analyticsData.vehiclePerformance.length - 1]?.costPerMile.toFixed(4) || '0.0000'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Needs Attention</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#007bff' }}>
                    ${(analyticsData.vehiclePerformance.reduce((sum, v) => sum + v.costPerMile, 0) / analyticsData.vehiclePerformance.length).toFixed(4)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Fleet Average</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                    {analyticsData.vehiclePerformance.filter(v => v.status === 'In Service').length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Active Vehicles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reliability Breakdown Modal */}
      {showReliabilityBreakdown && analyticsData && (
        <div className="modal-overlay" onClick={() => setShowReliabilityBreakdown(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Vehicle Reliability Score Breakdown</h2>
              <button className="close-btn" onClick={() => setShowReliabilityBreakdown(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Scoring Guidelines */}
              <div style={{ marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '15px', color: '#495057' }}>📊 Scoring Guidelines</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#28a745' }}>✅ Positive Factors</h4>
                    <ul style={{ fontSize: '12px', lineHeight: '1.4', margin: '0', paddingLeft: '15px' }}>
                      <li><strong>Vehicle Status:</strong> In Service (100pts), Needs Attention (70pts), Out for Repair (30pts)</li>
                      <li><strong>Low Maintenance Frequency:</strong> Below expected = higher score</li>
                      <li><strong>Preventive Maintenance Bonus:</strong> Up to +15pts for good preventive care ratio</li>
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#dc3545' }}>❌ Penalty Factors</h4>
                    <ul style={{ fontSize: '12px', lineHeight: '1.4', margin: '0', paddingLeft: '15px' }}>
                      <li><strong>Emergency Repairs:</strong> -10pts each</li>
                      <li><strong>Vehicle Age:</strong> -2pts per year (max -20pts)</li>
                      <li><strong>High Mileage:</strong> -3pts per 50k miles (max -15pts)</li>
                    </ul>
                  </div>
                </div>
                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '12px' }}>
                  <strong>Formula:</strong> Average(Status Score + Maintenance Score) - Penalties + Preventive Bonus = Final Score (0-100%)
                </div>
              </div>

              {/* Individual Vehicle Breakdowns */}
              <div>
                <h3 style={{ marginBottom: '15px', color: '#495057' }}>🚛 Individual Vehicle Breakdowns</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {analyticsData.vehicleReliability.map((vehicle, index) => (
                    <div key={index} style={{ 
                      border: '1px solid #e9ecef', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      backgroundColor: 'white'
                    }}>
                      {/* Vehicle Header */}
                      <div style={{ 
                        backgroundColor: vehicle.reliability >= 80 ? '#d4edda' : vehicle.reliability >= 60 ? '#fff3cd' : '#f8d7da',
                        padding: '12px 16px',
                        borderBottom: '1px solid #e9ecef'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>{vehicle.vehicleName}</h4>
                          <span style={{ fontSize: '18px', fontWeight: '700', color: vehicle.reliability >= 80 ? '#155724' : vehicle.reliability >= 60 ? '#856404' : '#721c24' }}>
                            {vehicle.reliability.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Breakdown Details */}
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
                          <div>
                            <strong>Base Scores:</strong>
                            <div style={{ marginLeft: '8px', lineHeight: '1.3' }}>
                              • Status Score: {vehicle.breakdown.statusScore}pts<br/>
                              • Maintenance Score: {vehicle.breakdown.maintenanceScore}pts
                            </div>
                          </div>
                          <div>
                            <strong>Penalties:</strong>
                            <div style={{ marginLeft: '8px', lineHeight: '1.3' }}>
                              • Emergency Repairs: -{vehicle.breakdown.emergencyPenalty}pts ({vehicle.breakdown.emergencyRepairs} repairs)<br/>
                              • Age Penalty: -{vehicle.breakdown.agePenalty}pts ({vehicle.breakdown.vehicleAge} years)<br/>
                              • Mileage Penalty: -{vehicle.breakdown.mileagePenalty}pts ({vehicle.breakdown.mileage.toLocaleString()} miles)
                            </div>
                          </div>
                          <div>
                            <strong>Bonuses:</strong>
                            <div style={{ marginLeft: '8px', lineHeight: '1.3' }}>
                              • Preventive Bonus: +{vehicle.breakdown.preventiveBonus}pts ({vehicle.breakdown.preventiveRatio}% preventive)
                            </div>
                          </div>
                          <div>
                            <strong>Maintenance Stats:</strong>
                            <div style={{ marginLeft: '8px', lineHeight: '1.3' }}>
                              • Expected/Year: {vehicle.breakdown.expectedMaintenancePerYear}<br/>
                              • Actual This Period: {vehicle.breakdown.actualMaintenanceThisYear}<br/>
                              • Preventive: {vehicle.breakdown.preventiveMaintenance} | Reactive: {vehicle.breakdown.reactiveMaintenance}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReliabilityBreakdown(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
