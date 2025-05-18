import axios from 'axios';

// Fix the process.env reference by using a hardcoded URL
const API_URL = 'http://localhost:5000/api';

// ==================== Ingredients API ====================
export const getAllIngredients = async () => {
  try {
    const response = await axios.get(`${API_URL}/inventory/ingredients`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    throw error;
  }
};

export const getIngredientById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/inventory/ingredients/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ingredient ${id}:`, error);
    throw error;
  }
};

export const createIngredient = async (ingredientData) => {
  try {
    const response = await axios.post(`${API_URL}/inventory/ingredients`, ingredientData);
    return response.data;
  } catch (error) {
    console.error('Error creating ingredient:', error);
    throw error;
  }
};

export const updateIngredient = async (id, ingredientData) => {
  try {
    const response = await axios.put(`${API_URL}/inventory/ingredients/${id}`, ingredientData);
    return response.data;
  } catch (error) {
    console.error(`Error updating ingredient ${id}:`, error);
    throw error;
  }
};

export const deleteIngredient = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/inventory/ingredients/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting ingredient ${id}:`, error);
    throw error;
  }
};

// ==================== Suppliers API ====================
export const getAllSuppliers = async () => {
  try {
    const response = await axios.get(`${API_URL}/inventory/suppliers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

export const getSupplierById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/inventory/suppliers/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching supplier ${id}:`, error);
    throw error;
  }
};

export const createSupplier = async (supplierData) => {
  try {
    const response = await axios.post(`${API_URL}/inventory/suppliers`, supplierData);
    return response.data;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (id, supplierData) => {
  try {
    const response = await axios.put(`${API_URL}/inventory/suppliers/${id}`, supplierData);
    return response.data;
  } catch (error) {
    console.error(`Error updating supplier ${id}:`, error);
    throw error;
  }
};

export const deleteSupplier = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/inventory/suppliers/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting supplier ${id}:`, error);
    throw error;
  }
};

// ==================== Purchases API ====================
export const getAllPurchases = async () => {
  try {
    const response = await axios.get(`${API_URL}/inventory/purchases`);
    return response.data;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
};

export const getPurchaseById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/inventory/purchases/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching purchase ${id}:`, error);
    throw error;
  }
};

export const createPurchase = async (purchaseData) => {
  try {
    const response = await axios.post(`${API_URL}/inventory/purchases`, purchaseData);
    return response.data;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};

export const updatePurchase = async (id, purchaseData) => {
  try {
    const response = await axios.put(`${API_URL}/inventory/purchases/${id}`, purchaseData);
    return response.data;
  } catch (error) {
    console.error(`Error updating purchase ${id}:`, error);
    throw error;
  }
};

export const deletePurchase = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/inventory/purchases/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting purchase ${id}:`, error);
    throw error;
  }
};
