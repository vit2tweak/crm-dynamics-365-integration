import { useState, useEffect, useCallback } from 'react';
import { cosmosdbService } from '../services/cosmosdbService';
import { 
  CosmosProduct, 
  CosmosInventory, 
  CosmosCategory, 
  CosmosSupplier,
  CosmosQueryOptions,
  CosmosError 
} from '../types/cosmosdb';

export interface UseCosmosDBState {
  products: CosmosProduct[];
  inventory: CosmosInventory[];
  categories: CosmosCategory[];
  suppliers: CosmosSupplier[];
  loading: boolean;
  error: CosmosError | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  totalProducts: number;
  totalInventoryItems: number;
}

export interface UseCosmosDBActions {
  // Product operations
  getProducts: (options?: CosmosQueryOptions) => Promise<CosmosProduct[]>;
  getProduct: (id: string, partitionKey?: string) => Promise<CosmosProduct | null>;
  createProduct: (product: Omit<CosmosProduct, 'id'>) => Promise<CosmosProduct>;
  updateProduct: (id: string, updates: Partial<CosmosProduct>, partitionKey?: string) => Promise<CosmosProduct>;
  deleteProduct: (id: string, partitionKey?: string) => Promise<void>;
  searchProducts: (searchTerm: string, options?: CosmosQueryOptions) => Promise<CosmosProduct[]>;
  
  // Inventory operations
  getInventory: (options?: CosmosQueryOptions) => Promise<CosmosInventory[]>;
  getInventoryByProduct: (productId: string) => Promise<CosmosInventory[]>;
  updateInventory: (id: string, updates: Partial<CosmosInventory>, partitionKey?: string) => Promise<CosmosInventory>;
  getLowStockItems: (threshold?: number) => Promise<CosmosInventory[]>;
  
  // Category operations
  getCategories: (options?: CosmosQueryOptions) => Promise<CosmosCategory[]>;
  getCategory: (id: string, partitionKey?: string) => Promise<CosmosCategory | null>;
  createCategory: (category: Omit<CosmosCategory, 'id'>) => Promise<CosmosCategory>;
  updateCategory: (id: string, updates: Partial<CosmosCategory>, partitionKey?: string) => Promise<CosmosCategory>;
  
  // Supplier operations
  getSuppliers: (options?: CosmosQueryOptions) => Promise<CosmosSupplier[]>;
  getSupplier: (id: string, partitionKey?: string) => Promise<CosmosSupplier | null>;
  createSupplier: (supplier: Omit<CosmosSupplier, 'id'>) => Promise<CosmosSupplier>;
  updateSupplier: (id: string, updates: Partial<CosmosSupplier>, partitionKey?: string) => Promise<CosmosSupplier>;
  
  // Utility operations
  testConnection: () => Promise<boolean>;
  clearError: () => void;
  refreshData: () => Promise<void>;
  getMetrics: () => Promise<{ totalProducts: number; totalInventoryItems: number; lowStockCount: number }>;
}

export interface UseCosmosDBReturn extends UseCosmosDBState, UseCosmosDBActions {}

export const useCosmosDB = (): UseCosmosDBReturn => {
  const [state, setState] = useState<UseCosmosDBState>({
    products: [],
    inventory: [],
    categories: [],
    suppliers: [],
    loading: false,
    error: null,
    connectionStatus: 'disconnected',
    totalProducts: 0,
    totalInventoryItems: 0
  });

  // Test Cosmos DB connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: CosmosError | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setConnectionStatus = useCallback((status: 'connected' | 'disconnected' | 'connecting') => {
    setState(prev => ({ ...prev, connectionStatus: status }));
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      const isConnected = await cosmosdbService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      return isConnected;
    } catch (error) {
      console.error('Cosmos DB connection test failed:', error);
      setConnectionStatus('disconnected');
      setError(error as CosmosError);
      return false;
    }
  }, []);

  const getProducts = useCallback(async (options?: CosmosQueryOptions): Promise<CosmosProduct[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const products = await cosmosdbService.getProducts(options);
      setState(prev => ({ ...prev, products, totalProducts: products.length }));
      return products;
    } catch (error) {
      console.error('Failed to fetch products from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProduct = useCallback(async (id: string, partitionKey?: string): Promise<CosmosProduct | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const product = await cosmosdbService.getProduct(id, partitionKey);
      return product;
    } catch (error) {
      console.error('Failed to fetch product from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = useCallback(async (product: Omit<CosmosProduct, 'id'>): Promise<CosmosProduct> => {
    try {
      setLoading(true);
      setError(null);
      
      const newProduct = await cosmosdbService.createProduct(product);
      setState(prev => ({
        ...prev,
        products: [...prev.products, newProduct],
        totalProducts: prev.totalProducts + 1
      }));
      return newProduct;
    } catch (error) {
      console.error('Failed to create product in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<CosmosProduct>, partitionKey?: string): Promise<CosmosProduct> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedProduct = await cosmosdbService.updateProduct(id, updates, partitionKey);
      setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === id ? updatedProduct : p)
      }));
      return updatedProduct;
    } catch (error) {
      console.error('Failed to update product in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string, partitionKey?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await cosmosdbService.deleteProduct(id, partitionKey);
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id),
        totalProducts: prev.totalProducts - 1
      }));
    } catch (error) {
      console.error('Failed to delete product from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchProducts = useCallback(async (searchTerm: string, options?: CosmosQueryOptions): Promise<CosmosProduct[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const products = await cosmosdbService.searchProducts(searchTerm, options);
      return products;
    } catch (error) {
      console.error('Failed to search products in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getInventory = useCallback(async (options?: CosmosQueryOptions): Promise<CosmosInventory[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const inventory = await cosmosdbService.getInventory(options);
      setState(prev => ({ ...prev, inventory, totalInventoryItems: inventory.length }));
      return inventory;
    } catch (error) {
      console.error('Failed to fetch inventory from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getInventoryByProduct = useCallback(async (productId: string): Promise<CosmosInventory[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const inventory = await cosmosdbService.getInventoryByProduct(productId);
      return inventory;
    } catch (error) {
      console.error('Failed to fetch product inventory from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInventory = useCallback(async (id: string, updates: Partial<CosmosInventory>, partitionKey?: string): Promise<CosmosInventory> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedInventory = await cosmosdbService.updateInventory(id, updates, partitionKey);
      setState(prev => ({
        ...prev,
        inventory: prev.inventory.map(i => i.id === id ? updatedInventory : i)
      }));
      return updatedInventory;
    } catch (error) {
      console.error('Failed to update inventory in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLowStockItems = useCallback(async (threshold: number = 10): Promise<CosmosInventory[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const lowStockItems = await cosmosdbService.getLowStockItems(threshold);
      return lowStockItems;
    } catch (error) {
      console.error('Failed to fetch low stock items from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategories = useCallback(async (options?: CosmosQueryOptions): Promise<CosmosCategory[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const categories = await cosmosdbService.getCategories(options);
      setState(prev => ({ ...prev, categories }));
      return categories;
    } catch (error) {
      console.error('Failed to fetch categories from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategory = useCallback(async (id: string, partitionKey?: string): Promise<CosmosCategory | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const category = await cosmosdbService.getCategory(id, partitionKey);
      return category;
    } catch (error) {
      console.error('Failed to fetch category from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (category: Omit<CosmosCategory, 'id'>): Promise<CosmosCategory> => {
    try {
      setLoading(true);
      setError(null);
      
      const newCategory = await cosmosdbService.createCategory(category);
      setState(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }));
      return newCategory;
    } catch (error) {
      console.error('Failed to create category in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<CosmosCategory>, partitionKey?: string): Promise<CosmosCategory> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedCategory = await cosmosdbService.updateCategory(id, updates, partitionKey);
      setState(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id === id ? updatedCategory : c)
      }));
      return updatedCategory;
    } catch (error) {
      console.error('Failed to update category in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSuppliers = useCallback(async (options?: CosmosQueryOptions): Promise<CosmosSupplier[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const suppliers = await cosmosdbService.getSuppliers(options);
      setState(prev => ({ ...prev, suppliers }));
      return suppliers;
    } catch (error) {
      console.error('Failed to fetch suppliers from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSupplier = useCallback(async (id: string, partitionKey?: string): Promise<CosmosSupplier | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const supplier = await cosmosdbService.getSupplier(id, partitionKey);
      return supplier;
    } catch (error) {
      console.error('Failed to fetch supplier from Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSupplier = useCallback(async (supplier: Omit<CosmosSupplier, 'id'>): Promise<CosmosSupplier> => {
    try {
      setLoading(true);
      setError(null);
      
      const newSupplier = await cosmosdbService.createSupplier(supplier);
      setState(prev => ({
        ...prev,
        suppliers: [...prev.suppliers, newSupplier]
      }));
      return newSupplier;
    } catch (error) {
      console.error('Failed to create supplier in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSupplier = useCallback(async (id: string, updates: Partial<CosmosSupplier>, partitionKey?: string): Promise<CosmosSupplier> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedSupplier = await cosmosdbService.updateSupplier(id, updates, partitionKey);
      setState(prev => ({
        ...prev,
        suppliers: prev.suppliers.map(s => s.id === id ? updatedSupplier : s)
      }));
      return updatedSupplier;
    } catch (error) {
      console.error('Failed to update supplier in Cosmos DB:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        getProducts(),
        getInventory(),
        getCategories(),
        getSuppliers()
      ]);
    } catch (error) {
      console.error('Failed to refresh Cosmos DB data:', error);
      setError(error as CosmosError);
    } finally {
      setLoading(false);
    }
  }, [getProducts, getInventory, getCategories, getSuppliers]);

  const getMetrics = useCallback(async (): Promise<{ totalProducts: number; totalInventoryItems: number; lowStockCount: number }> => {
    try {
      setLoading(true);
      setError(null);
      
      const [products, inventory, lowStockItems] = await Promise.all([
        cosmosdbService.getProducts(),
        cosmosdbService.getInventory(),
        cosmosdbService.getLowStockItems()
      ]);
      
      return {
        totalProducts: products.length,
        totalInventoryItems: inventory.length,
        lowStockCount: lowStockItems.length
      };
    } catch (error) {
      console.error('Failed to fetch Cosmos DB metrics:', error);
      const cosmosError = error as CosmosError;
      setError(cosmosError);
      throw cosmosError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ...state,
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getInventory,
    getInventoryByProduct,
    updateInventory,
    getLowStockItems,
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    getSuppliers