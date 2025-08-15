import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/pages/Dashboard';
import EnhancedTrucksPage from './components/pages/EnhancedTrucksPage';
import MaintenancePage from './components/pages/MaintenancePage';
import PartsPage from './components/pages/PartsPage';
import AnalyticsDashboard from './components/pages/AnalyticsDashboard';
import CalendarPage from './components/pages/CalendarPage';
import LoginPage from './components/pages/LoginPage';
import SignupPage from './components/pages/SignupPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import './App.css';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          
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
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
