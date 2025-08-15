import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import ErrorBoundary, { PageErrorBoundary } from './components/common/ErrorBoundary';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { PasswordResetPage } from './components/pages/PasswordResetPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminPanel from './components/pages/AdminPanel';
import BulkVehicleManager from './components/pages/BulkVehicleManager';
import SupplierManager from './components/pages/SupplierManager';
import AnalyticsDashboard from './components/pages/AnalyticsDashboard';
import { NotificationCenter } from './components/pages/NotificationCenter';
import UserProfilePage from './components/pages/UserProfilePage';
import TruckDetailView from './components/pages/TruckDetailView';
import { DowntimeRecordsPage } from './components/pages/DowntimeRecordsPage';
import { EnhancedCalendarPage } from './components/pages/EnhancedCalendarPage';
import { RecurringMaintenancePage } from './components/pages/RecurringMaintenancePage';
import './App.css';
import './styles/enhanced.css';
import './styles/enhanced-features.css';
import './styles/comprehensive-enhanced.css';
import Dashboard from './components/pages/Dashboard';
import EnhancedTrucksPage from './components/pages/EnhancedTrucksPage';
import MaintenancePage from './components/pages/MaintenancePage';
import PartsPage from './components/pages/PartsPage';
import LoginPage from './components/pages/LoginPage';
import SignupPage from './components/pages/SignupPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      
      console.error('Top-level application error:', error, errorInfo);
    }}>
      <AppProvider>
        <Router>
          <Routes>
            
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/password-reset" element={<PasswordResetPage onBack={() => window.history.back()} />} />
            
            
            <Route path="/*" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};


const AppContent: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="app">
        <Header />
        <div className="app-body">
          <Sidebar />
          <main className="main-content sidebar-open">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary>} />
              <Route path="/trucks" element={<PageErrorBoundary pageName="Trucks"><EnhancedTrucksPage /></PageErrorBoundary>} />
              <Route path="/trucks/:truckId" element={<PageErrorBoundary pageName="Truck Details"><TruckDetailView /></PageErrorBoundary>} />
              <Route path="/maintenance" element={<PageErrorBoundary pageName="Maintenance"><MaintenancePage /></PageErrorBoundary>} />
              <Route path="/parts" element={<PageErrorBoundary pageName="Parts"><PartsPage /></PageErrorBoundary>} />
              <Route path="/analytics" element={<PageErrorBoundary pageName="Analytics Dashboard"><AnalyticsDashboard /></PageErrorBoundary>} />
              <Route path="/calendar" element={<PageErrorBoundary pageName="Calendar"><EnhancedCalendarPage /></PageErrorBoundary>} />
              <Route path="/downtime" element={<PageErrorBoundary pageName="Downtime Records"><DowntimeRecordsPage /></PageErrorBoundary>} />
              <Route path="/recurring-maintenance" element={<PageErrorBoundary pageName="Recurring Maintenance"><RecurringMaintenancePage /></PageErrorBoundary>} />
              
              <Route path="/admin" element={<PageErrorBoundary pageName="Admin Panel"><AdminPanel /></PageErrorBoundary>} />
              <Route path="/bulk-manager" element={<PageErrorBoundary pageName="Bulk Vehicle Manager"><BulkVehicleManager /></PageErrorBoundary>} />
              <Route path="/suppliers" element={<PageErrorBoundary pageName="Supplier Manager"><SupplierManager /></PageErrorBoundary>} />
              <Route path="/notifications" element={<PageErrorBoundary pageName="Notifications"><NotificationCenter /></PageErrorBoundary>} />
              <Route path="/profile" element={<PageErrorBoundary pageName="User Profile"><UserProfilePage /></PageErrorBoundary>} />
            </Routes>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
