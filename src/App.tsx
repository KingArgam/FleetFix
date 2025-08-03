import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/pages/Dashboard';
import EnhancedTrucksPage from './components/pages/EnhancedTrucksPage';
import MaintenancePage from './components/pages/MaintenancePage';
import PartsPage from './components/pages/PartsPage';
import CalendarPage from './components/pages/CalendarPage';
import LoginPage from './components/pages/LoginPage';
import SignupPage from './components/pages/SignupPage';
import ProtectedRoute from './components/common/ProtectedRoute';
// New enterprise features
import AdminPanel from './components/pages/AdminPanel';
import BulkVehicleManager from './components/pages/BulkVehicleManager';
import SupplierManager from './components/pages/SupplierManager';
import AnalyticsDashboard from './components/pages/AnalyticsDashboard';
import NotificationCenter from './components/pages/NotificationCenter';
import UserProfilePage from './components/pages/UserProfilePage';
import './App.css';
import './styles/enhanced-features.css';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
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
              path="/analytics" 
              element={<AnalyticsDashboard />} 
            />
            <Route 
              path="/calendar" 
              element={<CalendarPage />} 
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
