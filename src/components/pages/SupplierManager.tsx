import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import userDataService, { SupplierData, PurchaseOrder } from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';

interface SupplierManagerProps {}

const SupplierManager: React.FC<SupplierManagerProps> = () => {
  const { state } = useAppContext();
  const { currentUser } = state;
  
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'orders' | 'analytics'>('list');
  
  // Supplier form state
  const [supplierForm, setSupplierForm] = useState<Partial<SupplierData>>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    category: 'parts',
    status: 'active',
    paymentTerms: '',
    notes: ''
  });

  // Purchase order form state
  const [poForm, setPOForm] = useState({
    orderNumber: '',
    supplierId: '',
    items: [{ partName: '', quantity: 1, unitPrice: 0, total: 0, category: 'parts' }],
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled',
    expectedDelivery: '',
    totalCost: '0'
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
  loadSuppliers();
  loadPurchaseOrders();
  }, []);

  const loadSuppliers = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userSuppliers = await userDataService.getSuppliers(currentUser.id);
      setSuppliers(userSuppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseOrders = async () => {
    if (!currentUser) return;
    try {
      // Add mock purchase orders to test the display
      const mockPurchaseOrders: PurchaseOrder[] = [
        {
          id: '1',
          userId: currentUser.id,
          supplierId: 'supplier-1',
          orderNumber: 'PO-001',
          status: 'received',
          orderDate: new Date(),
          items: [
            { partId: 'Brake Pads', quantity: 2, unitCost: 45.99, totalCost: 91.98, category: 'parts' },
            { partId: 'Oil Filter', quantity: 1, unitCost: 12.50, totalCost: 12.50, category: 'maintenance' }
          ],
          totalCost: 104.48,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      setPurchaseOrders(mockPurchaseOrders);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const handleSaveSupplier = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      // Ensure required fields are provided
      if (!supplierForm.name) {
        throw new Error('Supplier name is required');
      }

      if (selectedSupplier) {
        // Update existing supplier in backend
        await userDataService.updateSupplier(selectedSupplier.id, {
          ...supplierForm,
          updatedAt: new Date()
        });
        loadSuppliers();
      } else {
        // Add new supplier to backend
        await userDataService.createSupplier(
          currentUser.id,
          {
            ...supplierForm,
            name: supplierForm.name!,
            defaultLeadTimeDays: supplierForm.defaultLeadTimeDays || 7
          }
        );
        loadSuppliers();
      }

      resetSupplierForm();
      setShowSupplierModal(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Failed to save supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      setLoading(true);
      try {
        // Remove supplier from backend
        await userDataService.deleteSupplier(supplierId);
        loadSuppliers();
        // If we're deleting the currently selected supplier, clear selection
        if (selectedSupplier?.id === supplierId) {
          setSelectedSupplier(null);
          resetSupplierForm();
          setShowSupplierModal(false);
        }
        
        console.log('Supplier deleted:', supplierId);
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Failed to delete supplier. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditSupplier = (supplier: SupplierData) => {
    setSelectedSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      website: supplier.website,
      category: supplier.category,
      status: supplier.status,
      paymentTerms: supplier.paymentTerms,
      notes: supplier.notes
    });
    setShowSupplierModal(true);
  };

  const resetSupplierForm = () => {
    setSelectedSupplier(null);
    setSupplierForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      category: 'parts',
      status: 'active',
      paymentTerms: '',
      notes: ''
    });
  };

  const handleCreatePO = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const totalCost = poForm.items.reduce((sum, item) => sum + item.total, 0);
      
      // Convert form items to PurchaseOrderItem format
      const orderItems = poForm.items.map(item => ({
        partId: item.partName, // Using partName as partId for now
        quantity: item.quantity,
        unitCost: item.unitPrice,
        totalCost: item.total,
        category: item.category // Add category to each item
      }));

      if (editingPurchaseOrder) {
        // Update existing purchase order
        const updatedPO: PurchaseOrder = {
          ...editingPurchaseOrder,
          supplierId: poForm.supplierId,
          items: orderItems,
          totalCost,
          notes: poForm.notes,
          updatedAt: new Date()
        };

        setPurchaseOrders(prev => prev.map(po => 
          po.id === editingPurchaseOrder.id ? updatedPO : po
        ));
        
        setEditingPurchaseOrder(null);
      } else {
        // Create new purchase order
        const purchaseOrder: Partial<PurchaseOrder> = {
          id: Date.now().toString(),
          userId: currentUser.id,
          supplierId: poForm.supplierId,
          orderNumber: poForm.orderNumber || `PO-${Date.now()}`, // Use user-provided or auto-generate
          items: orderItems,
          totalCost,
          status: 'draft',
          orderDate: new Date(),
          createdAt: new Date(),
          notes: poForm.notes
        } as PurchaseOrder;

        console.log('Creating purchase order:', purchaseOrder);
        console.log('Order items with part names:', orderItems);

        // Add purchase order to local state
        setPurchaseOrders(prev => [purchaseOrder as PurchaseOrder, ...prev]);
      }
      
      // Reset form
      setPOForm({
        orderNumber: '',
        supplierId: '',
        items: [{ partName: '', quantity: 1, unitPrice: 0, total: 0, category: 'parts' }],
        notes: '',
        status: 'draft' as 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled',
        expectedDelivery: '',
        totalCost: '0'
      });
      setShowPOModal(false);
    } catch (error) {
      console.error('Error creating purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPOItem = () => {
    setPOForm(prev => ({
      ...prev,
      items: [...prev.items, { partName: '', quantity: 1, unitPrice: 0, total: 0, category: 'parts' }]
    }));
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    setPOForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Calculate total for this item
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const removePOItem = (index: number) => {
    setPOForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleEditPurchaseOrder = (purchaseOrder: PurchaseOrder) => {
    setEditingPurchaseOrder(purchaseOrder);
    setPOForm({
      orderNumber: purchaseOrder.orderNumber,
      supplierId: purchaseOrder.supplierId,
      items: purchaseOrder.items.map(item => ({
        partName: item.partId, // Using partId as partName for form compatibility
        quantity: item.quantity,
        unitPrice: item.unitCost,
        total: item.totalCost,
        category: (item as any).category || 'parts' // Include category with fallback
      })),
      notes: purchaseOrder.notes || '',
      status: purchaseOrder.status,
      expectedDelivery: purchaseOrder.expectedDeliveryDate?.toISOString().split('T')[0] || '',
      totalCost: purchaseOrder.totalCost?.toString() || '0'
    });
    setShowPOModal(true);
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setPurchaseOrders(prev => prev.map(po => 
      po.id === orderId 
        ? { ...po, status: newStatus as 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' }
        : po
    ));
  };

  const handleDeletePurchaseOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      setPurchaseOrders(prev => prev.filter(po => po.id !== orderId));
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.category && supplier.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getSupplierStats = () => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const totalOrders = purchaseOrders.length;
    const pendingOrders = purchaseOrders.filter(po => po.status === 'sent' || po.status === 'confirmed').length;
    
    return { totalSuppliers, activeSuppliers, totalOrders, pendingOrders };
  };

  const stats = getSupplierStats();

  return (
    <div className="supplier-manager">
      <div className="page-header">
        <h1>Supplier Management</h1>
        <p>Manage suppliers, purchase orders, and vendor relationships</p>
      </div>

      <div className="supplier-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Package className="icon" />
          </div>
          <div className="stat-content">
            <h3>{stats.totalSuppliers}</h3>
            <p>Total Suppliers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp className="icon success" />
          </div>
          <div className="stat-content">
            <h3>{stats.activeSuppliers}</h3>
            <p>Active Suppliers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Package className="icon" />
          </div>
          <div className="stat-content">
            <h3>{stats.totalOrders}</h3>
            <p>Purchase Orders</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <AlertTriangle className="icon warning" />
          </div>
          <div className="stat-content">
            <h3>{stats.pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>
        </div>
      </div>

      <div className="supplier-tabs">
        <button 
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <Package size={20} />
          Suppliers
        </button>
        <button 
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={20} />
          Purchase Orders
        </button>
        <button 
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp size={20} />
          Analytics
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'list' && (
          <div className="suppliers-tab">
            <div className="suppliers-header">
              <div className="search-box">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  resetSupplierForm();
                  setShowSupplierModal(true);
                }}
              >
                <Plus size={20} />
                Add Supplier
              </button>
            </div>

            <div className="suppliers-grid">
              {filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="supplier-card">
                  <div className="supplier-header">
                    <h3>{supplier.name}</h3>
                    <span className={`status-badge ${supplier.status}`}>
                      {supplier.status}
                    </span>
                  </div>
                  <div className="supplier-info">
                    <div className="info-item">
                      <Mail size={16} />
                      <span>{supplier.email}</span>
                    </div>
                    <div className="info-item">
                      <Phone size={16} />
                      <span>{supplier.phone}</span>
                    </div>
                    <div className="info-item">
                      <MapPin size={16} />
                      <span>{supplier.address}</span>
                    </div>
                  </div>
                  <div className="supplier-details">
                    <p><strong>Contact:</strong> {supplier.contactPerson}</p>
                    <p><strong>Category:</strong> {supplier.category}</p>
                    <p><strong>Payment Terms:</strong> {supplier.paymentTerms}</p>
                  </div>
                  <div className="supplier-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEditSupplier(supplier)}
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteSupplier(supplier.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-tab">
            <div className="orders-header">
              <h3>Purchase Orders</h3>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setEditingPurchaseOrder(null);
                  setShowPOModal(true);
                }}
              >
                <Plus size={20} />
                Create Purchase Order
              </button>
            </div>

            <div className="orders-list">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Supplier</th>
                    <th className="parts-header" style={{paddingLeft: '80px'}}>Parts</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map(order => {
                    const supplier = suppliers.find(s => s.id === order.supplierId);
                    return (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{supplier?.name || 'Unknown'}</td>
                        <td>
                          <div className="parts-list">
                            {order.items.map((item, index) => (
                              <span key={index} className="part-item">
                                {item.partId} (x{item.quantity})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td>${order.totalCost.toFixed(2)}</td>
                        <td>
                          <select 
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`status-select ${order.status}`}
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="received">Received</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEditPurchaseOrder(order)}
                              title="Edit purchase order"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeletePurchaseOrder(order.id)}
                              title="Delete purchase order"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h3>Supplier Analytics</h3>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Top Suppliers by Orders</h4>
                <div className="supplier-ranking">
                  {suppliers
                    .map(supplier => {
                      const completedOrders = purchaseOrders.filter(po => po.supplierId === supplier.id && po.status === 'received');
                      const orderCount = completedOrders.length;
                      const totalSpent = completedOrders.reduce((sum, po) => sum + po.totalCost, 0);
                      return { ...supplier, orderCount, totalSpent };
                    })
                    .filter(supplier => supplier.orderCount > 0) // Only show suppliers with completed orders
                    .sort((a, b) => {
                      // First sort by order count (higher count first)
                      if (b.orderCount !== a.orderCount) {
                        return b.orderCount - a.orderCount;
                      }
                      // If order count is the same, sort by total spent (higher spending first)
                      return b.totalSpent - a.totalSpent;
                    })
                    .slice(0, 5)
                    .map((supplier, index) => (
                      <div key={supplier.id} className="ranking-item">
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{supplier.name}</span>
                        <span className="count">{supplier.orderCount} completed (${supplier.totalSpent.toFixed(2)})</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="analytics-card">
                <h4>Order Categories</h4>
                <div className="category-breakdown">
                  {['parts', 'fuel', 'maintenance', 'tools', 'repairs', 'tires', 'insurance', 'other'].map(category => {
                    // Calculate from item-level categories (not cancelled orders)
                    const activeOrders = purchaseOrders.filter(po => po.status !== 'cancelled');
                    
                    // Aggregate all items with this category across all active orders
                    const categoryItems = activeOrders.flatMap(po => 
                      po.items.filter(item => (item as any).category === category)
                    );
                    
                    const itemCount = categoryItems.length;
                    const totalValue = categoryItems.reduce((sum, item) => sum + item.totalCost, 0);
                    
                    // Calculate percentage based on total items
                    const totalItems = activeOrders.flatMap(po => po.items).length;
                    const percentage = totalItems > 0 ? (itemCount / totalItems * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={category} className="category-item">
                        <span className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        <div className="category-bar">
                          <div 
                            className="category-fill" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="category-percentage">{itemCount} orders (${totalValue.toFixed(2)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="analytics-card">
                <h4>Purchase Order Stats</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Committed Orders</span>
                    <span className="stat-value" style={{fontSize: purchaseOrders.filter(po => po.status === 'sent' || po.status === 'received').length.toString().length > 3 ? '0.7rem' : '0.9rem'}}>
                      {purchaseOrders.filter(po => po.status === 'sent' || po.status === 'received').length}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Completed Spending</span>
                    <span className="stat-value" style={{fontSize: (() => {
                      const value = purchaseOrders.filter(po => po.status === 'received').reduce((sum, po) => sum + po.totalCost, 0).toFixed(2);
                      const length = value.length;
                      if (length > 10) return '0.6rem';
                      if (length > 8) return '0.7rem';
                      if (length > 6) return '0.8rem';
                      return '0.9rem';
                    })()}}>
                      ${purchaseOrders
                        .filter(po => po.status === 'received')
                        .reduce((sum, po) => sum + po.totalCost, 0)
                        .toFixed(2)
                      }
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg Order Value</span>
                    <span className="stat-value" style={{fontSize: (() => {
                      const receivedOrders = purchaseOrders.filter(po => po.status === 'received');
                      const value = receivedOrders.length > 0 
                        ? (receivedOrders.reduce((sum, po) => sum + po.totalCost, 0) / receivedOrders.length).toFixed(2)
                        : '0.00';
                      const length = value.length;
                      if (length > 8) return '0.7rem';
                      if (length > 6) return '0.8rem';
                      return '0.9rem';
                    })()}}>
                      ${(() => {
                        const receivedOrders = purchaseOrders.filter(po => po.status === 'received');
                        return receivedOrders.length > 0 
                          ? (receivedOrders.reduce((sum, po) => sum + po.totalCost, 0) / receivedOrders.length).toFixed(2)
                          : '0.00';
                      })()}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Active Suppliers</span>
                    <span className="stat-value" style={{fontSize: suppliers.filter(s => s.status === 'active').length.toString().length > 2 ? '0.8rem' : '0.9rem'}}>
                      {suppliers.filter(s => s.status === 'active').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <h4>Order Status Distribution</h4>
                <div className="status-breakdown">
                  {['draft', 'sent', 'received', 'cancelled'].map(status => {
                    const count = purchaseOrders.filter(po => po.status === status).length;
                    const percentage = purchaseOrders.length > 0 ? (count / purchaseOrders.length * 100).toFixed(1) : 0;
                    return (
                      <div key={status} className="status-item">
                        <span className="status-name">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        <div className="status-bar">
                          <div 
                            className={`status-fill ${status}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="status-count">{count} ({percentage}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowSupplierModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Enter contact person name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={supplierForm.website}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, category: e.target.value as any }))}
                  >
                    <option value="parts">Parts</option>
                    <option value="fuel">Fuel</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={supplierForm.status}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, status: e.target.value as any }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Terms</label>
                  <input
                    type="text"
                    value={supplierForm.paymentTerms}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="e.g., Net 30"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this supplier"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSupplierModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveSupplier}
                disabled={loading || !supplierForm.name}
              >
                {loading ? 'Saving...' : selectedSupplier ? 'Update Supplier' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Modal */}
      {showPOModal && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>{editingPurchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowPOModal(false);
                  setEditingPurchaseOrder(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Order Number</label>
                <input
                  type="text"
                  value={poForm.orderNumber}
                  onChange={(e) => setPOForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                  placeholder="Enter custom order number (optional)"
                />
              </div>
              
              <div className="form-group">
                <label>Supplier *</label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPOForm(prev => ({ ...prev, supplierId: e.target.value }))}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.filter(s => s.status === 'active').map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="po-items-section">
                <h4>Order Items</h4>
                {poForm.items.map((item, index) => (
                  <div key={index} className="po-item-row">
                    <div className="form-group">
                      <label>Part Name</label>
                      <input
                        type="text"
                        value={item.partName}
                        onChange={(e) => updatePOItem(index, 'partName', e.target.value)}
                        placeholder="Enter part name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updatePOItem(index, 'quantity', parseInt(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit Price</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updatePOItem(index, 'unitPrice', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Total</label>
                      <input
                        type="number"
                        value={item.total}
                        readOnly
                        className="readonly"
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => updatePOItem(index, 'category', e.target.value)}
                      >
                        <option value="parts">Parts</option>
                        <option value="tools">Tools</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="fuel">Fuel</option>
                        <option value="insurance">Insurance</option>
                        <option value="repairs">Repairs</option>
                        <option value="tires">Tires</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger remove-item-btn"
                      onClick={() => removePOItem(index)}
                      disabled={poForm.items.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addPOItem}
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={poForm.notes}
                  onChange={(e) => setPOForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for this purchase order"
                  rows={3}
                />
              </div>

              <div className="po-total">
                <h4>Total Amount: ${poForm.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</h4>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPOModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreatePO}
                disabled={loading || !poForm.supplierId || poForm.items.some(item => !item.partName)}
              >
                {loading 
                  ? (editingPurchaseOrder ? 'Updating...' : 'Creating...') 
                  : (editingPurchaseOrder ? 'Update Purchase Order' : 'Create Purchase Order')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
