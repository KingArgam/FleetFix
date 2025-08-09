import React, { useState, useEffect, useContext } from 'react';
import { PartForm } from '../forms/PartForm';
import { useAppContext } from '../../contexts/AppContext';
import userDataService, { PartData } from '../../services/UserDataService';
import { notificationService } from '../../services/NotificationService';
import '../../styles/enhanced.css';

const PartsPage: React.FC<any> = ({ parts: propParts, onAddPart }) => {
  const { state, addPart, updatePart, deletePart } = useAppContext();
  const { currentUser, parts: stateParts } = state;
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(5);

  // Convert parts to PartData format for display - avoid duplicates by preferring stateParts
  const sourceParts = stateParts && stateParts.length > 0 ? stateParts : (propParts || []);
  
  // Debug logging
  console.log('Source data - stateParts length:', stateParts?.length || 0, 'propParts length:', propParts?.length || 0);
  console.log('Using stateParts:', stateParts && stateParts.length > 0);
  
  // Remove duplicates based on ID
  const uniqueParts = sourceParts.filter((part: any, index: number, array: any[]) => 
    array.findIndex((p: any) => p.id === part.id) === index
  );
  
  console.log('Original parts count:', sourceParts.length, 'Unique parts count:', uniqueParts.length);
  
  const parts: PartData[] = uniqueParts.map((part: any) => {
    const converted = {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      category: part.category || 'General',
      cost: part.cost || 0,
      quantity: part.inventoryLevel || part.quantity || 0,
      minQuantity: part.minStockLevel || part.minQuantity || 5,
      supplier: part.supplier || '',
      location: part.location || '',
      description: part.description || '',
      userId: currentUser?.id || '',
      createdAt: part.createdAt || new Date(),
      updatedAt: part.updatedAt || new Date(),
    };
    
    return converted;
  });

  // Regenerate categories whenever parts change
  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(parts.map(part => part.category).filter(Boolean)));
    console.log('Categories updated:', cats, 'from', parts.length, 'parts');
    return cats;
  }, [parts]);

  useEffect(() => {
    // Check for low stock alerts on load and when parts change
    checkLowStockAlerts(parts);
  }, [stateParts, alertThreshold]);

  // Reset filter if selected category no longer exists
  useEffect(() => {
    if (filterCategory !== 'all' && !categories.includes(filterCategory)) {
      console.log(`Resetting filter category "${filterCategory}" to "all" because it's not in categories:`, categories);
      setFilterCategory('all');
    }
  }, [categories, filterCategory]);

  // Debug log when filter category changes
  useEffect(() => {
    console.log('Filter category changed to:', filterCategory);
  }, [filterCategory]);

  const checkLowStockAlerts = (partsData: PartData[]) => {
    partsData.forEach(part => {
      if (part.quantity <= part.minQuantity) {
        notificationService.addNotification({
          type: 'part',
          title: 'Low Stock Alert',
          message: `${part.name} (${part.partNumber}) is running low: ${part.quantity} remaining (min: ${part.minQuantity})`,
          priority: part.quantity === 0 ? 'urgent' : 'high',
          actionRequired: true,
          relatedEntity: {
            type: 'part',
            id: part.id,
            name: part.name
          }
        });
      }
    });
  };

  const handleAddPartClick = () => {
    setEditingPart(null); // Ensure we're in add mode
    setShowPartForm(true);
  };

  const handlePartSaved = async (part: any) => {
    console.log('New part saved:', part);
    console.log('Current parts before adding:', parts.length);
    console.log('Current categories before adding:', categories);
    
    if (editingPart) {
      // Update existing part
      await updatePart(editingPart.id, part);
      setEditingPart(null);
    } else {
      // Add new part
      await addPart(part);
    }
    
    setShowPartForm(false);
    console.log('Part added/updated in context');
  };

  const handleEditPart = (part: PartData) => {
    // Convert PartData back to Part format for editing
    const partForEdit = {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber,
      category: part.category,
      cost: part.cost,
      supplier: part.supplier,
      inventoryLevel: part.quantity,
      minStockLevel: part.minQuantity,
      location: part.location,
      description: part.description,
      createdAt: part.createdAt,
      createdBy: part.userId
    };
    
    setEditingPart(partForEdit);
    setShowPartForm(true);
  };

  const handleDeletePart = async (partId: string) => {
    if (window.confirm('Are you sure you want to delete this part? This action cannot be undone.')) {
      try {
        await deletePart(partId);
        console.log('Part deleted:', partId);
      } catch (error) {
        console.error('Error deleting part:', error);
        alert('Failed to delete part. Please try again.');
      }
    }
  };

  const handleOrderPart = (part: PartData) => {
    // Show detailed order information
    const orderDetails = `
ORDER DETAILS:
${'-'.repeat(30)}
Part: ${part.name}
Part Number: ${part.partNumber}
Category: ${part.category}
Current Stock: ${part.quantity}
Minimum Stock: ${part.minQuantity}
Suggested Order: ${Math.max(part.minQuantity * 2 - part.quantity, 1)} units
Cost per Unit: $${part.cost.toFixed(2)}
Supplier: ${part.supplier || 'N/A'}
${'-'.repeat(30)}

This would normally integrate with your supplier ordering system to place an actual order.
    `;
    
    alert(orderDetails);
    
    // In a real application, you might:
    // - Open an order form modal
    // - Send order to supplier API
    // - Create purchase order record
    // - Update expected delivery dates
    // - Send notifications to relevant personnel
    // - Update inventory forecasts
  };

  const getPartStatus = (part: PartData) => {
    if (part.quantity === 0) return { status: 'out-of-stock', color: '#ff4444', label: 'Out of Stock' };
    if (part.quantity <= part.minQuantity) return { status: 'low', color: '#ff8800', label: 'Low Stock' };
    return { status: 'normal', color: '#22c55e', label: 'In Stock' };
  };

  const getLowStockCount = () => {
    return parts.filter(part => part.quantity <= part.minQuantity).length;
  };

  const getOutOfStockCount = () => {
    return parts.filter(part => part.quantity === 0).length;
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || part.category === filterCategory;
    
    const matchesStockFilter = !showLowStockOnly || part.quantity <= part.minQuantity;
    
    const matches = matchesSearch && matchesCategory && matchesStockFilter;
    
    // Debug logging when filtering by category
    if (filterCategory !== 'all') {
      console.log(`Part "${part.name}" category: "${part.category}", filter: "${filterCategory}", matches: ${matchesCategory}`);
    }
    
    return matches;
  });

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

      {/* Low Stock Alert Banner */}
      {getLowStockCount() > 0 && (
        <div className="low-stock-banner">
          <div className="banner-content">
            <span className="alert-icon">⚠️</span>
            <div className="banner-text">
              <strong>Low Stock Alert:</strong> {getLowStockCount()} {getLowStockCount() === 1 ? 'part is' : 'parts are'} running low on stock.
            </div>
            <button 
              className="btn-secondary btn-sm"
              onClick={() => setShowLowStockOnly(true)}
            >
              View Low Stock Items
            </button>
          </div>
        </div>
      )}

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
            key={categories.join(',')} // Force re-render when categories change
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
              const stockStatus = getPartStatus(part);
              return (
                <div key={part.id} className={`part-card ${stockStatus.status}`}>
                  {/* Stock Status Badge */}
                  <div className="stock-badge" style={{ backgroundColor: stockStatus.color }}>
                    {stockStatus.label}
                  </div>
                  
                  {/* Low Stock Alert Badge */}
                  {part.quantity <= part.minQuantity && (
                    <span className="alert-icon">
                      {part.quantity === 0 ? '🚨' : '⚠️'}
                    </span>
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
                          {part.quantity}
                        </span>
                        <span className="stock-range">
                          (min: {part.minQuantity})
                        </span>
                      </div>
                    </div>

                    {/* Stock Level Bar */}
                    <div className="stock-bar">
                      <div 
                        className="stock-fill"
                        style={{ 
                          width: `${Math.min((part.quantity / (part.minQuantity * 2)) * 100, 100)}%`,
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
                    <button 
                      className="btn-secondary btn-sm"
                      onClick={() => handleEditPart(part)}
                      title="Edit part details"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-primary btn-sm"
                      onClick={() => handleOrderPart(part)}
                      disabled={part.quantity === 0}
                      title={part.quantity === 0 ? "Cannot order - out of stock" : "Place order for this part"}
                    >
                      📦 Order
                    </button>
                    <button 
                      className="btn-danger btn-sm"
                      onClick={() => handleDeletePart(part.id)}
                      title="Delete this part"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

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
            ${parts.reduce((total, part) => total + (part.cost * part.quantity), 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Add/Edit Part Modal */}
      {showPartForm && (
        <div className="modal-overlay" onClick={() => {
          setShowPartForm(false);
          setEditingPart(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPart ? '✏️ Edit Part' : '➕ Add New Part'}</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowPartForm(false);
                  setEditingPart(null);
                }}
              >
                ❌
              </button>
            </div>
            <PartForm
              part={editingPart}
              onSuccess={handlePartSaved}
              onCancel={() => {
                setShowPartForm(false);
                setEditingPart(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PartsPage;
