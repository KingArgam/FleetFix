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
    
    if (process.env.NODE_ENV === 'development') {
      
      const mockUser: User = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        companyId: 'test-company-123',
        isActive: true,
        createdAt: new Date(),
        preferences: {
          theme: 'light',
          notifications: { inApp: true },
          language: 'en',
          timezone: 'UTC'
        }
      };
      
      
      authService.setMockUser(mockUser);
      setUser(mockUser);
      setIsLoading(false);
      
      
      const sampleTrucks = [
        {
          id: 'truck-1',
          vin: '1HGBH41JXMN109186',
          licensePlate: 'ABC-123',
          make: 'Ford',
          model: 'F-150',
          year: 2020,
          mileage: 45000,
          nickname: 'Truck Alpha',
          status: 'In Service' as const,
          createdAt: new Date('2023-01-15'),
          updatedAt: new Date('2024-01-01'),
          createdBy: 'test-user-123',
          updatedBy: 'test-user-123'
        },
        {
          id: 'truck-2',
          vin: '1HGBH41JXMN109187',
          licensePlate: 'DEF-456',
          make: 'Chevrolet',
          model: 'Silverado',
          year: 2019,
          mileage: 62000,
          nickname: 'Truck Beta',
          status: 'In Service' as const,
          createdAt: new Date('2023-02-20'),
          updatedAt: new Date('2024-01-01'),
          createdBy: 'test-user-123',
          updatedBy: 'test-user-123'
        }
      ];

      const sampleMaintenance = [
        {
          id: 'maint-1',
          truckId: 'truck-1',
          type: 'Oil Change' as const,
          date: new Date('2024-11-15'),
          mileage: 44500,
          cost: 150,
          notes: 'Regular oil change service',
          performedBy: 'Joe Mechanic',
          createdAt: new Date('2024-11-15'),
          createdBy: 'test-user-123'
        },
        {
          id: 'maint-2',
          truckId: 'truck-2',
          type: 'Brake Inspection' as const,
          date: new Date('2024-11-20'),
          mileage: 61800,
          cost: 250,
          notes: 'Brake pads replaced',
          performedBy: 'Jane Mechanic',
          createdAt: new Date('2024-11-20'),
          createdBy: 'test-user-123'
        },
        {
          id: 'maint-3',
          truckId: 'truck-1',
          type: 'Engine Service' as const,
          date: new Date('2024-10-10'),
          mileage: 43000,
          cost: 500,
          notes: 'Engine tune-up',
          performedBy: 'Mike Mechanic',
          createdAt: new Date('2024-10-10'),
          createdBy: 'test-user-123'
        },
        {
          id: 'maint-4',
          truckId: 'truck-2',
          type: 'Tire Replacement' as const,
          date: new Date('2024-12-01'),
          mileage: 62000,
          cost: 800,
          notes: 'New tires installed',
          performedBy: 'Sarah Mechanic',
          createdAt: new Date('2024-12-01'),
          createdBy: 'test-user-123'
        },
        {
          id: 'maint-5',
          truckId: 'truck-1',
          type: 'DOT Inspection' as const,
          date: new Date('2024-09-15'),
          mileage: 42000,
          cost: 75,
          notes: 'Annual DOT inspection',
          performedBy: 'Bob Inspector',
          createdAt: new Date('2024-09-15'),
          createdBy: 'test-user-123'
        }
      ];

      
      localStorage.setItem('sampleTrucks', JSON.stringify(sampleTrucks));
      localStorage.setItem('sampleMaintenance', JSON.stringify(sampleMaintenance));
      
      return;
    }

    const unsubscribe = authService.onAuthStateChange((currentUser: User | null) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  
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

  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  
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
