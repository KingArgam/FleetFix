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
    supplierId: '',
    items: [{ partName: '', quantity: 1, unitPrice: 0, total: 0 }],
    notes: ''
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
      const suppliersData = await userDataService.getSuppliers(currentUser.id);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseOrders = async () => {
    if (!currentUser) return;
    try {
      const ordersData = await userDataService.getPurchaseOrders(currentUser.id);
      setPurchaseOrders(ordersData);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    }
  };

  const handleSaveSupplier = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (selectedSupplier) {
        await userDataService.updateSupplier(selectedSupplier.id, supplierForm);
      } else {
        // Ensure required fields are provided
        if (!supplierForm.name) {
          throw new Error('Supplier name is required');
        }
        await userDataService.createSupplier(currentUser.id, {
          ...supplierForm,
          name: supplierForm.name,
          defaultLeadTimeDays: supplierForm.defaultLeadTimeDays || 7
        });
      }
      
      await loadSuppliers();
      resetSupplierForm();
      setShowSupplierModal(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      setLoading(true);
      try {
        await userDataService.deleteSupplier(supplierId);
        await loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
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
        totalCost: item.total
      }));
      
      const purchaseOrder: Partial<PurchaseOrder> = {
        userId: currentUser.id,
        supplierId: poForm.supplierId,
        orderNumber: `PO-${Date.now()}`,
        items: orderItems,
        totalCost,
        status: 'draft',
        orderDate: new Date(),
        notes: poForm.notes
      };

      await userDataService.addPurchaseOrder(purchaseOrder as PurchaseOrder);
      await loadPurchaseOrders();
      
      // Reset form
      setPOForm({
        supplierId: '',
        items: [{ partName: '', quantity: 1, unitPrice: 0, total: 0 }],
        notes: ''
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
      items: [...prev.items, { partName: '', quantity: 1, unitPrice: 0, total: 0 }]
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
                onClick={() => setShowPOModal(true)}
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
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td>${order.totalCost.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-secondary">
                              <Edit2 size={16} />
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
                  {suppliers.slice(0, 5).map((supplier, index) => {
                    const orderCount = purchaseOrders.filter(po => po.supplierId === supplier.id).length;
                    return (
                      <div key={supplier.id} className="ranking-item">
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{supplier.name}</span>
                        <span className="count">{orderCount} orders</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="analytics-card">
                <h4>Supplier Categories</h4>
                <div className="category-breakdown">
                  {['parts', 'fuel', 'maintenance', 'other'].map(category => {
                    const count = suppliers.filter(s => s.category === category).length;
                    const percentage = suppliers.length > 0 ? (count / suppliers.length * 100).toFixed(1) : 0;
                    return (
                      <div key={category} className="category-item">
                        <span className="category-name">{category}</span>
                        <div className="category-bar">
                          <div 
                            className="category-fill" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="category-percentage">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="analytics-card">
                <h4>Monthly Spending</h4>
                <p>Total spending this month: ${purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0).toFixed(2)}</p>
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
              <h3>Create Purchase Order</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPOModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
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
                {loading ? 'Creating...' : 'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
