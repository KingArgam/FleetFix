import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { PasswordResetPage } from './components/pages/PasswordResetPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminPanel from './components/pages/AdminPanel';
import BulkVehicleManager from './components/pages/BulkVehicleManager';
import SupplierManager from './components/pages/SupplierManager';
import AnalyticsDashboard from './components/pages/AnalyticsDashboard';
import NotificationCenter from './components/pages/NotificationCenter';
import UserProfilePage from './components/pages/UserProfilePage';
import { DowntimeRecordsPage } from './components/pages/DowntimeRecordsPage';
import { EnhancedCalendarPage } from './components/pages/EnhancedCalendarPage';
import { RecurringMaintenancePage } from './components/pages/RecurringMaintenancePage';
import './App.css';
import './styles/enhanced.css';
import './styles/enhanced-features.css';
import './styles/comprehensive-enhanced.css';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const EnhancedTrucksPage = lazy(() => import('./components/pages/EnhancedTrucksPage'));
const MaintenancePage = lazy(() => import('./components/pages/MaintenancePage'));
const PartsPage = lazy(() => import('./components/pages/PartsPage'));
const LoginPage = lazy(() => import('./components/pages/LoginPage'));
const SignupPage = lazy(() => import('./components/pages/SignupPage'));

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/password-reset" element={<PasswordResetPage onBack={() => window.history.back()} />} />
          
          {/* Protected Routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AppProvider>
  );
};

// Separate component for protected app content
const AppContent: React.FC = () => {
  return (
    <div className="app">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main-content sidebar-open">
          <Routes>
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/dashboard" 
              element={<Dashboard />} 
            />
            <Route 
              path="/trucks" 
              element={<EnhancedTrucksPage />} 
            />
            <Route 
              path="/maintenance" 
              element={<MaintenancePage />} 
            />
            <Route 
              path="/parts" 
              element={<PartsPage />} 
            />
            <Route 
              path="/analytics-dashboard" 
              element={<AnalyticsDashboard />} 
            />
            <Route 
              path="/calendar" 
              element={<EnhancedCalendarPage />} 
            />
            <Route 
              path="/downtime" 
              element={<DowntimeRecordsPage />} 
            />
            <Route 
              path="/recurring-maintenance" 
              element={<RecurringMaintenancePage />} 
            />
            {/* New Enterprise Features */}
            <Route 
              path="/admin" 
              element={<AdminPanel />} 
            />
            <Route 
              path="/bulk-manager" 
              element={<BulkVehicleManager />} 
            />
            <Route 
              path="/suppliers" 
              element={<SupplierManager />} 
            />
            <Route 
              path="/notifications" 
              element={<NotificationCenter />} 
            />
            <Route 
              path="/profile" 
              element={<UserProfilePage />} 
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
