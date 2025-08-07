import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Wrench, Calendar, Download, Filter, RefreshCw } from 'lucide-react';
import { Truck, MaintenanceEntry, Part } from '../../types';
import { useAppContext } from '../../contexts/AppContext';

interface AnalyticsDashboardProps {}

interface AnalyticsData {
  fleetUtilization: number;
  totalMaintenanceCost: number;
  avgMaintenanceCostPerVehicle: number;
  mostCommonIssues: Array<{ issue: string; count: number }>;
  maintenanceTrends: Array<{ month: string; cost: number; count: number }>;
  vehicleReliability: Array<{ vehicleId: string; vehicleName: string; reliability: number; downtime: number }>;
  costBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  partsUsage: Array<{ partName: string; usage: number; cost: number }>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
  const { state } = useAppContext();
  const { trucks, maintenance, parts } = state;
  
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '1y' | 'all'>('90d');
  const [activeChart, setActiveChart] = useState<'costs' | 'trends' | 'reliability' | 'parts'>('costs');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange, trucks, maintenance, parts]);

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

      // Filter maintenance records by date range
      const filteredRecords = maintenance.filter((record: MaintenanceEntry) => 
        new Date(record.date) >= startDate
      );

      // Calculate analytics
      const analytics = await calculateAnalytics(trucks, filteredRecords, parts);
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
    parts: Part[]
  ): Promise<AnalyticsData> => {
    // Fleet utilization (mock calculation)
    const fleetUtilization = trucks.length > 0 
      ? (trucks.filter(t => t.status === 'In Service').length / trucks.length) * 100 
      : 0;

    // Total maintenance cost
    const totalMaintenanceCost = records.reduce((sum, record) => 
      sum + (record.cost || 0), 0
    );

    // Average cost per vehicle
    const avgMaintenanceCostPerVehicle = trucks.length > 0 
      ? totalMaintenanceCost / trucks.length 
      : 0;

    // Most common issues
    const issueCount: { [key: string]: number } = {};
    records.forEach(record => {
      if (record.notes) {
        // Simple categorization based on keywords
        const desc = record.notes.toLowerCase();
        if (desc.includes('oil') || desc.includes('engine')) {
          issueCount['Engine/Oil'] = (issueCount['Engine/Oil'] || 0) + 1;
        } else if (desc.includes('brake')) {
          issueCount['Brakes'] = (issueCount['Brakes'] || 0) + 1;
        } else if (desc.includes('tire') || desc.includes('wheel')) {
          issueCount['Tires/Wheels'] = (issueCount['Tires/Wheels'] || 0) + 1;
        } else if (desc.includes('electric') || desc.includes('battery')) {
          issueCount['Electrical'] = (issueCount['Electrical'] || 0) + 1;
        } else {
          issueCount['Other'] = (issueCount['Other'] || 0) + 1;
        }
      }
    });

    const mostCommonIssues = Object.entries(issueCount)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Maintenance trends (monthly)
    const monthlyData: { [key: string]: { cost: number; count: number } } = {};
    records.forEach(record => {
      const month = new Date(record.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthlyData[month]) {
        monthlyData[month] = { cost: 0, count: 0 };
      }
      monthlyData[month].cost += record.cost || 0;
      monthlyData[month].count += 1;
    });

    const maintenanceTrends = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months

    // Vehicle reliability (mock calculation)
    const vehicleReliability = trucks.map(truck => {
      const vehicleRecords = records.filter(r => r.truckId === truck.id);
      const reliability = Math.max(0, 100 - (vehicleRecords.length * 2)); // Simple calculation
      const downtime = vehicleRecords.length * 2; // Mock calculation: 2 hours per maintenance record
      
      return {
        vehicleId: truck.id,
        vehicleName: `${truck.make} ${truck.model}`,
        reliability,
        downtime
      };
    });

    // Cost breakdown
    const costBreakdown = [
      { category: 'Preventive Maintenance', amount: totalMaintenanceCost * 0.6, percentage: 60 },
      { category: 'Repairs', amount: totalMaintenanceCost * 0.25, percentage: 25 },
      { category: 'Parts Replacement', amount: totalMaintenanceCost * 0.15, percentage: 15 }
    ];

    // Parts usage
    const partsUsage = parts.slice(0, 10).map(part => ({
      partName: part.name,
      usage: Math.floor(Math.random() * 50) + 1, // Mock usage
      cost: part.cost * (Math.floor(Math.random() * 10) + 1) // Mock total cost
    }));

    return {
      fleetUtilization,
      totalMaintenanceCost,
      avgMaintenanceCostPerVehicle,
      mostCommonIssues,
      maintenanceTrends,
      vehicleReliability,
      costBreakdown,
      partsUsage
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
        costs: analyticsData.costBreakdown,
        parts: analyticsData.partsUsage
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
      'Common Issues',
      'Issue,Count',
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
        </div>

        <div className="export-controls">
          <select 
            value={exportFormat} 
            onChange={(e) => setExportFormat(e.target.value as any)}
          >
            <option value="pdf">PDF Report</option>
            <option value="excel">Excel Export</option>
            <option value="csv">CSV Export</option>
          </select>
          <button 
            className="btn btn-primary"
            onClick={handleExport}
            disabled={loading}
          >
            <Download size={20} />
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={loadAnalyticsData}
          disabled={loading}
        >
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>

      <div className="analytics-overview">
        <div className="overview-card">
          <div className="card-icon">
            <BarChart3 className="icon primary" />
          </div>
          <div className="card-content">
            <h3>{analyticsData.fleetUtilization.toFixed(1)}%</h3>
            <p>Fleet Utilization</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <DollarSign className="icon success" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(analyticsData.totalMaintenanceCost)}</h3>
            <p>Total Maintenance Cost</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <Wrench className="icon warning" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(analyticsData.avgMaintenanceCostPerVehicle)}</h3>
            <p>Avg Cost Per Vehicle</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <Calendar className="icon info" />
          </div>
          <div className="card-content">
            <h3>{maintenance.length}</h3>
            <p>Total Maintenance Records</p>
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
          <button 
            className={`tab-button ${activeChart === 'parts' ? 'active' : ''}`}
            onClick={() => setActiveChart('parts')}
          >
            Parts Usage
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
              <h3>Vehicle Reliability Scores</h3>
              <div className="reliability-chart">
                {analyticsData.vehicleReliability.slice(0, 10).map((vehicle, index) => (
                  <div key={index} className="reliability-item">
                    <div className="vehicle-info">
                      <span className="vehicle-name">{vehicle.vehicleName}</span>
                      <span className="downtime">{vehicle.downtime}h downtime</span>
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

          {activeChart === 'parts' && (
            <div className="chart-panel">
              <h3>Parts Usage Analysis</h3>
              <div className="parts-usage-chart">
                <table className="parts-table">
                  <thead>
                    <tr>
                      <th>Part Name</th>
                      <th>Usage Count</th>
                      <th>Total Cost</th>
                      <th>Usage Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.partsUsage.map((part, index) => {
                      const maxUsage = Math.max(...analyticsData.partsUsage.map(p => p.usage));
                      const usagePercentage = maxUsage > 0 ? (part.usage / maxUsage) * 100 : 0;
                      
                      return (
                        <tr key={index}>
                          <td>{part.partName}</td>
                          <td>{part.usage}</td>
                          <td>{formatCurrency(part.cost)}</td>
                          <td>
                            <div className="usage-bar">
                              <div 
                                className="usage-fill" 
                                style={{ width: `${usagePercentage}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="analytics-insights">
        <div className="insights-panel">
          <h3>Common Issues</h3>
          <div className="issues-list">
            {analyticsData.mostCommonIssues.map((issue, index) => (
              <div key={index} className="issue-item">
                <span className="issue-name">{issue.issue}</span>
                <span className="issue-count">{issue.count} occurrences</span>
              </div>
            ))}
          </div>
        </div>

        <div className="insights-panel">
          <h3>Key Insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <TrendingUp className="insight-icon" />
              <span>Fleet utilization is {analyticsData.fleetUtilization > 80 ? 'optimal' : 'below target'}</span>
            </div>
            <div className="insight-item">
              <DollarSign className="insight-icon" />
              <span>Maintenance costs have {Math.random() > 0.5 ? 'increased' : 'decreased'} compared to last period</span>
            </div>
            <div className="insight-item">
              <Wrench className="insight-icon" />
              <span>Most frequent issue: {analyticsData.mostCommonIssues[0]?.issue || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
