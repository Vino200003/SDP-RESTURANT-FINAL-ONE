import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/MenuManagement.css';
import * as menuService from '../services/menuService';
// Import the API_URL from menuService
import { API_URL } from '../services/menuService';
// import { toast } from 'react-toastify'; // Uncomment after installing react-toastify

function MenuManagement() {
  // State for menu items
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [currentView, setCurrentView] = useState('menu'); // 'menu', 'categories', 'subcategories'
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // Add this state
  
  // State for forms
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  
  // New menu item form state
  const [newItem, setNewItem] = useState({
    menu_name: '',
    price: '',
    status: 'available',
    category_code: '',
    subcategory_code: '',
    image_url: '',
    image_path: '',
    description: ''
  });

  // Additional state for category management
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ category_name: '' });
  
  // Additional state for subcategory management
  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] = useState(false);
  const [isEditSubcategoryModalOpen, setIsEditSubcategoryModalOpen] = useState(false);
  const [currentSubcategory, setCurrentSubcategory] = useState(null);
  const [newSubcategory, setNewSubcategory] = useState({ 
    subcategory_name: '', 
    category_code: '' 
  });

  // Simple notification function until react-toastify is installed
  const notify = (message, type = 'info') => {
    console.log(`[${type}] ${message}`);
    alert(message);
  };

  // Fetch data whenever the view changes
  useEffect(() => {
    fetchData();
  }, [currentView]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Always fetch categories as they're needed across views
      try {
        const categoriesData = await menuService.getAllCategories();
        // Sort categories by ID in ascending order
        const sortedCategories = [...categoriesData].sort((a, b) => a.category_code - b.category_code);
        setCategories(sortedCategories);
      } catch (categoryError) {
        console.error('Error fetching categories:', categoryError);
        notify('Failed to load categories. Please check server connection.', 'error');
        setCategories([]); // Set empty array to prevent null reference errors
      }

      // Fetch data based on current view
      if (currentView === 'menu' || currentView === 'subcategories') {
        try {
          const menuItemsData = await menuService.getAllMenuItems();
          // Sort menu items by ID in ascending order
          const sortedMenuItems = [...menuItemsData].sort((a, b) => a.menu_id - b.menu_id);
          setMenuItems(sortedMenuItems);
        } catch (menuError) {
          console.error('Error fetching menu items:', menuError);
          notify('Failed to load menu items. Please check server connection.', 'error');
          setMenuItems([]); // Set empty array to prevent null reference errors
        }
      }

      if (currentView === 'subcategories') {
        try {
          const subcategoriesData = await menuService.getAllSubcategories();
          // Sort subcategories by ID in ascending order
          const sortedSubcategories = [...subcategoriesData].sort((a, b) => a.subcategory_code - b.subcategory_code);
          setSubcategories(sortedSubcategories);
        } catch (subcategoryError) {
          console.error('Error fetching subcategories:', subcategoryError);
          notify('Failed to load subcategories. Please check server connection.', 'error');
          setSubcategories([]); // Set empty array to prevent null reference errors
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      notify(`Error fetching data: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle adding a new menu item
  const handleAddItem = async () => {
    try {
      // Basic client-side validation
      if (!newItem.menu_name || !newItem.price || !newItem.category_code) {
        notify('Menu name, price, and category are required fields', 'error');
        return;
      }
      
      // Create a clean copy without image_path if it's empty
      const itemToSend = { ...newItem };
      if (!itemToSend.image_path) {
        delete itemToSend.image_path;
      }

      const result = await menuService.createMenuItem(itemToSend);
      notify('Menu item added successfully!', 'success');
      
      // Add new item and sort the array to maintain ID order
      const updatedItems = [...menuItems, { ...newItem, menu_id: result.menu_id }]
        .sort((a, b) => a.menu_id - b.menu_id);
      
      setMenuItems(updatedItems);
      setIsAddModalOpen(false);
      setNewItem({
        menu_name: '',
        price: '',
        status: 'available',
        category_code: '',
        subcategory_code: '',
        image_url: ''
      });
      fetchData();
    } catch (error) {
      // Handle server response errors more gracefully
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Error adding menu item';
        notify(errorMessage, 'error');
        console.error('[error] Error adding menu item:', errorMessage);
      } else {
        notify(`Network error: ${error.message}`, 'error');
        console.error('[error] Network error:', error);
      }
    }
  };
  
  // Handle editing a menu item
  const handleEditItem = async () => {
    if (!currentItem) return;
    
    try {
      // First validate required fields
      if (!currentItem.menu_name || !currentItem.price) {
        notify('Menu name and price are required', 'error');
        return;
      }
      
      // Ensure no null values in the data being sent
      const cleanedItem = {
        ...currentItem,
        menu_name: currentItem.menu_name,
        price: currentItem.price,
        status: currentItem.status || 'available',
        category_code: currentItem.category_code || '',
        subcategory_code: currentItem.subcategory_code || '',
        image_url: currentItem.image_url || ''
      };
      
      await menuService.updateMenuItem(cleanedItem.menu_id, cleanedItem);
      notify('Menu item updated successfully!', 'success');
      
      const updatedItems = menuItems.map(item => 
        item.menu_id === cleanedItem.menu_id ? cleanedItem : item
      ).sort((a, b) => a.menu_id - b.menu_id);
      
      setMenuItems(updatedItems);
      setIsEditModalOpen(false);
      setCurrentItem(null);
      fetchData();
    } catch (error) {
      console.error('[error]', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error updating menu item';
      notify(`Error updating menu item: ${errorMessage}`, 'error');
    }
  };
  
  // Handle deleting a menu item
  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await menuService.deleteMenuItem(id);
        notify('Menu item deleted successfully!', 'success');
        
        const filteredItems = menuItems.filter(item => item.menu_id !== id);
        setMenuItems(filteredItems);
      } catch (error) {
        notify(`Error deleting menu item: ${error.response?.data?.message || error.message}`, 'error');
      }
    }
  };
  
  // Handle adding a new category
  const handleAddCategory = async () => {
    try {
      const result = await menuService.createCategory(newCategory);
      notify('Category added successfully!', 'success');
      
      // Add new category and sort by ID
      const updatedCategories = [...categories, { 
        ...newCategory, 
        category_code: result.category_code 
      }].sort((a, b) => a.category_code - b.category_code);
      
      setCategories(updatedCategories);
      setIsAddCategoryModalOpen(false);
      setNewCategory({ category_name: '' });
    } catch (error) {
      notify(`Error adding category: ${error.response?.data?.message || error.message}`, 'error');
    }
  };
  
  // Handle editing a category
  const handleEditCategory = async () => {
    if (!currentCategory) return;
    
    try {
      await menuService.updateCategory(currentCategory.category_code, currentCategory);
      notify('Category updated successfully!', 'success');
      
      // Update the category and sort by ID
      const updatedCategories = categories.map(category => 
        category.category_code === currentCategory.category_code ? currentCategory : category
      ).sort((a, b) => a.category_code - b.category_code);
      
      setCategories(updatedCategories);
      setIsEditCategoryModalOpen(false);
      setCurrentCategory(null);
    } catch (error) {
      notify(`Error updating category: ${error.response?.data?.message || error.message}`, 'error');
    }
  };
  
  // Handle deleting a category
  const handleDeleteCategory = async (id) => {
    // Check if category has menu items
    const hasItems = menuItems.some(item => item.category_code === id);
    if (hasItems) {
      notify('Cannot delete category that has menu items. Please reassign or delete the items first.', 'warning');
      return;
    }
    
    // Check if category has subcategories
    const hasSubcategories = subcategories.some(sub => sub.category_code === id);
    if (hasSubcategories) {
      notify('Cannot delete category that has subcategories. Please reassign or delete the subcategories first.', 'warning');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await menuService.deleteCategory(id);
        notify('Category deleted successfully!', 'success');
        
        const filteredCategories = categories.filter(category => category.category_code !== id);
        setCategories(filteredCategories);
      } catch (error) {
        notify(`Error deleting category: ${error.response?.data?.message || error.message}`, 'error');
      }
    }
  };
  
  // Handle adding a new subcategory
  const handleAddSubcategory = async () => {
    try {
      const result = await menuService.createSubcategory(newSubcategory);
      notify('Subcategory added successfully!', 'success');
      
      // Add new subcategory and sort by ID
      const updatedSubcategories = [...subcategories, { 
        ...newSubcategory, 
        subcategory_code: result.subcategory_code 
      }].sort((a, b) => a.subcategory_code - b.subcategory_code);
      
      setSubcategories(updatedSubcategories);
      setIsAddSubcategoryModalOpen(false);
      setNewSubcategory({ subcategory_name: '', category_code: '' });
    } catch (error) {
      notify(`Error adding subcategory: ${error.response?.data?.message || error.message}`, 'error');
    }
  };
  
  // Handle editing a subcategory
  const handleEditSubcategory = async () => {
    if (!currentSubcategory) return;
    
    try {
      await menuService.updateSubcategory(
        currentSubcategory.subcategory_code, 
        currentSubcategory
      );
      notify('Subcategory updated successfully!', 'success');
      
      // Update the subcategory and sort by ID
      const updatedSubcategories = subcategories.map(subcategory => 
        subcategory.subcategory_code === currentSubcategory.subcategory_code 
          ? currentSubcategory 
          : subcategory
      ).sort((a, b) => a.subcategory_code - b.subcategory_code);
      
      setSubcategories(updatedSubcategories);
      setIsEditSubcategoryModalOpen(false);
      setCurrentSubcategory(null);
    } catch (error) {
      notify(`Error updating subcategory: ${error.response?.data?.message || error.message}`, 'error');
    }
  };
  
  // Handle deleting a subcategory
  const handleDeleteSubcategory = async (id) => {
    // Check if subcategory has menu items
    const hasItems = menuItems.some(item => item.subcategory_code === id);
    if (hasItems) {
      notify('Cannot delete subcategory that has menu items. Please reassign or delete the items first.', 'warning');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await menuService.deleteSubcategory(id);
        notify('Subcategory deleted successfully!', 'success');
        
        const filteredSubcategories = subcategories.filter(
          subcategory => subcategory.subcategory_code !== id
        );
        setSubcategories(filteredSubcategories);
      } catch (error) {
        notify(`Error deleting subcategory: ${error.response?.data?.message || error.message}`, 'error');
      }
    }
  };
  
  // Get category/subcategory name by code
  const getCategoryName = (code) => {
    const category = categories.find(cat => cat.category_code === code);
    return category ? category.category_name : 'Unknown';
  };
  
  const getSubcategoryName = (code) => {
    const subcategory = subcategories.find(sub => sub.subcategory_code === code);
    return subcategory ? sub.subcategory_name : 'Unknown';
  };

  // Handle category selection in new item form to load relevant subcategories
  const handleCategorySelect = async (categoryCode) => {
    setNewItem({ ...newItem, category_code: parseInt(categoryCode), subcategory_code: '' });
    
    if (categoryCode) {
      try {
        const subcategoriesData = await menuService.getSubcategoriesByCategory(categoryCode);
        setSubcategories(subcategoriesData);
      } catch (error) {
        notify(`Error loading subcategories: ${error.response?.data?.message || error.message}`, 'error');
      }
    }
  };

  // Add this function to handle image loading errors
  const handleImageError = (event) => {
    event.target.src = '/src/assets/default-food.png'; // Fallback to a default image
    event.target.classList.add('fallback-image');
  };

  // Update this function to only check image_url
  const getImageSource = (item) => {
    if (item.image_url && (item.image_url.startsWith('http') || item.image_url.startsWith('/'))) {
      return item.image_url;
    }
    return null;
  };

  // Add this new function to handle status filtering
  const handleStatusFilterChange = async (status) => {
    setIsLoading(true);
    setStatusFilter(status);
    
    try {
      let items;
      if (status === 'all') {
        // Get all items for 'all' filter
        items = await menuService.getAllMenuItems();
      } else {
        // Try to get filtered items from API
        items = await menuService.getMenuItemsByStatus(status);
        
        // If the API doesn't filter correctly, filter client-side
        if (items.length > 0 && items.some(item => item.status !== status)) {
          console.log('API did not filter correctly, filtering client-side');
          items = items.filter(item => item.status === status);
        }
      }
      
      const sortedItems = [...items].sort((a, b) => a.menu_id - b.menu_id);
      setMenuItems(sortedItems);
    } catch (error) {
      notify(`Error filtering items: ${error.message}`, 'error');
      
      // Fallback to client-side filtering if API call fails
      try {
        const allItems = await menuService.getAllMenuItems();
        let filteredItems = allItems;
        
        if (status !== 'all') {
          filteredItems = allItems.filter(item => item.status === status);
        }
        
        const sortedItems = [...filteredItems].sort((a, b) => a.menu_id - b.menu_id);
        setMenuItems(sortedItems);
      } catch (fallbackError) {
        notify('Failed to filter items. Please try refreshing the page.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to toggle item status
  const handleToggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'available' ? 'out_of_stock' : 'available';
      
      await menuService.updateMenuItemStatus(item.menu_id, newStatus);
      
      // Update the local state
      const updatedItems = menuItems.map(menuItem => 
        menuItem.menu_id === item.menu_id 
          ? { ...menuItem, status: newStatus }
          : menuItem
      );
      setMenuItems(updatedItems);
      notify(`Item "${item.menu_name}" is now ${newStatus === 'available' ? 'Available' : 'Out of Stock'}`, 'success');
    } catch (error) {
      notify(`Error updating status: ${error.message}`, 'error');
    }
  };

  // Update the code that sets the current item for editing to ensure values are not null
  const prepareItemForEdit = (item) => {
    // Create a copy with default values for any null properties
    const preparedItem = {
      ...item,
      menu_name: item.menu_name || '',
      price: item.price || '',
      status: item.status || 'available',
      category_code: item.category_code || '',
      subcategory_code: item.subcategory_code || '',
      image_url: item.image_url || ''
    };
    setCurrentItem(preparedItem);
    setIsEditModalOpen(true);
  };

  return (
    <div className="menu-management-container">
      <Sidebar />
      <main className="menu-management-content">
        <Header title="Menu Management" />
        
        {/* Add a server connection status indicator */}
        {(menuItems.length === 0 && !isLoading && currentView === 'menu') && (
          <div className="server-error-banner">
            <p>Unable to connect to the server. Please check that your backend server is running at: {API_URL}</p>
            <button 
              className="retry-button"
              onClick={fetchData}
            >
              Retry Connection
            </button>
          </div>
        )}

        <div className="view-buttons">
          <button 
            className={`view-button ${currentView === 'menu' ? 'active' : ''}`}
            onClick={() => setCurrentView('menu')}
          >
            Menu Items
          </button>
          <button 
            className={`view-button ${currentView === 'categories' ? 'active' : ''}`}
            onClick={() => setCurrentView('categories')}
          >
            Categories
          </button>
          <button 
            className={`view-button ${currentView === 'subcategories' ? 'active' : ''}`}
            onClick={() => setCurrentView('subcategories')}
          >
            Subcategories
          </button>
        </div>

        {isLoading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            {/* Menu Items View */}
            {currentView === 'menu' && (
              <div className="menu-items-section">
                <div className="section-header">
                  <h2>Menu Items</h2>
                  <div className="action-controls">
                    {/* Add status filter buttons */}
                    <div className="status-filter-buttons">
                      <button 
                        className={`filter-button ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange('all')}
                      >
                        All Items
                      </button>
                      <button 
                        className={`filter-button ${statusFilter === 'available' ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange('available')}
                      >
                        Available
                      </button>
                      <button 
                        className={`filter-button ${statusFilter === 'out_of_stock' ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange('out_of_stock')}
                      >
                        Out of Stock
                      </button>
                    </div>
                    <button 
                      className="add-button"
                      onClick={() => setIsAddModalOpen(true)}
                    >
                      Add New Item
                    </button>
                  </div>
                </div>

                <div className="menu-items-list">
                  <table className="menu-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Subcategory</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Menu items are now sorted by ID in ascending order */}
                      {menuItems
                        .filter(item => statusFilter === 'all' || item.status === statusFilter)
                        .map(item => (
                        <tr key={item.menu_id}>
                          <td>{item.menu_id}</td>
                          <td>
                            <div className="menu-item-image">
                              {getImageSource(item) ? (
                                <img 
                                  src={getImageSource(item)} 
                                  alt={item.menu_name} 
                                  onError={handleImageError}
                                />
                              ) : (
                                <div className="no-image">No Image</div>
                              )}
                            </div>
                          </td>
                          <td>{item.menu_name}</td>
                          <td>LKR {item.price}</td>
                          <td>{item.category_name || getCategoryName(item.category_code)}</td>
                          <td>{item.subcategory_name || getSubcategoryName(item.subcategory_code)}</td>
                          <td>
                            <span 
                              className={`status-badge ${item.status} clickable`}
                              onClick={() => handleToggleStatus(item)}
                              title="Click to toggle status"
                            >
                              {item.status === 'available' ? 'Available' : 'Out of Stock'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="edit-button"
                                onClick={() => prepareItemForEdit(item)} 
                              >
                                Edit
                              </button>
                              <button 
                                className="delete-button"
                                onClick={() => handleDeleteItem(item.menu_id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Categories View */}
            {currentView === 'categories' && (
              <div className="categories-section">
                <div className="section-header">
                  <h2>Categories</h2>
                  <button 
                    className="add-button"
                    onClick={() => setIsAddCategoryModalOpen(true)}
                  >
                    Add Category
                  </button>
                </div>

                <div className="categories-list">
                  <table className="category-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Items Count</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(category => (
                        <tr key={category.category_code}>
                          <td>{category.category_code}</td>
                          <td>{category.category_name}</td>
                          <td>
                            {menuItems.filter(item => item.category_code === category.category_code).length}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="edit-button"
                                onClick={() => {
                                  setCurrentCategory(category);
                                  setIsEditCategoryModalOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="delete-button"
                                onClick={() => handleDeleteCategory(category.category_code)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Subcategories View */}
            {currentView === 'subcategories' && (
              <div className="subcategories-section">
                <div className="section-header">
                  <h2>Subcategories</h2>
                  <button 
                    className="add-button"
                    onClick={() => setIsAddSubcategoryModalOpen(true)}
                  >
                    Add Subcategory
                  </button>
                </div>

                <div className="subcategories-list">
                  <table className="subcategory-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Parent Category</th>
                        <th>Items Count</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subcategories.map(subcategory => (
                        <tr key={subcategory.subcategory_code}>
                          <td>{subcategory.subcategory_code}</td>
                          <td>{subcategory.subcategory_name}</td>
                          <td>{subcategory.category_name || getCategoryName(subcategory.category_code)}</td>
                          <td>
                            {menuItems.filter(item => item.subcategory_code === subcategory.subcategory_code).length}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="edit-button"
                                onClick={() => {
                                  setCurrentSubcategory(subcategory);
                                  setIsEditSubcategoryModalOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="delete-button"
                                onClick={() => handleDeleteSubcategory(subcategory.subcategory_code)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Item Modal */}
        {isAddModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Add New Menu Item</h2>
              
              <div className="form-group">
                <label>Item Name</label>
                <input 
                  type="text" 
                  value={newItem.menu_name}
                  onChange={(e) => setNewItem({...newItem, menu_name: e.target.value})}
                  placeholder="Enter item name"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    placeholder="Enter price"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({...newItem, status: e.target.value})}
                  >
                    <option value="available">Available</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder="Enter item description"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newItem.category_code}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.category_code} value={category.category_code}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Subcategory</label>
                  <select
                    value={newItem.subcategory_code}
                    onChange={(e) => setNewItem({...newItem, subcategory_code: parseInt(e.target.value)})}
                    disabled={!newItem.category_code}
                  >
                    <option value="">Select Subcategory</option>
                    {subcategories
                      .filter(sub => !newItem.category_code || sub.category_code === newItem.category_code)
                      .map(subcategory => (
                        <option key={subcategory.subcategory_code} value={subcategory.subcategory_code}>
                          {subcategory.subcategory_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Image URL</label>
                <input 
                  type="text" 
                  value={newItem.image_url}
                  onChange={(e) => setNewItem({...newItem, image_url: e.target.value})}
                  placeholder="Enter full URL (https://...)"
                />
                <small className="form-hint">Use a complete URL including http:// or https://</small>
              </div>
              
              <div className="modal-buttons">
                <button 
                  className="cancel-button"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleAddItem}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Item Modal */}
        {isEditModalOpen && currentItem && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Edit Menu Item</h2>
              
              <div className="form-group">
                <label>Item Name</label>
                <input 
                  type="text" 
                  value={currentItem.menu_name || ''}
                  onChange={(e) => setCurrentItem({...currentItem, menu_name: e.target.value})}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={currentItem.price || ''}
                    onChange={(e) => setCurrentItem({...currentItem, price: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={currentItem.status || 'available'}
                    onChange={(e) => setCurrentItem({...currentItem, status: e.target.value})}
                  >
                    <option value="available">Available</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                  placeholder="Enter item description"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={currentItem.category_code || ''}
                    onChange={(e) => setCurrentItem({
                      ...currentItem, 
                      category_code: e.target.value ? parseInt(e.target.value) : '',
                      subcategory_code: '' // Reset subcategory when category changes
                    })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.category_code} value={category.category_code}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Subcategory</label>
                  <select
                    value={currentItem.subcategory_code || ''}
                    onChange={(e) => setCurrentItem({
                      ...currentItem, 
                      subcategory_code: e.target.value ? parseInt(e.target.value) : ''
                    })}
                    disabled={!currentItem.category_code}
                  >
                    <option value="">Select Subcategory</option>
                    {subcategories
                      .filter(sub => sub.category_code === currentItem.category_code)
                      .map(subcategory => (
                        <option key={subcategory.subcategory_code} value={subcategory.subcategory_code}>
                          {subcategory.subcategory_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Image URL</label>
                <input 
                  type="text" 
                  value={currentItem.image_url || ''}
                  onChange={(e) => setCurrentItem({...currentItem, image_url: e.target.value})}
                  placeholder="Enter full URL (https://...)"
                />
                <small className="form-hint">Use a complete URL including http:// or https://</small>
              </div>
              
              <div className="modal-buttons">
                <button 
                  className="cancel-button"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleEditItem}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Category Modal */}
        {isAddCategoryModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Add New Category</h2>
              <div className="form-group">
                <label>Category Name</label>
                <input 
                  type="text" 
                  value={newCategory.category_name}
                  onChange={(e) => setNewCategory({...newCategory, category_name: e.target.value})}
                  placeholder="Enter category name"
                />
              </div>
              <div className="modal-buttons">
                <button 
                  className="cancel-button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleAddCategory}
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Category Modal */}
        {isEditCategoryModalOpen && currentCategory && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Edit Category</h2>
              <div className="form-group">
                <label>Category Name</label>
                <input 
                  type="text" 
                  value={currentCategory.category_name}
                  onChange={(e) => setCurrentCategory({...currentCategory, category_name: e.target.value})}
                  placeholder="Enter category name"
                />
              </div>
              <div className="modal-buttons">
                <button 
                  className="cancel-button"
                  onClick={() => setIsEditCategoryModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleEditCategory}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Subcategory Modal */}
        {isAddSubcategoryModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Add New Subcategory</h2>
              <div className="form-group">
                <label>Subcategory Name</label>
                <input 
                  type="text" 
                  value={newSubcategory.subcategory_name}
                  onChange={(e) => setNewSubcategory({...newSubcategory, subcategory_name: e.target.value})}
                  placeholder="Enter subcategory name"
                />
              </div>
              <div className="form-group">
                <label>Parent Category</label>
                <select
                  value={newSubcategory.category_code}
                  onChange={(e) => setNewSubcategory({...newSubcategory, category_code: parseInt(e.target.value)})}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.category_code} value={category.category_code}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-buttons">
                <button 
                  className="cancel-button"
                  onClick={() => setIsAddSubcategoryModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleAddSubcategory}
                >
                  Add Subcategory
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Subcategory Modal */}
        {isEditSubcategoryModalOpen && currentSubcategory && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Edit Subcategory</h2>
              <div className="form-group">
                <label>Subcategory Name</label>
                <input 
                  type="text" 
                  value={currentSubcategory.subcategory_name}
                  onChange={(e) => setCurrentSubcategory({...currentSubcategory, subcategory_name: e.target.value})}
                  placeholder="Enter subcategory name"
                />
              </div>
              <div className="form-group">
                <label>Parent Category</label>
                <select
                  value={currentSubcategory.category_code}
                  onChange={(e) => setCurrentSubcategory({...currentSubcategory, category_code: parseInt(e.target.value)})}
                >
                  {categories.map(category => (
                    <option key={category.category_code} value={category.category_code}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-buttons">
                <button 
                  className="cancel-button"
                  onClick={() => setIsEditSubcategoryModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleEditSubcategory}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MenuManagement;
