import React, { useState, useEffect, useContext } from 'react';
import { PartForm } from '../forms/PartForm';
import { useAppContext } from '../../contexts/AppContext';
import userDataService from '../../services/UserDataService';
import { notificationService } from '../../services/NotificationService';
import '../../styles/enhanced.css';

interface Part {
  id: string;
  name: string;
  partNumber: string;
  category: string;
  cost: number;
  inventoryLevel: number;
  minQuantity: number;
  maxQuantity: number;
  supplier: string;
  location?: string;
  description?: string;
  lastUpdated: Date;
}

const PartsPage: React.FC<any> = ({ parts: propParts, onAddPart }) => {
  const { currentUser } = useAppContext();
  const [showPartForm, setShowPartForm] = useState(false);
  const [parts, setParts] = useState<Part[]>(propParts || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(5);

  useEffect(() => {
    if (currentUser) {
      loadParts();
    }
  }, [currentUser]);

  useEffect(() => {
    // Check for low stock alerts on load and when parts change
    checkLowStockAlerts();
  }, [parts, alertThreshold]);

  const loadParts = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const response = await UserDataService.getParts(currentUser.id);
      if (response.success && response.data) {
        setParts(response.data);
      }
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLowStockAlerts = () => {
    parts.forEach(part => {
      if (part.inventoryLevel <= part.minQuantity) {
        // Only add notification if it doesn't already exist
        const existingNotifications = notificationService.getNotifications();
        const hasExistingAlert = existingNotifications.some(n => 
          n.relatedEntity?.id === part.id && 
          n.type === 'part' && 
          !n.read &&
          n.title.includes('Low Stock')
        );

        if (!hasExistingAlert) {
          notificationService.addNotification({
            type: 'part',
            title: 'Low Stock Alert',
            message: `${part.name} (${part.partNumber}) is running low: ${part.inventoryLevel} remaining (min: ${part.minQuantity})`,
            priority: part.inventoryLevel === 0 ? 'urgent' : 'high',
            actionRequired: true,
            relatedEntity: {
              type: 'part',
              id: part.id,
              name: part.name
            }
          });
        }
      }
    });
  };

  const handleAddPartClick = () => {
    setShowPartForm(true);
  };

  const handlePartSaved = (part: any) => {
    onAddPart?.(part);
    setShowPartForm(false);
    loadParts(); // Reload to get updated data
  };

  const getStockStatus = (part: Part) => {
    const percentage = (part.inventoryLevel / part.maxQuantity) * 100;
    if (part.inventoryLevel === 0) return { status: 'out-of-stock', color: '#ff4444', label: 'Out of Stock' };
    if (part.inventoryLevel <= part.minQuantity) return { status: 'low', color: '#ff8800', label: 'Low Stock' };
    if (percentage <= 25) return { status: 'low', color: '#ffaa00', label: 'Low' };
    if (percentage <= 50) return { status: 'medium', color: '#ffdd00', label: 'Medium' };
    return { status: 'good', color: '#00aa00', label: 'Good' };
  };

  const getLowStockCount = () => {
    return parts.filter(part => part.inventoryLevel <= part.minQuantity).length;
  };

  const getOutOfStockCount = () => {
    return parts.filter(part => part.inventoryLevel === 0).length;
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || part.category === filterCategory;
    
    const matchesStockFilter = !showLowStockOnly || part.inventoryLevel <= part.minQuantity;
    
    return matchesSearch && matchesCategory && matchesStockFilter;
  });

  const categories = Array.from(new Set(parts.map(part => part.category)));
  const lowStockCount = getLowStockCount();
  const outOfStockCount = getOutOfStockCount();

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>📦 Parts Inventory</h1>
          <div className="stock-alerts">
            {outOfStockCount > 0 && (
              <div className="alert-badge critical">
                ⚠️ {outOfStockCount} out of stock
              </div>
            )}
            {lowStockCount > 0 && (
              <div className="alert-badge warning">
                🔻 {lowStockCount} low stock
              </div>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleAddPartClick}>
            <span>➕</span>
            Add Part
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="search-filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search parts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
            />
            <span>Show low stock only</span>
          </label>
        </div>

        <div className="filter-group">
          <label>Alert at:</label>
          <input
            type="number"
            min="1"
            max="100"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
            style={{ width: '80px' }}
          />
          <span>items</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading parts...</p>
        </div>
      ) : (
        <div className="parts-grid">
          {filteredParts.length === 0 ? (
            <div className="empty-state">
              <h3>No parts found</h3>
              <p>
                {searchTerm || filterCategory !== 'all' || showLowStockOnly
                  ? 'No parts match your search criteria.'
                  : 'Get started by adding your first part.'
                }
              </p>
              {(!searchTerm && filterCategory === 'all' && !showLowStockOnly) && (
                <button className="btn-primary" onClick={handleAddPartClick}>
                  Add First Part
                </button>
              )}
            </div>
          ) : (
            filteredParts.map((part) => {
              const stockStatus = getStockStatus(part);
              return (
                <div key={part.id} className={`part-card ${stockStatus.status}`}>
                  {/* Stock Status Badge */}
                  <div className="stock-badge" style={{ backgroundColor: stockStatus.color }}>
                    {stockStatus.label}
                  </div>
                  
                  {/* Low Stock Alert Badge */}
                  {part.inventoryLevel <= part.minQuantity && (
                    <div className="alert-indicator">
                      {part.inventoryLevel === 0 ? '🚨' : '⚠️'}
                    </div>
                  )}

                  <div className="part-header">
                    <h3>{part.name}</h3>
                    <span className="part-number">#{part.partNumber}</span>
                  </div>

                  <div className="part-details">
                    <div className="detail-row">
                      <span>Category:</span>
                      <span className="category-tag">{part.category}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span>Cost:</span>
                      <span className="cost">${part.cost.toFixed(2)}</span>
                    </div>
                    
                    <div className="detail-row stock-row">
                      <span>Stock:</span>
                      <div className="stock-info">
                        <span className={`stock-level ${stockStatus.status}`}>
                          {part.inventoryLevel}
                        </span>
                        <span className="stock-range">
                          / {part.maxQuantity} (min: {part.minQuantity})
                        </span>
                      </div>
                    </div>

                    {/* Stock Level Bar */}
                    <div className="stock-bar">
                      <div 
                        className="stock-fill"
                        style={{ 
                          width: `${Math.min((part.inventoryLevel / part.maxQuantity) * 100, 100)}%`,
                          backgroundColor: stockStatus.color
                        }}
                      />
                    </div>
                    
                    <div className="detail-row">
                      <span>Supplier:</span>
                      <span>{part.supplier || 'N/A'}</span>
                    </div>
                    
                    {part.location && (
                      <div className="detail-row">
                        <span>Location:</span>
                        <span>{part.location}</span>
                      </div>
                    )}

                    {part.description && (
                      <div className="part-description">
                        {part.description}
                      </div>
                    )}
                  </div>

                  <div className="part-actions">
                    <button className="btn-secondary btn-sm">
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-primary btn-sm"
                      disabled={part.inventoryLevel === 0}
                    >
                      📦 Order
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Parts Statistics */}
      <div className="page-stats">
        <div className="stat-item">
          <span className="stat-label">Total Parts:</span>
          <span className="stat-value">{parts.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Categories:</span>
          <span className="stat-value">{categories.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Low Stock:</span>
          <span className={`stat-value ${lowStockCount > 0 ? 'warning' : ''}`}>
            {lowStockCount}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Out of Stock:</span>
          <span className={`stat-value ${outOfStockCount > 0 ? 'critical' : ''}`}>
            {outOfStockCount}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Value:</span>
          <span className="stat-value">
            ${parts.reduce((total, part) => total + (part.cost * part.inventoryLevel), 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Add Part Modal */}
      {showPartForm && (
        <div className="modal-overlay" onClick={() => setShowPartForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Add New Part</h2>
              <button 
                className="modal-close"
                onClick={() => setShowPartForm(false)}
              >
                ❌
              </button>
            </div>
            <PartForm
              onSuccess={handlePartSaved}
              onCancel={() => setShowPartForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PartsPage;
