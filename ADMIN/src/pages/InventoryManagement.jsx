import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/InventoryManagement.css';
import { 
  getAllIngredients, 
  createIngredient, 
  updateIngredient, 
  deleteIngredient,
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getAllPurchases,
  createPurchase
} from '../services/inventoryService';

function InventoryManagement() {
  // Active tab state
  const [activeTab, setActiveTab] = useState('ingredients');

  // Ingredients state
  const [ingredients, setIngredients] = useState([]);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [showAddIngredientForm, setShowAddIngredientForm] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [ingredientFilters, setIngredientFilters] = useState({
    searchTerm: '',
    category: '',
    stockLevel: '',
    startDate: '',
    endDate: ''
  });

  // Suppliers state
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showAddSupplierForm, setShowAddSupplierForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierFilters, setSupplierFilters] = useState({
    searchTerm: '',
    status: '',
  });

  // Purchases state
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [showAddPurchaseForm, setShowAddPurchaseForm] = useState(false);
  const [purchaseFilters, setPurchaseFilters] = useState({
    startDate: '',
    endDate: '',
    supplierId: '',
    ingredientId: '',
  });

  // New item forms
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    variant: '',
    category: '',
    unit: 'kg',
    current_stock: 0,
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_phone: '',
    email: '',
    address: '',
    status: 'active',
    notes: '',
  });

  const [newPurchase, setNewPurchase] = useState({
    ingredient_id: '',
    supplier_id: '',
    quantity: 0,
    unit_price: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Replace mock data loading with API calls
  useEffect(() => {
    fetchAllData();
  }, []);

  // Function to fetch all data from APIs
  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch ingredients
      const ingredientsData = await getAllIngredients();
      setIngredients(ingredientsData);
      setFilteredIngredients(ingredientsData);
      
      // Fetch suppliers
      const suppliersData = await getAllSuppliers();
      setSuppliers(suppliersData);
      setFilteredSuppliers(suppliersData);
      
      // Fetch purchases
      const purchasesData = await getAllPurchases();
      setPurchases(purchasesData);
      setFilteredPurchases(purchasesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters when ingredient filters change
  useEffect(() => {
    filterIngredients();
  }, [ingredients, ingredientFilters]);

  // Apply filters when supplier filters change
  useEffect(() => {
    filterSuppliers();
  }, [suppliers, supplierFilters]);

  // Apply filters when purchase filters change
  useEffect(() => {
    filterPurchases();
  }, [purchases, purchaseFilters]);

  // Function to filter ingredients
  const filterIngredients = () => {
    let filtered = [...ingredients];
    const { searchTerm, category, stockLevel, startDate, endDate } = ingredientFilters;

    if (searchTerm) {
      filtered = filtered.filter(ing => 
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ing.variant && ing.variant.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (category) {
      filtered = filtered.filter(ing => ing.category === category);
    }

    if (stockLevel) {
      switch(stockLevel) {
        case 'low':
          filtered = filtered.filter(ing => ing.current_stock < 10);
          break;
        case 'medium':
          filtered = filtered.filter(ing => ing.current_stock >= 10 && ing.current_stock < 30);
          break;
        case 'high':
          filtered = filtered.filter(ing => ing.current_stock >= 30);
          break;
        default:
          break;
      }
    }

    // Add date filtering
    if (startDate) {
      filtered = filtered.filter(ing => new Date(ing.last_updated) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(ing => new Date(ing.last_updated) <= new Date(endDate));
    }

    // Sort ingredients by ID numerically
    filtered.sort((a, b) => {
      const idA = parseInt(a.id);
      const idB = parseInt(b.id);
      return idA - idB;
    });

    setFilteredIngredients(filtered);
  };

  // Function to filter suppliers
  const filterSuppliers = () => {
    let filtered = [...suppliers];
    const { searchTerm, status } = supplierFilters;

    if (searchTerm) {
      filtered = filtered.filter(sup => 
        sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sup.email && sup.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sup.contact_phone && sup.contact_phone.includes(searchTerm))
      );
    }

    if (status) {
      filtered = filtered.filter(sup => sup.status === status);
    }

    // Sort suppliers by ID numerically
    filtered.sort((a, b) => {
      const idA = parseInt(a.id);
      const idB = parseInt(b.id);
      return idA - idB;
    });

    setFilteredSuppliers(filtered);
  };

  // Function to filter purchases
  const filterPurchases = () => {
    let filtered = [...purchases];
    const { startDate, endDate, supplierId, ingredientId } = purchaseFilters;

    if (startDate) {
      filtered = filtered.filter(pur => new Date(pur.purchase_date) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(pur => new Date(pur.purchase_date) <= new Date(endDate));
    }

    if (supplierId) {
      filtered = filtered.filter(pur => pur.supplier_id.toString() === supplierId);
    }

    if (ingredientId) {
      filtered = filtered.filter(pur => pur.ingredient_id.toString() === ingredientId);
    }

    // Sort purchases by ID numerically
    filtered.sort((a, b) => {
      const idA = parseInt(a.id);
      const idB = parseInt(b.id);
      return idA - idB;
    });

    setFilteredPurchases(filtered);
  };

  // Helper function for input changes
  const handleInputChange = (setter, fields) => (e) => {
    const { name, value } = e.target;
    setter({
      ...fields,
      [name]: value
    });
  };

  // Handle filter changes for each entity
  const handleIngredientFilterChange = (e) => {
    const { name, value } = e.target;
    setIngredientFilters({
      ...ingredientFilters,
      [name]: value
    });
  };

  const handleSupplierFilterChange = (e) => {
    const { name, value } = e.target;
    setSupplierFilters({
      ...supplierFilters,
      [name]: value
    });
  };

  const handlePurchaseFilterChange = (e) => {
    const { name, value } = e.target;
    setPurchaseFilters({
      ...purchaseFilters,
      [name]: value
    });
  };

  // Reset filters
  const resetFilters = (filterType) => {
    switch(filterType) {
      case 'ingredients':
        setIngredientFilters({
          searchTerm: '',
          category: '',
          stockLevel: '',
          startDate: '',
          endDate: ''
        });
        break;
      case 'suppliers':
        setSupplierFilters({
          searchTerm: '',
          status: ''
        });
        break;
      case 'purchases':
        setPurchaseFilters({
          startDate: '',
          endDate: '',
          supplierId: '',
          ingredientId: ''
        });
        break;
      default:
        break;
    }
  };

  // CRUD operations for ingredients
  const handleAddIngredient = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await createIngredient(newIngredient);
      
      // Fetch updated ingredients list
      const updatedIngredients = await getAllIngredients();
      setIngredients(updatedIngredients);
      
      setNewIngredient({
        name: '',
        variant: '',
        category: '',
        unit: 'kg',
        current_stock: 0
      });
      setShowAddIngredientForm(false);
    } catch (err) {
      console.error('Error adding ingredient:', err);
      setError('Failed to add ingredient. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditIngredient = (ingredient) => {
    setSelectedIngredient(ingredient);
    setShowAddIngredientForm(true);
  };

  const handleUpdateIngredient = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateIngredient(selectedIngredient.id, selectedIngredient);
      
      // Fetch updated ingredients list
      const updatedIngredients = await getAllIngredients();
      setIngredients(updatedIngredients);
      
      setSelectedIngredient(null);
      setShowAddIngredientForm(false);
    } catch (err) {
      console.error('Error updating ingredient:', err);
      setError('Failed to update ingredient. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIngredient = async (id) => {
    if (window.confirm('Are you sure you want to delete this ingredient?')) {
      setIsLoading(true);
      
      try {
        await deleteIngredient(id);
        
        // Fetch updated ingredients list
        const updatedIngredients = await getAllIngredients();
        setIngredients(updatedIngredients);
      } catch (err) {
        console.error('Error deleting ingredient:', err);
        if (err.response && err.response.status === 400) {
          alert(err.response.data.message || 'Cannot delete: This ingredient has purchase history.');
        } else {
          setError('Failed to delete ingredient. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // CRUD operations for suppliers
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await createSupplier(newSupplier);
      
      // Fetch updated suppliers list
      const updatedSuppliers = await getAllSuppliers();
      setSuppliers(updatedSuppliers);
      
      setNewSupplier({
        name: '',
        contact_phone: '',
        email: '',
        address: '',
        status: 'active',
        notes: ''
      });
      setShowAddSupplierForm(false);
    } catch (err) {
      console.error('Error adding supplier:', err);
      setError('Failed to add supplier. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowAddSupplierForm(true);
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateSupplier(selectedSupplier.id, selectedSupplier);
      
      // Fetch updated suppliers list
      const updatedSuppliers = await getAllSuppliers();
      setSuppliers(updatedSuppliers);
      
      setSelectedSupplier(null);
      setShowAddSupplierForm(false);
    } catch (err) {
      console.error('Error updating supplier:', err);
      setError('Failed to update supplier. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      setIsLoading(true);
      
      try {
        await deleteSupplier(id);
        
        // Fetch updated suppliers list
        const updatedSuppliers = await getAllSuppliers();
        setSuppliers(updatedSuppliers);
      } catch (err) {
        console.error('Error deleting supplier:', err);
        if (err.response && err.response.status === 400) {
          alert(err.response.data.message || 'Cannot delete: This supplier has purchase history.');
        } else {
          setError('Failed to delete supplier. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // CRUD operations for purchases
  const handleAddPurchase = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await createPurchase(newPurchase);
      
      // Fetch updated data
      const [updatedPurchases, updatedIngredients] = await Promise.all([
        getAllPurchases(),
        getAllIngredients()
      ]);
      
      setPurchases(updatedPurchases);
      setIngredients(updatedIngredients);
      
      setNewPurchase({
        ingredient_id: '',
        supplier_id: '',
        quantity: 0,
        unit_price: 0,
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowAddPurchaseForm(false);
    } catch (err) {
      console.error('Error recording purchase:', err);
      setError('Failed to record purchase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // UI Helper functions
  const getStockLevelClass = (stockLevel) => {
    if (stockLevel < 10) return 'low-stock';
    if (stockLevel < 30) return 'medium-stock';
    return 'high-stock';
  };

  const getUniqueCategories = () => {
    const categories = new Set(ingredients.map(ing => ing.category).filter(Boolean));
    return ['', ...Array.from(categories)];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  // Show loading spinner
  if (isLoading && !ingredients.length && !suppliers.length && !purchases.length) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="dashboard-content">
          <Header title="Inventory Management" />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show error message
  if (error && !ingredients.length && !suppliers.length && !purchases.length) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="dashboard-content">
          <Header title="Inventory Management" />
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={fetchAllData}>Retry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Inventory Management" />
        
        <div className="inventory-controls">
          <div className="tabs">
            <button 
              className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
              onClick={() => setActiveTab('ingredients')}
            >
              <i className="fas fa-carrot"></i> Ingredients
            </button>
            <button 
              className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              <i className="fas fa-truck"></i> Suppliers
            </button>
            <button 
              className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
              onClick={() => setActiveTab('purchases')}
            >
              <i className="fas fa-shopping-basket"></i> Purchases
            </button>
          </div>
        </div>
        
        {/* Ingredients Tab */}
        {activeTab === 'ingredients' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Manage Ingredients</h2>
              <button 
                className="add-btn"
                onClick={() => {
                  setSelectedIngredient(null);
                  setShowAddIngredientForm(true);
                }}
              >
                <i className="fas fa-plus"></i> Add New Ingredient
              </button>
            </div>
            
            {/* Ingredients Filters */}
            <div className="filters-section">
              <div className="search-bar">
                <input 
                  type="text" 
                  name="searchTerm"
                  value={ingredientFilters.searchTerm}
                  onChange={handleIngredientFilterChange}
                  placeholder="Search ingredients..."
                />
              </div>
              
              <div className="filter-options">
                <select 
                  name="category"
                  value={ingredientFilters.category}
                  onChange={handleIngredientFilterChange}
                >
                  <option value="">All Categories</option>
                  {getUniqueCategories().map((category, index) => (
                    category && <option key={index} value={category}>{category}</option>
                  ))}
                </select>
                
                <select 
                  name="stockLevel"
                  value={ingredientFilters.stockLevel}
                  onChange={handleIngredientFilterChange}
                >
                  <option value="">All Stock Levels</option>
                  <option value="low">Low Stock (&lt; 10)</option>
                  <option value="medium">Medium Stock (10-30)</option>
                  <option value="high">High Stock (&gt; 30)</option>
                </select>
                
                <div className="date-filter">
                  <div className="date-inputs">
                    <input 
                      type="date" 
                      name="startDate"
                      value={ingredientFilters.startDate}
                      onChange={handleIngredientFilterChange}
                      placeholder="From date"
                    />
                    <span>to</span>
                    <input 
                      type="date" 
                      name="endDate"
                      value={ingredientFilters.endDate}
                      onChange={handleIngredientFilterChange}
                      placeholder="To date"
                    />
                  </div>
                </div>
                
                <button 
                  className="reset-filter-btn"
                  onClick={() => resetFilters('ingredients')}
                >
                  <i className="fas fa-undo"></i> Reset Filters
                </button>
              </div>
            </div>
            
            {/* Ingredients Table */}
            <div className="table-container">
              <table className="data-table ingredients-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Variant</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Current Stock</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.length > 0 ? (
                    filteredIngredients.map(ingredient => (
                      <tr key={ingredient.id}>
                        <td>{ingredient.id}</td>
                        <td>{ingredient.name}</td>
                        <td>{ingredient.variant || 'N/A'}</td>
                        <td>{ingredient.category}</td>
                        <td>{ingredient.unit}</td>
                        <td className={`stock-level ${getStockLevelClass(ingredient.current_stock)}`}>
                          {ingredient.current_stock} {ingredient.unit}
                        </td>
                        <td>{formatDateTime(ingredient.last_updated)}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="edit-btn"
                              onClick={() => handleEditIngredient(ingredient)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteIngredient(ingredient.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-data">No ingredients found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Add/Edit Ingredient Form Modal */}
            {showAddIngredientForm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>{selectedIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}</h3>
                    <button 
                      className="close-modal-btn"
                      onClick={() => {
                        setShowAddIngredientForm(false);
                        setSelectedIngredient(null);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                  
                  <form onSubmit={selectedIngredient ? handleUpdateIngredient : handleAddIngredient}>
                    <div className="form-group">
                      <label>Name:</label>
                      <input 
                        type="text" 
                        name="name"
                        value={selectedIngredient ? selectedIngredient.name : newIngredient.name}
                        onChange={selectedIngredient 
                          ? (e) => setSelectedIngredient({...selectedIngredient, name: e.target.value})
                          : handleInputChange(setNewIngredient, newIngredient)
                        }
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Variant:</label>
                      <input 
                        type="text" 
                        name="variant"
                        value={selectedIngredient ? selectedIngredient.variant : newIngredient.variant}
                        onChange={selectedIngredient 
                          ? (e) => setSelectedIngredient({...selectedIngredient, variant: e.target.value})
                          : handleInputChange(setNewIngredient, newIngredient)
                        }
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Category:</label>
                      <input 
                        type="text" 
                        name="category"
                        value={selectedIngredient ? selectedIngredient.category : newIngredient.category}
                        onChange={selectedIngredient 
                          ? (e) => setSelectedIngredient({...selectedIngredient, category: e.target.value})
                          : handleInputChange(setNewIngredient, newIngredient)
                        }
                        required
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Unit:</label>
                        <select 
                          name="unit"
                          value={selectedIngredient ? selectedIngredient.unit : newIngredient.unit}
                          onChange={selectedIngredient 
                            ? (e) => setSelectedIngredient({...selectedIngredient, unit: e.target.value})
                            : handleInputChange(setNewIngredient, newIngredient)
                          }
                          required
                        >
                          <option value="kg">Kilogram (kg)</option>
                          <option value="g">Gram (g)</option>
                          <option value="liters">Liters</option>
                          <option value="ml">Milliliters (ml)</option>
                          <option value="pieces">Pieces</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Current Stock:</label>
                        <input 
                          type="number" 
                          name="current_stock"
                          step="0.01"
                          min="0"
                          value={selectedIngredient ? selectedIngredient.current_stock : newIngredient.current_stock}
                          onChange={selectedIngredient 
                            ? (e) => setSelectedIngredient({...selectedIngredient, current_stock: e.target.value})
                            : handleInputChange(setNewIngredient, newIngredient)
                          }
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="submit-btn">
                        {selectedIngredient ? 'Update Ingredient' : 'Add Ingredient'}
                      </button>
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={() => {
                          setShowAddIngredientForm(false);
                          setSelectedIngredient(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Manage Suppliers</h2>
              <button 
                className="add-btn"
                onClick={() => {
                  setSelectedSupplier(null);
                  setShowAddSupplierForm(true);
                }}
              >
                <i className="fas fa-plus"></i> Add New Supplier
              </button>
            </div>
            
            {/* Suppliers Filters */}
            <div className="filters-section">
              <div className="search-bar">
                <input 
                  type="text" 
                  name="searchTerm"
                  value={supplierFilters.searchTerm}
                  onChange={handleSupplierFilterChange}
                  placeholder="Search suppliers..."
                />
              </div>
              
              <div className="filter-options">
                <select 
                  name="status"
                  value={supplierFilters.status}
                  onChange={handleSupplierFilterChange}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                
                <button 
                  className="reset-filter-btn"
                  onClick={() => resetFilters('suppliers')}
                >
                  <i className="fas fa-undo"></i> Reset Filters
                </button>
              </div>
            </div>
            
            {/* Suppliers Table */}
            <div className="table-container">
              <table className="data-table suppliers-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Contact Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(supplier => (
                      <tr key={supplier.id} className={supplier.status === 'inactive' ? 'inactive-row' : ''}>
                        <td>{supplier.id}</td>
                        <td>{supplier.name}</td>
                        <td>{supplier.contact_phone || 'N/A'}</td>
                        <td>{supplier.email || 'N/A'}</td>
                        <td className="address-cell">{supplier.address || 'N/A'}</td>
                        <td>
                          <span className={`status-badge status-${supplier.status}`}>
                            {supplier.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="notes-cell">{supplier.notes || 'N/A'}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="edit-btn"
                              onClick={() => handleEditSupplier(supplier)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteSupplier(supplier.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-data">No suppliers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Add/Edit Supplier Form Modal */}
            {showAddSupplierForm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>{selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                    <button 
                      className="close-modal-btn"
                      onClick={() => {
                        setShowAddSupplierForm(false);
                        setSelectedSupplier(null);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                  
                  <form onSubmit={selectedSupplier ? handleUpdateSupplier : handleAddSupplier}>
                    <div className="form-group">
                      <label>Name:</label>
                      <input 
                        type="text" 
                        name="name"
                        value={selectedSupplier ? selectedSupplier.name : newSupplier.name}
                        onChange={selectedSupplier 
                          ? (e) => setSelectedSupplier({...selectedSupplier, name: e.target.value})
                          : handleInputChange(setNewSupplier, newSupplier)
                        }
                        required
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Contact Phone:</label>
                        <input 
                          type="text" 
                          name="contact_phone"
                          value={selectedSupplier ? selectedSupplier.contact_phone : newSupplier.contact_phone}
                          onChange={selectedSupplier 
                            ? (e) => setSelectedSupplier({...selectedSupplier, contact_phone: e.target.value})
                            : handleInputChange(setNewSupplier, newSupplier)
                          }
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Email:</label>
                        <input 
                          type="email" 
                          name="email"
                          value={selectedSupplier ? selectedSupplier.email : newSupplier.email}
                          onChange={selectedSupplier 
                            ? (e) => setSelectedSupplier({...selectedSupplier, email: e.target.value})
                            : handleInputChange(setNewSupplier, newSupplier)
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Address:</label>
                      <input 
                        type="text" 
                        name="address"
                        value={selectedSupplier ? selectedSupplier.address : newSupplier.address}
                        onChange={selectedSupplier 
                          ? (e) => setSelectedSupplier({...selectedSupplier, address: e.target.value})
                          : handleInputChange(setNewSupplier, newSupplier)
                        }
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Status:</label>
                      <select 
                        name="status"
                        value={selectedSupplier ? selectedSupplier.status : newSupplier.status}
                        onChange={selectedSupplier 
                          ? (e) => setSelectedSupplier({...selectedSupplier, status: e.target.value})
                          : handleInputChange(setNewSupplier, newSupplier)
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Notes:</label>
                      <textarea 
                        name="notes"
                        rows="3"
                        value={selectedSupplier ? selectedSupplier.notes : newSupplier.notes}
                        onChange={selectedSupplier 
                          ? (e) => setSelectedSupplier({...selectedSupplier, notes: e.target.value})
                          : handleInputChange(setNewSupplier, newSupplier)
                        }
                      ></textarea>
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="submit-btn">
                        {selectedSupplier ? 'Update Supplier' : 'Add Supplier'}
                      </button>
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={() => {
                          setShowAddSupplierForm(false);
                          setSelectedSupplier(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Purchases Tab */}
        {activeTab === 'purchases' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Manage Purchases</h2>
              <button 
                className="add-btn"
                onClick={() => setShowAddPurchaseForm(true)}
              >
                <i className="fas fa-plus"></i> Record New Purchase
              </button>
            </div>
            
            {/* Purchases Filters */}
            <div className="filters-section purchases-filters">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Date Range:</label>
                  <div className="date-inputs">
                    <input 
                      type="date" 
                      name="startDate"
                      value={purchaseFilters.startDate}
                      onChange={handlePurchaseFilterChange}
                    />
                    <span>to</span>
                    <input 
                      type="date" 
                      name="endDate"
                      value={purchaseFilters.endDate}
                      onChange={handlePurchaseFilterChange}
                    />
                  </div>
                </div>
                
                <div className="filter-group">
                  <label>Supplier:</label>
                  <select 
                    name="supplierId"
                    value={purchaseFilters.supplierId}
                    onChange={handlePurchaseFilterChange}
                  >
                    <option value="">All Suppliers</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Ingredient:</label>
                  <select 
                    name="ingredientId"
                    value={purchaseFilters.ingredientId}
                    onChange={handlePurchaseFilterChange}
                  >
                    <option value="">All Ingredients</option>
                    {ingredients.map(ingredient => (
                      <option key={ingredient.id} value={ingredient.id.toString()}>
                        {ingredient.name} {ingredient.variant ? `(${ingredient.variant})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button 
                  className="reset-filter-btn"
                  onClick={() => resetFilters('purchases')}
                >
                  <i className="fas fa-undo"></i> Reset Filters
                </button>
              </div>
            </div>
            
            {/* Purchases Table */}
            <div className="table-container">
              <table className="data-table purchases-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ingredient</th>
                    <th>Supplier</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Cost</th>
                    <th>Purchase Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length > 0 ? (
                    filteredPurchases.map(purchase => (
                      <tr key={purchase.id}>
                        <td>{purchase.id}</td>
                        <td>{purchase.ingredient_name}</td>
                        <td>{purchase.supplier_name}</td>
                        <td>{purchase.quantity}</td>
                        <td>Rs. {parseFloat(purchase.unit_price).toFixed(2)}</td>
                        <td>Rs. {(purchase.quantity * purchase.unit_price).toFixed(2)}</td>
                        <td>{formatDate(purchase.purchase_date)}</td>
                        <td className="notes-cell">{purchase.notes || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-data">No purchases found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Add Purchase Form Modal */}
            {showAddPurchaseForm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>Record New Purchase</h3>
                    <button 
                      className="close-modal-btn"
                      onClick={() => setShowAddPurchaseForm(false)}
                    >
                      &times;
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddPurchase}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Ingredient:</label>
                        <select 
                          name="ingredient_id"
                          value={newPurchase.ingredient_id}
                          onChange={handleInputChange(setNewPurchase, newPurchase)}
                          required
                        >
                          <option value="">Select Ingredient</option>
                          {ingredients.map(ingredient => (
                            <option key={ingredient.id} value={ingredient.id.toString()}>
                              {ingredient.name} {ingredient.variant ? `(${ingredient.variant})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Supplier:</label>
                        <select 
                          name="supplier_id"
                          value={newPurchase.supplier_id}
                          onChange={handleInputChange(setNewPurchase, newPurchase)}
                          required
                        >
                          <option value="">Select Supplier</option>
                          {suppliers
                            .filter(supplier => supplier.status === 'active')
                            .map(supplier => (
                              <option key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Quantity:</label>
                        <input 
                          type="number" 
                          name="quantity"
                          step="0.01"
                          min="0.01"
                          value={newPurchase.quantity}
                          onChange={handleInputChange(setNewPurchase, newPurchase)}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Unit Price (Rs):</label>
                        <input 
                          type="number" 
                          name="unit_price"
                          step="0.01"
                          min="0.01"
                          value={newPurchase.unit_price}
                          onChange={handleInputChange(setNewPurchase, newPurchase)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Purchase Date:</label>
                        <input 
                          type="date" 
                          name="purchase_date"
                          value={newPurchase.purchase_date}
                          onChange={handleInputChange(setNewPurchase, newPurchase)}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Total Cost:</label>
                        <input 
                          type="text" 
                          value={`Rs. ${(newPurchase.quantity * newPurchase.unit_price).toFixed(2)}`}
                          readOnly
                          className="readonly-input"
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Notes:</label>
                      <textarea 
                        name="notes"
                        rows="3"
                        value={newPurchase.notes}
                        onChange={handleInputChange(setNewPurchase, newPurchase)}
                      ></textarea>
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="submit-btn">
                        Record Purchase
                      </button>
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={() => setShowAddPurchaseForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default InventoryManagement;
