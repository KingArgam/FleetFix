import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import userDataService, { SupplierData, PurchaseOrder } from '../../services/UserDataService';
import { useAppContext } from '../../contexts/AppContext';
import { SupplierForm } from '../forms/SupplierForm';

interface SupplierManagerProps {}

const SupplierManager: React.FC<SupplierManagerProps> = () => {
  const { state } = useAppContext();
  const { currentUser } = state;
  
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | undefined>();
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'orders' | 'analytics'>('list');
  
  
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [purchaseOrdersLoaded, setPurchaseOrdersLoaded] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isLoadingPurchaseOrders, setIsLoadingPurchaseOrders] = useState(true);
  
  
  useEffect(() => {
    if (currentUser) {
      console.log('Loading cached data for user:', currentUser.id);
      
      
      const cachedSuppliers = userDataService.getCachedSuppliers(currentUser.id);
      const cachedPurchaseOrders = userDataService.getCachedPurchaseOrders(currentUser.id);
      
      console.log('Cached suppliers found:', cachedSuppliers.length);
      console.log('Cached purchase orders found:', cachedPurchaseOrders.length);
      
      
      setSuppliers(cachedSuppliers);
      setPurchaseOrders(cachedPurchaseOrders);
      

      if (cachedSuppliers.length > 0) {
        setSuppliersLoaded(true);
        setIsLoadingSuppliers(false);
        console.log(`Loaded ${cachedSuppliers.length} cached suppliers instantly`);
      } else {
        
        const hasStoredSuppliers = localStorage.getItem(`user_data_${currentUser.id}`) !== null;
        if (hasStoredSuppliers) {
          setSuppliersLoaded(true);
          setIsLoadingSuppliers(false);
          console.log('No cached suppliers but storage exists - marking as loaded');
        }
      }
      
      if (cachedPurchaseOrders.length > 0) {
        setPurchaseOrdersLoaded(true);
        setIsLoadingPurchaseOrders(false);
        console.log(`Loaded ${cachedPurchaseOrders.length} cached purchase orders instantly`);
      } else {
        
        const hasStoredPurchaseOrders = localStorage.getItem(`user_data_${currentUser.id}`) !== null;
        if (hasStoredPurchaseOrders) {
          setPurchaseOrdersLoaded(true);
          setIsLoadingPurchaseOrders(false);
          console.log('No cached purchase orders but storage exists - marking as loaded');
        }
      }
      
       Force immediate render with cached data
      console.log('Suppliers state after cache load:', cachedSuppliers.map(s => ({ id: s.id, name: s.name })));
      console.log('Purchase orders state after cache load:', cachedPurchaseOrders.map(po => ({ id: po.id, supplierId: po.supplierId })));
    }
  }, [currentUser]);
  
  
  
  const [poForm, setPOForm] = useState({
    orderNumber: '',
    supplierId: '',
    items: [{ partName: '', quantity: '', unitPrice: '', total: 0, category: 'parts' }],
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled',
    expectedDelivery: '',
    totalCost: '0'
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
   
    if (currentUser) {
      
      const hasCachedSuppliers = suppliers.length > 0 && suppliersLoaded;
      const hasCachedPurchaseOrders = purchaseOrders.length > 0 && purchaseOrdersLoaded;
      
      if (!hasCachedSuppliers || !hasCachedPurchaseOrders) {
        loadSuppliersSequentially();
      } else {
        console.log('Using cached data, skipping network load');
        
        userDataService.syncSuppliersAndPurchaseOrdersCache(currentUser.id, suppliers, purchaseOrders);
      }
    } else {
      
      setIsLoadingSuppliers(false);
      setIsLoadingPurchaseOrders(false);
      setSuppliersLoaded(false);
      setPurchaseOrdersLoaded(false);
    }
  
  }, [currentUser]);

  const loadSuppliersSequentially = async () => {
    if (!currentUser) {
      console.log('No current user, skipping data load');
      setIsLoadingSuppliers(false);
      setIsLoadingPurchaseOrders(false);
      return;
    }
    
    console.log('Starting sequential data load for user:', currentUser.id);
    
    
    await loadSuppliers();
    
    
    await loadPurchaseOrders();
  };

  const loadSuppliers = async () => {
    if (!currentUser) {
      console.log('No current user, skipping supplier load');
      return;
    }
    
    
    if (suppliersLoaded && suppliers.length > 0) {
      console.log('Suppliers already loaded from cache, skipping network fetch');
      return;
    }
    
    setIsLoadingSuppliers(true);
    console.log('Loading suppliers for user:', currentUser.id);
    try {
      const userSuppliers = await userDataService.getSuppliers(currentUser.id);
      console.log('Suppliers loaded successfully:', userSuppliers.length, 'suppliers');
      setSuppliers(userSuppliers || []);
      setSuppliersLoaded(true);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      
      setSuppliers([]);
      setSuppliersLoaded(true);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const loadPurchaseOrders = async () => {
    if (!currentUser) {
      console.log('No current user, skipping purchase orders load');
      return;
    }
    
    
    if (purchaseOrdersLoaded && purchaseOrders.length > 0) {
      console.log('Purchase orders already loaded from cache, skipping network fetch');
      return;
    }
    
    setIsLoadingPurchaseOrders(true);
    console.log('Loading purchase orders for user:', currentUser.id);
    try {
      const userOrders = await userDataService.getPurchaseOrders(currentUser.id);
      console.log('Purchase orders loaded successfully:', userOrders.length, 'orders');
      setPurchaseOrders(userOrders || []);
      setPurchaseOrdersLoaded(true);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setPurchaseOrders([]);
      setPurchaseOrdersLoaded(true);
    } finally {
      setIsLoadingPurchaseOrders(false);
    }
  };

  const handleSupplierSaved = async (supplier: SupplierData) => {
    
    
    const isEdit = supplier.id && suppliers.some(s => s.id === supplier.id);
    
    
    setShowSupplierModal(false);
    setEditingSupplier(undefined);
    
    
    let updatedSuppliers: SupplierData[];
    if (isEdit) {
      
      updatedSuppliers = suppliers.map(s => s.id === supplier.id ? supplier : s);
      setSuppliers(updatedSuppliers);
    } else {
      
      updatedSuppliers = [supplier, ...suppliers];
      setSuppliers(updatedSuppliers);
    }
    
    
    if (currentUser) {
      console.log('Updating supplier cache after save');
      const userData = JSON.parse(localStorage.getItem(`user_data_${currentUser.id}`) || '{}');
      userData.suppliers = updatedSuppliers;
      userData.purchaseOrders = purchaseOrders; 
      userData.lastUpdated = new Date().toISOString();
      localStorage.setItem(`user_data_${currentUser.id}`, JSON.stringify(userData));
    }
    
   
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    console.log('Delete supplier requested for ID:', supplierId);
    
    if (!window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      console.log('Supplier deletion cancelled by user');
      return;
    }
    
    try {
      
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      
      
      if (editingSupplier?.id === supplierId) {
        console.log('Clearing editing supplier and closing modal');
        setEditingSupplier(undefined);
        setShowSupplierModal(false);
      }
      
      console.log('Deleting supplier:', supplierId);
      
      await userDataService.deleteSupplier(supplierId);
      console.log('Supplier deleted successfully');
      
    } catch (error) {
      console.error('Error deleting supplier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete supplier. Please try again.';
      alert(errorMessage);
      
      
      await loadSuppliers();
    }
  };

  const handleEditSupplier = (supplier: SupplierData) => {
    console.log('Edit supplier requested for:', supplier.name);
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
    console.log('Edit modal opened with supplier data');
  };

  const handleCreatePO = async () => {
    if (!currentUser) return;
    
    try {
      const totalCost = poForm.items.reduce((sum, item) => sum + item.total, 0);
      
      
      const orderItems = poForm.items.map(item => ({
        partId: item.partName, 
        quantity: typeof item.quantity === 'string' && item.quantity === '' ? 0 : 
                 typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0,
        unitCost: typeof item.unitPrice === 'string' && item.unitPrice === '' ? 0 : 
                 typeof item.unitPrice === 'number' ? item.unitPrice : Number(item.unitPrice) || 0,
        totalCost: item.total,
        category: item.category 
      }));

      if (editingPurchaseOrder) {
        
        const updateData = {
          supplierId: poForm.supplierId,
          items: orderItems,
          totalCost,
          notes: poForm.notes
        };

        
        const updatedPO: PurchaseOrder = {
          ...editingPurchaseOrder,
          ...updateData,
          updatedAt: new Date()
        };

        setPurchaseOrders(prev => prev.map(po => 
          po.id === editingPurchaseOrder.id ? updatedPO : po
        ));
        
        
        try {
          await userDataService.updatePurchaseOrder(editingPurchaseOrder.id, updateData);
          console.log('Purchase order updated successfully:', editingPurchaseOrder.id);
        } catch (error) {
          console.error('Error updating purchase order:', error);
          alert('Failed to update purchase order. Please try again.');
          
          await loadPurchaseOrders();
        }
        
        setEditingPurchaseOrder(null);
      } else {
        
        const purchaseOrderData = {
          supplierId: poForm.supplierId,
          orderNumber: poForm.orderNumber || `PO-${Date.now()}`, 
          items: orderItems,
          totalCost,
          status: 'draft' as const,
          orderDate: new Date(),
          notes: poForm.notes
        };

        console.log('Creating purchase order with supplier ID:', poForm.supplierId);
        console.log('Available suppliers at creation time:', suppliers.map(s => ({ id: s.id, name: s.name })));

        
        const tempPurchaseOrder: PurchaseOrder = {
          id: `temp_${Date.now()}`,
          userId: currentUser.id,
          ...purchaseOrderData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log('Creating purchase order:', purchaseOrderData);
        console.log('Order items with part names:', orderItems);
        console.log('Selected supplier ID:', poForm.supplierId);
        console.log('Available suppliers at creation time:', suppliers.map(s => ({ id: s.id, name: s.name })));

        
        const selectedSupplier = suppliers.find(s => s.id === poForm.supplierId);
        if (!selectedSupplier) {
          console.error('Selected supplier not found in suppliers list!');
          alert('Error: Selected supplier not found. Please refresh the page and try again.');
          return;
        }

        console.log('Validated supplier:', selectedSupplier.name);

        
        setPurchaseOrders(prev => [tempPurchaseOrder, ...prev]);

        
        try {
          const newId = await userDataService.createPurchaseOrder(currentUser.id, purchaseOrderData);
          console.log('Purchase order created successfully:', newId);
          
          
          const finalPurchaseOrder = { ...tempPurchaseOrder, id: newId };
          setPurchaseOrders(prev => prev.map(po => 
            po.id === tempPurchaseOrder.id ? finalPurchaseOrder : po
          ));
          
          
          const updatedOrders = [finalPurchaseOrder, ...purchaseOrders.filter(po => po.id !== tempPurchaseOrder.id)];
          console.log('Updating cache with new purchase order');
          
          
          const userData = JSON.parse(localStorage.getItem(`user_data_${currentUser.id}`) || '{}');
          userData.purchaseOrders = updatedOrders;
          userData.suppliers = suppliers; 
          userData.lastUpdated = new Date().toISOString();
          localStorage.setItem(`user_data_${currentUser.id}`, JSON.stringify(userData));
          
        } catch (error) {
          console.error('Error creating purchase order:', error);
          alert('Failed to create purchase order. Please try again.');
          
          setPurchaseOrders(prev => prev.filter(po => po.id !== tempPurchaseOrder.id));
        }
      }
      
      
      setPOForm({
        orderNumber: '',
        supplierId: '',
        items: [{ partName: '', quantity: '', unitPrice: '', total: 0, category: 'parts' }],
        notes: '',
        status: 'draft' as 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled',
        expectedDelivery: '',
        totalCost: '0'
      });
      setShowPOModal(false);
    } catch (error) {
      console.error('Error creating purchase order:', error);
    }
  };

  const addPOItem = () => {
    setPOForm(prev => ({
      ...prev,
      items: [...prev.items, { partName: '', quantity: '', unitPrice: '', total: 0, category: 'parts' }]
    }));
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    setPOForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      
      if (field === 'quantity' || field === 'unitPrice') {
        const quantityValue = newItems[index].quantity;
        const unitPriceValue = newItems[index].unitPrice;
        
        const quantity = typeof quantityValue === 'string' && quantityValue === '' ? 0 : 
                        typeof quantityValue === 'number' ? quantityValue : parseFloat(quantityValue) || 0;
        const unitPrice = typeof unitPriceValue === 'string' && unitPriceValue === '' ? 0 : 
                         typeof unitPriceValue === 'number' ? unitPriceValue : parseFloat(unitPriceValue) || 0;
        newItems[index].total = Number(quantity) * Number(unitPrice);
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
    
    
    const supplierExists = suppliers.find(s => s.id === purchaseOrder.supplierId);
    if (!supplierExists) {
      console.warn(`Purchase order ${purchaseOrder.id} references missing supplier ${purchaseOrder.supplierId}`);
    }
    
    setPOForm({
      orderNumber: purchaseOrder.orderNumber,
      supplierId: purchaseOrder.supplierId,
      items: purchaseOrder.items.map(item => ({
        partName: item.partId, 
        quantity: item.quantity.toString(),
        unitPrice: item.unitCost.toString(),
        total: item.totalCost,
        category: (item as any).category || 'parts' 
      })),
      notes: purchaseOrder.notes || '',
      status: purchaseOrder.status,
      expectedDelivery: purchaseOrder.expectedDeliveryDate?.toISOString().split('T')[0] || '',
      totalCost: purchaseOrder.totalCost?.toString() || '0'
    });
    setShowPOModal(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    console.log(`Changing order ${orderId} status to ${newStatus}`);
    
    
    setPurchaseOrders(prev => {
      const updated = prev.map(po => 
        po.id === orderId 
          ? { ...po, status: newStatus as 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' }
          : po
      );
      console.log('Updated purchase orders in local state:', updated);
      return updated;
    });

    
    try {
      await userDataService.updatePurchaseOrder(orderId, { 
        status: newStatus as 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
      });
      console.log(`Purchase order ${orderId} status updated to ${newStatus} in database`);
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      
      setPurchaseOrders(prev => prev.map(po => 
        po.id === orderId 
          ? { ...po, status: purchaseOrders.find(p => p.id === orderId)?.status || 'draft' }
          : po
      ));
      alert('Failed to update purchase order status. Please try again.');
    }
  };

  const handleDeletePurchaseOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      
      setPurchaseOrders(prev => prev.filter(po => po.id !== orderId));
      
      
      try {
        await userDataService.deletePurchaseOrder(orderId);
        console.log(`Purchase order ${orderId} deleted successfully`);
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        alert('Failed to delete purchase order. Please try again.');
        
        await loadPurchaseOrders();
      }
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  
  const [supplierAnalytics, setSupplierAnalytics] = useState({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    topSuppliers: [] as Array<{
      id: string;
      name: string;
      orderCount: number;
      totalSpent: number;
    }>
  });

 
  const validateAndCleanupData = () => {
    if (!suppliersLoaded || !purchaseOrdersLoaded || !currentUser) {
      return;
    }
    
    console.log('Running data integrity check...');
    
    
    const orphanedOrders = purchaseOrders.filter(po => 
      !suppliers.find(s => s.id === po.supplierId)
    );
    
    if (orphanedOrders.length > 0) {
      console.warn('Found orphaned purchase orders:', orphanedOrders);
      
      
      
      
      
      
      
      const missingSupplierIds = Array.from(new Set(orphanedOrders.map(po => po.supplierId)));
      console.log('Missing supplier IDs:', missingSupplierIds);
      
      
      console.log('Data integrity issues found but not auto-fixed. Manual review recommended.');
    } else {
      console.log('Data integrity check passed - all purchase orders have valid suppliers');
    }
  };

  
  useEffect(() => {
    if (suppliersLoaded && purchaseOrdersLoaded && currentUser) {
      validateAndCleanupData();
      
      userDataService.syncSuppliersAndPurchaseOrdersCache(currentUser.id, suppliers, purchaseOrders);
    }
  }, [suppliersLoaded, purchaseOrdersLoaded, currentUser, suppliers.length, purchaseOrders.length]);

  
  useEffect(() => {
    
    if (!suppliersLoaded || !purchaseOrdersLoaded) {
      console.log('Waiting for all data to load before calculating analytics...');
      return;
    }
    
    console.log('Recalculating supplier analytics...');
    console.log('Suppliers:', suppliers.length);
    console.log('Purchase Orders:', purchaseOrders.length);
    
   
    const orphanedOrders = purchaseOrders.filter(po => 
      !suppliers.find(s => s.id === po.supplierId)
    );
    
    if (orphanedOrders.length > 0) {
      console.warn('Found purchase orders with missing suppliers:', orphanedOrders.map(po => ({
        orderId: po.id,
        orderNumber: po.orderNumber,
        supplierId: po.supplierId
      })));
      console.log('Available supplier IDs:', suppliers.map(s => s.id));
    }
    
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const receivedOrders = purchaseOrders.filter(po => po.status === 'received');
    const totalOrders = receivedOrders.length;
    const pendingOrders = purchaseOrders.filter(po => po.status === 'sent' || po.status === 'confirmed').length;
    
    console.log('Received orders:', receivedOrders);
    
    
    const supplierOrderMap = new Map<string, { orderCount: number; totalSpent: number; supplier: SupplierData }>();
    
    
    suppliers.forEach(supplier => {
      supplierOrderMap.set(supplier.id, { orderCount: 0, totalSpent: 0, supplier });
    });
    
    
    receivedOrders.forEach(order => {
      const existing = supplierOrderMap.get(order.supplierId);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += order.totalCost;
        console.log(`Supplier ${existing.supplier.name} now has ${existing.orderCount} received orders (${existing.totalSpent.toFixed(2)})`);
      } else {
        console.warn(`Order ${order.id} references unknown supplier ${order.supplierId}`);
      }
    });
    
    
    const topSuppliers = Array.from(supplierOrderMap.values())
      .filter(entry => entry.orderCount > 0)
      .sort((a, b) => {
        
        if (b.orderCount !== a.orderCount) {
          return b.orderCount - a.orderCount;
        }
        
        return b.totalSpent - a.totalSpent;
      })
      .slice(0, 5)
      .map(entry => ({
        id: entry.supplier.id,
        name: entry.supplier.name,
        orderCount: entry.orderCount,
        totalSpent: entry.totalSpent
      }));
    
    console.log('Top suppliers calculated:', topSuppliers);
    
    setSupplierAnalytics({
      totalSuppliers,
      activeSuppliers,
      totalOrders,
      pendingOrders,
      topSuppliers
    });
  }, [suppliers, purchaseOrders, suppliersLoaded, purchaseOrdersLoaded]);

  const stats = supplierAnalytics;

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
            <p>Received Orders</p>
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
                  disabled={isLoadingSuppliers}
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setEditingSupplier(undefined);
                  setShowSupplierModal(true);
                }}
                disabled={isLoadingSuppliers}
              >
                <Plus size={20} />
                Add Supplier
              </button>
            </div>

            {isLoadingSuppliers && currentUser && (
              <div className="loading-message" style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                Loading suppliers...
              </div>
            )}

            {!currentUser && (
              <div className="loading-message" style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                Waiting for user authentication...
              </div>
            )}

            {suppliersLoaded && (
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
                      <p><strong>Payment Terms:</strong> {supplier.paymentTerms}</p>
                      <p><strong>Lead Time:</strong> {supplier.defaultLeadTimeDays} days</p>
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
                
                {filteredSuppliers.length === 0 && !isLoadingSuppliers && (
                  <div style={{
                    textAlign: 'center',
                    color: '#6c757d',
                    fontSize: '14px',
                    padding: '40px',
                    fontStyle: 'italic',
                    gridColumn: '1 / -1'
                  }}>
                    {searchTerm ? 'No suppliers match your search criteria.' : 'No suppliers found. Add your first supplier to get started.'}
                  </div>
                )}
              </div>
            )}
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
                disabled={isLoadingSuppliers || !suppliersLoaded}
              >
                <Plus size={20} />
                Create Purchase Order
              </button>
            </div>

            {/* Loading states */}
            {!currentUser && (
              <div className="loading-message" style={{
                textAlign: 'center',
                padding: '20px',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                Waiting for user authentication...
              </div>
            )}

            {currentUser && (isLoadingSuppliers || isLoadingPurchaseOrders) && (
              <div className="loading-message" style={{
                textAlign: 'center',
                padding: '20px',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                {isLoadingSuppliers && 'Loading suppliers...'}
                {!isLoadingSuppliers && isLoadingPurchaseOrders && 'Loading purchase orders...'}
              </div>
            )}

            {currentUser && (
              <div className="orders-list">
                {/* Debug information */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ padding: '10px', background: '#f8f9fa', marginBottom: '10px', fontSize: '12px' }}>
                    <strong>Debug Info:</strong> Suppliers loaded: {suppliersLoaded ? 'Yes' : 'No'} ({suppliers.length}), 
                    Purchase Orders loaded: {purchaseOrdersLoaded ? 'Yes' : 'No'} ({purchaseOrders.length}), 
                    Current User: {currentUser?.id || 'None'}
                  </div>
                )}
                
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
                      
                      
                      let supplierName: string;
                      let supplierStatus: 'found' | 'loading' | 'unknown' = 'found';
                      
                      if (supplier) {
                        supplierName = supplier.name;
                        supplierStatus = 'found';
                      } else {
                       
                        const hasCachedData = suppliers.length > 0 || suppliersLoaded;
                        
                        if (!hasCachedData && (!suppliersLoaded || !purchaseOrdersLoaded)) {
                          supplierName = 'Loading...';
                          supplierStatus = 'loading';
                        } else {
                         
                          supplierName = 'Unknown Supplier';
                          supplierStatus = 'unknown';
                          console.warn(`Purchase order ${order.id} references unknown supplier ${order.supplierId}`);
                          console.log('Available suppliers at render time:', suppliers.map(s => ({ id: s.id, name: s.name })));
                          console.log('Purchase order supplier ID:', order.supplierId);
                        }
                      }
                      
                      return (
                        <tr key={order.id}>
                          <td>{order.orderNumber}</td>
                          <td>
                            <span className={supplierStatus === 'found' ? '' : 'unknown-supplier'} style={{
                              color: supplierStatus === 'found' ? 'inherit' : 
                                     supplierStatus === 'loading' ? '#6c757d' : '#dc3545',
                              fontStyle: supplierStatus === 'found' ? 'normal' : 'italic'
                            }}>
                              {supplierName}
                            </span>
                          </td>
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
                                disabled={isLoadingSuppliers}
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
                
                {purchaseOrders.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    color: '#6c757d',
                    fontSize: '14px',
                    padding: '20px',
                    fontStyle: 'italic'
                  }}>
                    No purchase orders found. Create your first purchase order to get started.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h3>Supplier Analytics</h3>
            
            {(!suppliersLoaded || !purchaseOrdersLoaded) && (
              <div className="loading-message" style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                Loading analytics data...
              </div>
            )}
            
            {suppliersLoaded && purchaseOrdersLoaded && (
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>Top Suppliers by Orders</h4>
                  <div className="supplier-ranking">
                    {supplierAnalytics.topSuppliers.length > 0 ? (
                      supplierAnalytics.topSuppliers.map((supplier, index) => (
                        <div key={supplier.id} className="ranking-item">
                          <span className="rank">#{index + 1}</span>
                          <span className="name">{supplier.name}</span>
                          <span className="count">{supplier.orderCount} received (${supplier.totalSpent.toFixed(2)})</span>
                        </div>
                      ))
                    ) : (
                      <div className="no-data-message" style={{
                        textAlign: 'center',
                        color: '#6c757d',
                        fontSize: '14px',
                        padding: '20px',
                        fontStyle: 'italic'
                      }}>
                        No received orders yet. Complete some purchase orders to see supplier rankings.
                      </div>
                    )}
                  </div>
                </div>

                <div className="analytics-card">
                  <h4>Order Categories</h4>
                  <div className="category-breakdown">
                    {['parts', 'fuel', 'maintenance', 'tools', 'repairs', 'tires', 'insurance', 'other'].map(category => {
                     
                      const receivedOrders = purchaseOrders.filter(po => po.status === 'received');
                      
                      
                      const categoryItems = receivedOrders.flatMap(po => 
                        po.items.filter(item => (item as any).category === category)
                      );
                      
                      const itemCount = categoryItems.length;
                      const totalValue = categoryItems.reduce((sum, item) => sum + item.totalCost, 0);
                      
                     
                      const totalItems = receivedOrders.flatMap(po => po.items).length;
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
                          <span className="category-percentage">{itemCount} received (${totalValue.toFixed(2)})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="analytics-card">
                  <h4>Purchase Order Stats</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">All Orders</span>
                      <span className="stat-value" style={{fontSize: purchaseOrders.length.toString().length > 3 ? '0.7rem' : '0.9rem'}}>
                        {purchaseOrders.length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Completed Spending</span>
                      <span className="stat-value" style={{fontSize: (() => {
                        const value = supplierAnalytics.totalOrders > 0 
                          ? purchaseOrders.filter(po => po.status === 'received').reduce((sum, po) => sum + po.totalCost, 0).toFixed(2)
                          : '0.00';
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
                      <span className="stat-value" style={{fontSize: supplierAnalytics.activeSuppliers.toString().length > 2 ? '0.8rem' : '0.9rem'}}>
                        {supplierAnalytics.activeSuppliers}
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
            )}
          </div>
        )}
      </div>

      {/* Supplier Form Modal */}
      {showSupplierModal && (
        <SupplierForm
          supplier={editingSupplier}
          onSuccess={handleSupplierSaved}
          onCancel={() => setShowSupplierModal(false)}
        />
      )}

      {}
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
                disabled={!poForm.supplierId || poForm.items.some(item => !item.partName)}
              >
                {editingPurchaseOrder ? 'Update Purchase Order' : 'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
