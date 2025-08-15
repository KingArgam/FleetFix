import React, { useState, useEffect, startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import userDataService from '../../services/UserDataService';

interface SidebarProps {
  
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { state } = useAppContext();
  const { currentUser } = state;
  const location = useLocation();
  const navigate = useNavigate();
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    
    const checkLowStock = async () => {
      if (!currentUser) return;
      
      try {
        const lowStockParts = await userDataService.getLowStockParts(currentUser.id);
        setLowStockCount(lowStockParts.length);
      } catch (error) {
        console.error('Error checking low stock:', error);
      }
    };

    checkLowStock();
    
    const interval = setInterval(checkLowStock, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/trucks', label: 'Fleet Management', icon: 'truck' },
    { path: '/maintenance', label: 'Maintenance', icon: 'wrench' },
    { path: '/parts', label: 'Parts & Inventory', icon: 'cog', badge: lowStockCount > 0 ? lowStockCount : undefined },
    { path: '/suppliers', label: 'Suppliers', icon: 'supplier' },
    { path: '/analytics', label: 'Analytics & Reports', icon: 'chart' },
    { path: '/calendar', label: 'Schedule Calendar', icon: 'calendar' },
  ];

  
  if (currentUser?.role === 'admin') {
    navItems.push(
      { path: '/admin', label: 'Admin Panel', icon: 'admin' },
      { path: '/bulk-manager', label: 'Bulk Operations', icon: 'upload' }
    );
  }

  const renderIcon = (iconName: string) => {
    const iconProps = { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor" };
    
    switch (iconName) {
      case 'dashboard':
        return (
          <svg {...iconProps}>
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
          </svg>
        );
      case 'truck':
        return (
          <svg {...iconProps}>
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        );
      case 'wrench':
        return (
          <svg {...iconProps}>
            <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
          </svg>
        );
      case 'cog':
        return (
          <svg {...iconProps}>
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        );
      case 'chart':
        return (
          <svg {...iconProps}>
            <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
          </svg>
        );
      case 'calendar':
        return (
          <svg {...iconProps}>
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        );
      case 'supplier':
        return (
          <svg {...iconProps}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        );
      case 'dashboard-chart':
        return (
          <svg {...iconProps}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        );
      case 'upload':
        return (
          <svg {...iconProps}>
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
        );
      case 'bell':
        return (
          <svg {...iconProps}>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        );
      case 'user':
        return (
          <svg {...iconProps}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        );
      case 'admin':
        return (
          <svg {...iconProps}>
            <path d="M17,11C17,10.34 16.67,9.74 16.12,9.4L13,7.59V6A1,1 0 0,0 12,5A1,1 0 0,0 11,6V7.59L7.88,9.4C7.33,9.74 7,10.34 7,11V16A1,1 0 0,0 8,17H16A1,1 0 0,0 17,16V11M12,3A3,3 0 0,1 15,6H13.5A1.5,1.5 0 0,0 12,4.5A1.5,1.5 0 0,0 10.5,6H9A3,3 0 0,1 12,3Z"/>
          </svg>
        );
      case 'repeat':
        return (
          <svg {...iconProps}>
            <path d="M17 17H7V14L3 18l4 4v-3h12v-2zM7 7h10v3l4-4-4-4v3H5v2h2z"/>
          </svg>
        );
      case 'warning':
        return (
          <svg {...iconProps}>
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="sidebar sidebar-open">
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/dashboard' && location.pathname === '/');
          
          return (
            <button
              key={item.path}
              onClick={() => startTransition(() => navigate(item.path))}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{renderIcon(item.icon)}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && (
                <span className="nav-badge">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
