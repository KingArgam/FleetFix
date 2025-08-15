import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, DollarSign, Wrench, Calendar, Download, RefreshCw, Info } from 'lucide-react';
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
  const [activeChart, setActiveChart] = useState<'costs' | 'trends' | 'reliability'>('costs');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [showReliabilityBreakdown, setShowReliabilityBreakdown] = useState(false);
  const [downtimeRecords, setDowntimeRecords] = useState<any[]>([]);

  // Clear any maintenance records with invalid dates from localStorage if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem('fleetfix_app_state');
      if (storedState) {
        try {
          const parsedState = JSON.parse(storedState);
          if (parsedState.maintenance && Array.isArray(parsedState.maintenance)) {
            const validMaintenanceRecords = parsedState.maintenance.filter((record: any) => {
              if (!record.date) return false;
              try {
                const testDate = new Date(record.date);
                const isValid = !isNaN(testDate.getTime()) && testDate.getTime() > 0;
                const currentYear = new Date().getFullYear();
                const recordYear = testDate.getFullYear();
                const hasReasonableYear = recordYear >= 1900 && recordYear <= currentYear + 10;
                return isValid && hasReasonableYear;
              } catch {
                return false;
              }
            });
            
            if (validMaintenanceRecords.length !== parsedState.maintenance.length) {
              console.log(`Cleaned ${parsedState.maintenance.length - validMaintenanceRecords.length} invalid maintenance records from localStorage`);
              parsedState.maintenance = validMaintenanceRecords;
              localStorage.setItem('fleetfix_app_state', JSON.stringify(parsedState));
            }
          }
        } catch (error) {
          console.warn('Error cleaning maintenance data:', error);
        }
      }
    }
  }, []);

  
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
      setDowntimeRecords([]); 
    }
  };

  useEffect(() => {
    loadDowntimeRecords();
  }, []);

  const calculateAnalytics = useCallback(async (
    trucks: Truck[], 
    records: MaintenanceEntry[], 
    parts: Part[],
    allMaintenanceRecords: MaintenanceEntry[] 
  ): Promise<AnalyticsData> => {
    
    const fleetUtilization = trucks.length > 0 
      ? (trucks.filter(t => t.status === 'In Service').length / trucks.length) * 100 
      : 0;

    
    const totalMaintenanceCost = allMaintenanceRecords.reduce((sum, record) => 
      sum + (record.cost || 0), 0
    );

    
    const avgMaintenanceCostPerVehicle = trucks.length > 0 
      ? totalMaintenanceCost / trucks.length 
      : 0;

    
    const issueCount: { [key: string]: number } = {};
    records.forEach(record => {
      
      if (record.type) {
        const maintenanceType = record.type;
        issueCount[maintenanceType] = (issueCount[maintenanceType] || 0) + 1;
      }
    });

    const mostCommonIssues = (() => {
      const sortedIssues = Object.entries(issueCount)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => {
          
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.issue.localeCompare(b.issue);
        });
      
      if (sortedIssues.length === 0) return [];
      
      
      return sortedIssues;
    })();

    
    const monthlyData: { [key: string]: { cost: number; count: number; sortDate: Date } } = {};
    records.forEach(record => {
      if (!record.date) return;
      
      try {
        const recordDate = new Date(record.date);
        
        // Validate that the date is valid
        if (isNaN(recordDate.getTime()) || recordDate.getTime() <= 0) {
          console.warn('Invalid date in maintenance record:', { 
            id: record.id, 
            date: record.date, 
            type: record.type,
            parsedDate: recordDate 
          });
          return;
        }
        
        // Ensure we have a reasonable date
        const currentYear = new Date().getFullYear();
        const recordYear = recordDate.getFullYear();
        if (recordYear < 1900 || recordYear > currentYear + 10) {
          console.warn('Unrealistic date in maintenance record:', { 
            id: record.id, 
            date: record.date, 
            year: recordYear,
            type: record.type 
          });
          return;
        }
        
        const month = recordDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthlyData[month]) {
          monthlyData[month] = { 
            cost: 0, 
            count: 0, 
            sortDate: new Date(recordDate.getFullYear(), recordDate.getMonth(), 1) 
          };
        }
        monthlyData[month].cost += record.cost || 0;
        monthlyData[month].count += 1;
      } catch (error) {
        console.warn('Invalid date in maintenance record:', record);
      }
    });

    
    const maintenanceTrends = Object.entries(monthlyData)
      .map(([month, data]) => ({ 
        month, 
        cost: data.cost, 
        count: data.count,
        sortDate: data.sortDate 
      }))
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ month, cost, count }) => ({ month, cost, count })); 

    
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

    
    const breakdownMap: { [category: string]: number } = {};
    let totalCost = 0;
    records.forEach(record => {
      const category = record.type || 'Other';
      breakdownMap[category] = (breakdownMap[category] || 0) + (record.cost || 0);
      totalCost += record.cost || 0;
    });
    const costBreakdown = Object.entries(breakdownMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    
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
    }).sort((a, b) => a.costPerMile - b.costPerMile); 

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
  }, [downtimeRecords]);

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      // Always use 'all time' - no date filtering
      // Use all maintenance records since we're always showing all time
      const filteredRecords = maintenance;
      
      const analytics = await calculateAnalytics(trucks, filteredRecords, parts, maintenance);
      
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [calculateAnalytics, maintenance, trucks, parts]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleExport = async () => {
    if (!analyticsData) return;
    
    setLoading(true);
    try {
      const reportData = {
        dateRange: 'all',
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
      
      'Fleet Analytics Report',
      `Generated: ${new Date().toLocaleDateString()}`,
      `Date Range: All Time`,
      '',
      'Summary',
      'Metric,Value',
      `Total Vehicles,${data.summary.totalVehicles}`,
      `Fleet Utilization,${data.summary.fleetUtilization.toFixed(1)}%`,
      `Total Maintenance Cost,$${data.summary.totalMaintenanceCost.toFixed(2)}`,
      `Average Cost Per Vehicle,$${data.summary.avgCostPerVehicle.toFixed(2)}`,
      '',
      
      'Monthly Trends',
      'Month,Cost,Count',
      ...data.trends.map((t: any) => `${t.month},$${t.cost.toFixed(2)},${t.count}`),
      '',
      
      'Most Frequent Maintenance',
      'Maintenance Type,Count',
      ...data.issues.map((i: any) => `${i.issue},${i.count}`),
      ''
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet_analytics_all_time_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsExcel = (data: any) => {
    
    exportAsCSV(data);
  };

  const exportAsPDF = (data: any) => {
    
    
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
          <p>Date Range: All Time</p>
          
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


  
  // Calculate real-time metrics directly from context data for immediate updates
  const realTimeFleetUtilization = trucks.length > 0 
    ? (trucks.filter((t: Truck) => t.status === 'In Service').length / trucks.length) * 100 
    : 0;
  
  const realTimeTotalMaintenanceCost = maintenance.reduce((sum: number, record: MaintenanceEntry) => {
    const cost = typeof record.cost === 'number' && !isNaN(record.cost) ? record.cost : 0;
    return sum + cost;
  }, 0);
  
  const realTimeAvgMaintenanceCostPerVehicle = trucks.length > 0 
    ? realTimeTotalMaintenanceCost / trucks.length 
    : 0;

  // Calculate filtered records - always use all records since we're showing all time
  const getFilteredRecords = () => {
    // Always return all maintenance records since we're set to "all time"
    return maintenance.filter((record: MaintenanceEntry) => {
      if (!record.date) {
        console.warn('Maintenance record missing date:', record);
        return false;
      }
      try {
        const testDate = new Date(record.date);
        const isValidDate = !isNaN(testDate.getTime()) && testDate.getTime() > 0;
        if (!isValidDate) {
          console.warn('Invalid date in maintenance record:', { id: record.id, date: record.date, type: record.type, parsedDate: testDate });
        }
        return isValidDate; // Include only valid dates
      } catch (error) {
        console.warn('Error parsing date in maintenance record:', record, error);
        return false;
      }
    });
  };

  const filteredRecords = getFilteredRecords();

  // Rebuilt real-time cost breakdown calculation with enhanced data validation
  const realTimeCostBreakdown = (() => {
    const breakdownMap: { [category: string]: number } = {};
    let totalCost = 0;
    
    // Process each record with enhanced validation
    filteredRecords.forEach((record: MaintenanceEntry) => {
      // Ensure we have valid cost data
      const cost = typeof record.cost === 'number' && !isNaN(record.cost) && record.cost > 0 ? record.cost : 0;
      const category = record.type || 'Other';
      
      if (cost > 0) {
        breakdownMap[category] = (breakdownMap[category] || 0) + cost;
        totalCost += cost;
      }
    });

    // Only return entries with actual costs
    const result = Object.entries(breakdownMap)
      .filter(([category, amount]) => amount > 0)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0
      }))
      .sort((a: any, b: any) => b.amount - a.amount);
    
    return result;
  })();

  // Rebuilt real-time maintenance trends calculation
  const realTimeMaintenanceTrends = (() => {
    const monthlyData: { [key: string]: { cost: number; count: number; sortDate: Date; dates: string[] } } = {};
    
    console.log('Processing maintenance trends for', filteredRecords.length, 'filtered records');
    
    filteredRecords.forEach((record: MaintenanceEntry) => {
      if (!record.date) return;
      
      try {
        const recordDate = new Date(record.date);
        
        // Enhanced validation
        if (isNaN(recordDate.getTime()) || recordDate.getTime() <= 0) {
          console.warn('Invalid date in maintenance record for trends:', { 
            id: record.id, 
            date: record.date, 
            type: record.type,
            parsedDate: recordDate,
            timestamp: recordDate.getTime(),
            originalDateString: String(record.date)
          });
          return;
        }
        
        // Check for specific problematic dates like "August 25"
        if (String(record.date).toLowerCase().includes('august') || 
            recordDate.toLocaleDateString().includes('August') ||
            recordDate.getMonth() === 7) { // August is month 7
          console.error('🚨 FOUND AUGUST DATE in maintenance record:', {
            id: record.id,
            originalDate: record.date,
            parsedDate: recordDate.toISOString(),
            displayDate: recordDate.toLocaleDateString(),
            month: recordDate.toLocaleString('default', { month: 'long' }),
            type: record.type,
            fullRecord: record
          });
        }
        
        // Ensure we have a reasonable date (not too far in past/future)
        const currentYear = new Date().getFullYear();
        const recordYear = recordDate.getFullYear();
        if (recordYear < 1900 || recordYear > currentYear + 10) {
          console.warn('Unrealistic date in maintenance record:', { 
            id: record.id, 
            date: record.date, 
            year: recordYear,
            type: record.type 
          });
          return;
        }
        
        const month = recordDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        const dateString = recordDate.toLocaleDateString();
        
        console.log(`Processing record ${record.id}: date=${record.date}, parsed=${recordDate.toISOString()}, month=${month}`);
        
        if (!monthlyData[month]) {
          monthlyData[month] = { 
            cost: 0, 
            count: 0, 
            sortDate: new Date(recordDate.getFullYear(), recordDate.getMonth(), 1),
            dates: []
          };
        }
        
        monthlyData[month].cost += (typeof record.cost === 'number' && !isNaN(record.cost) ? record.cost : 0);
        monthlyData[month].count += 1;
        if (!monthlyData[month].dates.includes(dateString)) {
          monthlyData[month].dates.push(dateString);
        }
      } catch (error) {
        console.warn('Error processing date in maintenance record for trends:', record, error);
      }
    });

    const result = Object.entries(monthlyData)
      .map(([month, data]) => ({ 
        month, 
        cost: data.cost, 
        count: data.count,
        sortDate: data.sortDate,
        dates: data.dates.sort()
      }))
      .sort((a: any, b: any) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ month, cost, count, dates }) => ({ month, cost, count, dates }));
    
    console.log('Final maintenance trends result:', result);
    return result;
  })();

  // Real-time vehicle reliability calculation
  const realTimeVehicleReliability = (() => {
    return trucks.map((truck: Truck) => {
      const vehicleRecords = maintenance.filter((r: MaintenanceEntry) => r.truckId === truck.id);
      const recentRecords = filteredRecords.filter((r: MaintenanceEntry) => r.truckId === truck.id);
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - truck.year;
      const mileage = truck.mileage || 0;
      const expectedMaintenancePerYear = Math.max(4, Math.floor(mileage / 15000));
      const actualMaintenanceThisYear = recentRecords.length;
      const maintenanceScore = Math.max(0, 100 - (actualMaintenanceThisYear / expectedMaintenancePerYear) * 30);
      const emergencyRepairs = vehicleRecords.filter((r: MaintenanceEntry) =>
        r.type === 'Emergency Repair' ||
        (r.notes && r.notes.toLowerCase().includes('emergency'))
      ).length;
      const emergencyPenalty = emergencyRepairs * 10;
      const statusScore = truck.status === 'In Service' ? 100 :
        truck.status === 'Needs Attention' ? 70 :
        truck.status === 'Out for Repair' ? 30 : 50;
      const agePenalty = Math.min(20, vehicleAge * 2);
      const mileagePenalty = Math.min(15, Math.floor(mileage / 50000) * 3);
      const preventiveMaintenance = vehicleRecords.filter((r: MaintenanceEntry) =>
        r.type === 'Oil Change' ||
        r.type === 'DOT Inspection' ||
        r.type === 'Preventive Maintenance' ||
        r.type === 'Brake Inspection' ||
        r.type === 'Tire Replacement'
      ).length;
      const reactiveMaintenance = vehicleRecords.filter((r: MaintenanceEntry) =>
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
      
      const truckDowntimeRecords = downtimeRecords.filter((record: any) => record.truckId === truck.id);
      const actualDowntime = truckDowntimeRecords.reduce((total: number, record: any) => {
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
    }).sort((a: any, b: any) => b.reliability - a.reliability);
  })();

  // Real-time vehicle performance calculation
  const realTimeVehiclePerformance = (() => {
    return trucks.map((truck: Truck) => {
      const vehicleMaintenanceRecords = maintenance.filter((record: MaintenanceEntry) => record.truckId === truck.id);
      const maintenanceCost = vehicleMaintenanceRecords.reduce((sum: number, record: MaintenanceEntry) => sum + (record.cost || 0), 0);
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
    }).sort((a: any, b: any) => a.costPerMile - b.costPerMile);
  })();

  // Real-time most common issues calculation
  const realTimeMostCommonIssues = (() => {
    const issueCount: { [key: string]: number } = {};
    filteredRecords.forEach((record: MaintenanceEntry) => {
      if (record.type) {
        const maintenanceType = record.type;
        issueCount[maintenanceType] = (issueCount[maintenanceType] || 0) + 1;
      }
    });

    const sortedIssues = Object.entries(issueCount)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a: any, b: any) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.issue.localeCompare(b.issue);
      });
    
    return sortedIssues;
  })();

  // Use real-time calculations instead of async data
  const safeAnalytics = {
    fleetUtilization: realTimeFleetUtilization,
    totalMaintenanceCost: realTimeTotalMaintenanceCost,
    avgMaintenanceCostPerVehicle: realTimeAvgMaintenanceCostPerVehicle,
    mostCommonIssues: realTimeMostCommonIssues,
    maintenanceTrends: realTimeMaintenanceTrends,
    vehicleReliability: realTimeVehicleReliability,
    costBreakdown: realTimeCostBreakdown,
    vehiclePerformance: realTimeVehiclePerformance
  };

  return (
    <div className="analytics-dashboard">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>Fleet performance insights and reporting</p>
      </div>

      <div className="analytics-controls">
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
            <h3>{realTimeFleetUtilization.toFixed(1)}%</h3>
            <p>Fleet Utilization <small>(Real-time)</small></p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <DollarSign className="icon success" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(realTimeTotalMaintenanceCost)}</h3>
            <p>Total Maintenance Cost <small>(All-time)</small></p>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <Wrench className="icon warning" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(realTimeAvgMaintenanceCostPerVehicle)}</h3>
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
                {(() => {
                  const hasMaintenanceRecords = filteredRecords.length > 0;
                  const hasCostData = realTimeCostBreakdown.length > 0;
                  const totalMaintenanceRecords = maintenance.length;
                  const recordsWithCosts = filteredRecords.filter((r: MaintenanceEntry) => typeof r.cost === 'number' && r.cost > 0).length;
                  
                  // Enhanced debugging information (can be removed in production)
                  console.log('Cost Breakdown Debug:', {
                    totalMaintenanceRecords,
                    filteredRecordsCount: filteredRecords.length,
                    recordsWithCosts,
                    realTimeCostBreakdown,
                    currentUser: currentUser?.id || 'no user',
                    sampleMaintenanceRecords: maintenance.slice(0, 3).map((r: MaintenanceEntry) => ({ 
                      id: r.id, 
                      date: r.date, 
                      dateType: typeof r.date,
                      parsedDate: new Date(r.date).toISOString(),
                      cost: r.cost, 
                      type: r.type 
                    })),
                    filteredSampleRecords: filteredRecords.slice(0, 3).map((r: MaintenanceEntry) => ({ 
                      id: r.id, 
                      date: r.date, 
                      dateType: typeof r.date,
                      parsedDate: new Date(r.date).toISOString(),
                      cost: r.cost, 
                      type: r.type 
                    }))
                  });
                  
                  if (!hasMaintenanceRecords) {
                    return (
                      <div className="no-data-message" style={{
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '14px',
                        padding: '40px 20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px dashed #dee2e6'
                      }}>
                        <div style={{ marginBottom: '12px', fontSize: '16px' }}>📊</div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>No maintenance data in selected period</div>
                        <div style={{ fontSize: '12px' }}>
                          {totalMaintenanceRecords > 0 
                            ? `Found ${totalMaintenanceRecords} total records, but none in the current period. Add recent maintenance records to see the breakdown.`
                            : 'Add maintenance records with costs to see breakdown'
                          }
                        </div>
                      </div>
                    );
                  }
                  
                  if (!hasCostData) {
                    return (
                      <div className="no-data-message" style={{
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '14px',
                        padding: '40px 20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px dashed #dee2e6'
                      }}>
                        <div style={{ marginBottom: '12px', fontSize: '16px' }}>💰</div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Maintenance records found, but no costs recorded</div>
                        <div style={{ fontSize: '12px' }}>
                          Found {filteredRecords.length} maintenance records, but {recordsWithCosts === 0 ? 'none have cost values' : `only ${recordsWithCosts} have costs`}. 
                          Add cost information to existing records to see the breakdown.
                        </div>
                      </div>
                    );
                  }
                  
                  // Display the cost breakdown chart
                  return realTimeCostBreakdown.map((item, index) => (
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
                  ));
                })()}
              </div>
            </div>
          )}

          {activeChart === 'trends' && (
            <div className="chart-panel">
              <h3>Maintenance Trends</h3>
              <div className="trends-chart">
                {(() => {
                  const hasMaintenanceRecords = filteredRecords.length > 0;
                  const hasTrendData = realTimeMaintenanceTrends.length > 0;
                  const totalMaintenanceRecords = maintenance.length;
                  
                  console.log('Maintenance Trends Debug:', {
                    totalMaintenanceRecords,
                    filteredRecordsCount: filteredRecords.length,
                    realTimeMaintenanceTrends
                  });
                  
                  if (!hasMaintenanceRecords) {
                    return (
                      <div className="no-data-message" style={{
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '14px',
                        padding: '40px 20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px dashed #dee2e6'
                      }}>
                        <div style={{ marginBottom: '12px', fontSize: '16px' }}>📈</div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>No maintenance trends available</div>
                        <div style={{ fontSize: '12px' }}>
                          {totalMaintenanceRecords > 0 
                            ? `Found ${totalMaintenanceRecords} total records, but none have valid dates. Please check maintenance record dates and ensure they are properly formatted.`
                            : 'Add maintenance records with valid dates to see monthly trends'
                          }
                        </div>
                      </div>
                    );
                  }
                  
                  if (!hasTrendData) {
                    return (
                      <div className="no-data-message" style={{
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '14px',
                        padding: '40px 20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px dashed #dee2e6'
                      }}>
                        <div style={{ marginBottom: '12px', fontSize: '16px' }}>📈</div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>No valid maintenance trends data</div>
                        <div style={{ fontSize: '12px' }}>
                          Found {filteredRecords.length} maintenance records, but they don't have valid dates for trend analysis. 
                          Please ensure maintenance records have proper date values (not "August 25" or other invalid dates).
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '8px', color: '#dc3545' }}>
                          Check the browser console for detailed information about invalid dates found.
                        </div>
                      </div>
                    );
                  }
                  
                  // Display the trends chart
                  return (
                    <div className="chart-area">
                      {realTimeMaintenanceTrends.map((trend, index) => {
                        const maxCost = Math.max(...realTimeMaintenanceTrends.map(t => t.cost));
                        const height = maxCost > 0 ? (trend.cost / maxCost) * 200 : 0;
                        
                        // Create detailed tooltip with actual maintenance dates
                        const datesText = trend.dates && trend.dates.length > 0 
                          ? `Maintenance dates: ${trend.dates.join(', ')}`
                          : 'No specific dates available';
                        const tooltipText = `${trend.month}: ${formatCurrency(trend.cost)} (${trend.count} records)\n${datesText}`;
                        
                        return (
                          <div key={index} className="trend-bar">
                            <div 
                              className="bar" 
                              style={{ height: `${height}px` }}
                              title={tooltipText}
                            ></div>
                            <span className="month-label">{trend.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
                {safeAnalytics.vehicleReliability.slice(0, 10).map((vehicle: any, index: number) => (
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
            {safeAnalytics.vehiclePerformance.slice(0, 3).map((vehicle: any, index: number) => (
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
              <span>Fleet utilization is {safeAnalytics.fleetUtilization > 80 ? 'optimal' : safeAnalytics.fleetUtilization > 60 ? 'good' : 'below target'} at {safeAnalytics.fleetUtilization.toFixed(1)}%</span>
            </div>
            <div className="insight-item">
              <DollarSign className="insight-icon" />
              <span>
                {(() => {
                  const trends = safeAnalytics.maintenanceTrends;
                  if (trends.length >= 2) {
                    const lastMonth = trends[trends.length - 1].cost;
                    const previousMonth = trends[trends.length - 2].cost;
                    const change = lastMonth - previousMonth;
                    const percentChange = previousMonth > 0 ? ((change / previousMonth) * 100).toFixed(1) : '0';
                    return `Maintenance costs ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(parseFloat(percentChange))}% from last period`;
                  }
                  return `Average maintenance cost: ${formatCurrency(safeAnalytics.avgMaintenanceCostPerVehicle)} per vehicle`;
                })()}
              </span>
            </div>
            <div className="insight-item">
              <Wrench className="insight-icon" />
              <span>
                {(() => {
                  if (safeAnalytics.mostCommonIssues.length > 0) {
                    const topIssue = safeAnalytics.mostCommonIssues[0];
                    return `Most frequent issue: ${topIssue.issue} (${topIssue.count} occurrences)`;
                  } else {
                    // Since we're using all time, just use all maintenance records
                    const maintenanceRecords = maintenance;
                    
                    if (maintenanceRecords.length === 0) {
                      return 'No maintenance records available';
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
                  const activeVehicles = trucks.filter((t: Truck) => t.status === 'In Service').length;
                  const needsAttention = trucks.filter((t: Truck) => t.status === 'Needs Attention').length;
                  const outForRepair = trucks.filter((t: Truck) => t.status === 'Out for Repair').length;
                  
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
                  const trends = safeAnalytics.maintenanceTrends;
                  if (trends && trends.length >= 1) {
                    const totalRecords = trends.reduce((sum: number, trend: { month: string; cost: number; count: number }) => sum + trend.count, 0);
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
                  const preventiveCost = safeAnalytics.costBreakdown.find((c: { category: string; amount: number; percentage: number }) => c.category === 'Preventive Maintenance')?.amount || 0;
                  const repairCost = safeAnalytics.costBreakdown.find((c: { category: string; amount: number; percentage: number }) => c.category === 'Repairs')?.amount || 0;
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

      {}
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
              {}
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
                    {safeAnalytics.vehiclePerformance.map((vehicle: any, index: number) => (
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
              
              {}
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
                    ${safeAnalytics.vehiclePerformance[0]?.costPerMile.toFixed(4) || '0.0000'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Best Performer</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#dc3545' }}>
                    ${safeAnalytics.vehiclePerformance[safeAnalytics.vehiclePerformance.length - 1]?.costPerMile.toFixed(4) || '0.0000'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Needs Attention</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#007bff' }}>
                    ${(safeAnalytics.vehiclePerformance && safeAnalytics.vehiclePerformance.length > 0 ? (safeAnalytics.vehiclePerformance.reduce((sum: number, v: { vehicleId: string; vehicleName: string; maintenanceCost: number; maintenanceCount: number; costPerMile: number; status: string }) => sum + v.costPerMile, 0) / safeAnalytics.vehiclePerformance.length) : 0).toFixed(4)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Fleet Average</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                    {safeAnalytics.vehiclePerformance ? safeAnalytics.vehiclePerformance.filter((v: { vehicleId: string; vehicleName: string; maintenanceCost: number; maintenanceCount: number; costPerMile: number; status: string }) => v.status === 'In Service').length : 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '500' }}>Active Vehicles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {showReliabilityBreakdown && analyticsData && (
        <div className="modal-overlay" onClick={() => setShowReliabilityBreakdown(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Vehicle Reliability Score Breakdown</h2>
              <button className="close-btn" onClick={() => setShowReliabilityBreakdown(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {}
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

              {}
              <div>
                <h3 style={{ marginBottom: '15px', color: '#495057' }}>🚛 Individual Vehicle Breakdowns</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {safeAnalytics.vehicleReliability.map((vehicle: any, index: number) => (
                    <div key={index} style={{ 
                      border: '1px solid #e9ecef', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      backgroundColor: 'white'
                    }}>
                      {}
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
                      
                      {}
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
