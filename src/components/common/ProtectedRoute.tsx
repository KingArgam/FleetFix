import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/AuthService';
import { User } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'editor' | 'viewer';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole = 'viewer' 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((currentUser: User | null) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permissions
  const roleHierarchy: { [key: string]: number } = { viewer: 1, editor: 2, admin: 3 };
  const userRoleLevel = roleHierarchy[user.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>Required role: {requiredRole}, Your role: {user.role}</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
