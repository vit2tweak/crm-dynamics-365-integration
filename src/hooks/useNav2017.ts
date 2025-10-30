import { useState, useEffect, useCallback } from 'react';
import { nav2017Service } from '../services/nav2017Service';
import { 
  NAVCustomer, 
  NAVItem, 
  NAVSalesOrder, 
  NAVSalesInvoice,
  NAVQueryOptions,
  NAVError 
} from '../types/nav2017';

export interface UseNav2017State {
  customers: NAVCustomer[];
  items: NAVItem[];
  salesOrders: NAVSalesOrder[];
  salesInvoices: NAVSalesInvoice[];
  loading: boolean;
  error: NAVError | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface UseNav2017Actions {
  // Customer operations
  getCustomers: (options?: NAVQueryOptions) => Promise<NAVCustomer[]>;
  getCustomer: (customerNo: string) => Promise<NAVCustomer | null>;
  createCustomer: (customer: Partial<NAVCustomer>) => Promise<NAVCustomer>;
  updateCustomer: (customerNo: string, updates: Partial<NAVCustomer>) => Promise<NAVCustomer>;
  
  // Item operations
  getItems: (options?: NAVQueryOptions) => Promise<NAVItem[]>;
  getItem: (itemNo: string) => Promise<NAVItem | null>;
  
  // Sales operations
  getSalesOrders: (customerNo?: string, options?: NAVQueryOptions) => Promise<NAVSalesOrder[]>;
  getSalesOrder: (orderNo: string) => Promise<NAVSalesOrder | null>;
  createSalesOrder: (order: Partial<NAVSalesOrder>) => Promise<NAVSalesOrder>;
  
  getSalesInvoices: (customerNo?: string, options?: NAVQueryOptions) => Promise<NAVSalesInvoice[]>;
  getSalesInvoice: (invoiceNo: string) => Promise<NAVSalesInvoice | null>;
  
  // Utility operations
  testConnection: () => Promise<boolean>;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

export interface UseNav2017Return extends UseNav2017State, UseNav2017Actions {}

export const useNav2017 = (): UseNav2017Return => {
  const [state, setState] = useState<UseNav2017State>({
    customers: [],
    items: [],
    salesOrders: [],
    salesInvoices: [],
    loading: false,
    error: null,
    connectionStatus: 'disconnected'
  });

  // Test NAV connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: NAVError | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setConnectionStatus = useCallback((status: 'connected' | 'disconnected' | 'connecting') => {
    setState(prev => ({ ...prev, connectionStatus: status }));
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      const isConnected = await nav2017Service.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      return isConnected;
    } catch (error) {
      console.error('NAV connection test failed:', error);
      setConnectionStatus('disconnected');
      setError(error as NAVError);
      return false;
    }
  }, []);

  const getCustomers = useCallback(async (options?: NAVQueryOptions): Promise<NAVCustomer[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const customers = await nav2017Service.getCustomers(options);
      setState(prev => ({ ...prev, customers }));
      return customers;
    } catch (error) {
      console.error('Failed to fetch NAV customers:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCustomer = useCallback(async (customerNo: string): Promise<NAVCustomer | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const customer = await nav2017Service.getCustomer(customerNo);
      return customer;
    } catch (error) {
      console.error('Failed to fetch NAV customer:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCustomer = useCallback(async (customer: Partial<NAVCustomer>): Promise<NAVCustomer> => {
    try {
      setLoading(true);
      setError(null);
      
      const newCustomer = await nav2017Service.createCustomer(customer);
      setState(prev => ({
        ...prev,
        customers: [...prev.customers, newCustomer]
      }));
      return newCustomer;
    } catch (error) {
      console.error('Failed to create NAV customer:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCustomer = useCallback(async (customerNo: string, updates: Partial<NAVCustomer>): Promise<NAVCustomer> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedCustomer = await nav2017Service.updateCustomer(customerNo, updates);
      setState(prev => ({
        ...prev,
        customers: prev.customers.map(c => 
          c.No === customerNo ? updatedCustomer : c
        )
      }));
      return updatedCustomer;
    } catch (error) {
      console.error('Failed to update NAV customer:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getItems = useCallback(async (options?: NAVQueryOptions): Promise<NAVItem[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const items = await nav2017Service.getItems(options);
      setState(prev => ({ ...prev, items }));
      return items;
    } catch (error) {
      console.error('Failed to fetch NAV items:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getItem = useCallback(async (itemNo: string): Promise<NAVItem | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const item = await nav2017Service.getItem(itemNo);
      return item;
    } catch (error) {
      console.error('Failed to fetch NAV item:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSalesOrders = useCallback(async (customerNo?: string, options?: NAVQueryOptions): Promise<NAVSalesOrder[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const salesOrders = await nav2017Service.getSalesOrders(customerNo, options);
      setState(prev => ({ ...prev, salesOrders }));
      return salesOrders;
    } catch (error) {
      console.error('Failed to fetch NAV sales orders:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSalesOrder = useCallback(async (orderNo: string): Promise<NAVSalesOrder | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const salesOrder = await nav2017Service.getSalesOrder(orderNo);
      return salesOrder;
    } catch (error) {
      console.error('Failed to fetch NAV sales order:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSalesOrder = useCallback(async (order: Partial<NAVSalesOrder>): Promise<NAVSalesOrder> => {
    try {
      setLoading(true);
      setError(null);
      
      const newOrder = await nav2017Service.createSalesOrder(order);
      setState(prev => ({
        ...prev,
        salesOrders: [...prev.salesOrders, newOrder]
      }));
      return newOrder;
    } catch (error) {
      console.error('Failed to create NAV sales order:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSalesInvoices = useCallback(async (customerNo?: string, options?: NAVQueryOptions): Promise<NAVSalesInvoice[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const salesInvoices = await nav2017Service.getSalesInvoices(customerNo, options);
      setState(prev => ({ ...prev, salesInvoices }));
      return salesInvoices;
    } catch (error) {
      console.error('Failed to fetch NAV sales invoices:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSalesInvoice = useCallback(async (invoiceNo: string): Promise<NAVSalesInvoice | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const salesInvoice = await nav2017Service.getSalesInvoice(invoiceNo);
      return salesInvoice;
    } catch (error) {
      console.error('Failed to fetch NAV sales invoice:', error);
      const navError = error as NAVError;
      setError(navError);
      throw navError;
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
        getCustomers(),
        getItems(),
        getSalesOrders(),
        getSalesInvoices()
      ]);
    } catch (error) {
      console.error('Failed to refresh NAV data:', error);
      setError(error as NAVError);
    } finally {
      setLoading(false);
    }
  }, [getCustomers, getItems, getSalesOrders, getSalesInvoices]);

  return {
    ...state,
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    getItems,
    getItem,
    getSalesOrders,
    getSalesOrder,
    createSalesOrder,
    getSalesInvoices,
    getSalesInvoice,
    testConnection,
    clearError,
    refreshData
  };
};

export default useNav2017;