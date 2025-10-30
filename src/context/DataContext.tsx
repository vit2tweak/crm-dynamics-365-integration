import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Customer } from '../types/customer';
import { D365Account, D365Contact, D365Opportunity } from '../types/dynamics365';
import { NAVCustomer, NAVItem, NAVSalesOrder } from '../types/nav2017';
import { CosmosProduct, CosmosInventory } from '../types/cosmosdb';
import { dynamics365Service } from '../services/dynamics365Service';
import { nav2017Service } from '../services/nav2017Service';
import { cosmosdbService } from '../services/cosmosdbService';

// Data State Interface
export interface DataState {
  // Dynamics 365 Data
  d365Accounts: D365Account[];
  d365Contacts: D365Contact[];
  d365Opportunities: D365Opportunity[];
  
  // NAV 2017 Data
  navCustomers: NAVCustomer[];
  navItems: NAVItem[];
  navSalesOrders: NAVSalesOrder[];
  
  // Cosmos DB Data
  cosmosProducts: CosmosProduct[];
  cosmosInventory: CosmosInventory[];
  
  // Unified Customer Data
  customers: Customer[];
  
  // Loading States
  loading: {
    d365: boolean;
    nav: boolean;
    cosmos: boolean;
    customers: boolean;
  };
  
  // Error States
  errors: {
    d365: string | null;
    nav: string | null;
    cosmos: string | null;
    customers: string | null;
  };
  
  // Last Updated Timestamps
  lastUpdated: {
    d365: Date | null;
    nav: Date | null;
    cosmos: Date | null;
    customers: Date | null;
  };
}

// Action Types
type DataAction =
  | { type: 'SET_LOADING'; payload: { source: keyof DataState['loading']; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { source: keyof DataState['errors']; error: string | null } }
  | { type: 'SET_D365_ACCOUNTS'; payload: D365Account[] }
  | { type: 'SET_D365_CONTACTS'; payload: D365Contact[] }
  | { type: 'SET_D365_OPPORTUNITIES'; payload: D365Opportunity[] }
  | { type: 'SET_NAV_CUSTOMERS'; payload: NAVCustomer[] }
  | { type: 'SET_NAV_ITEMS'; payload: NAVItem[] }
  | { type: 'SET_NAV_SALES_ORDERS'; payload: NAVSalesOrder[] }
  | { type: 'SET_COSMOS_PRODUCTS'; payload: CosmosProduct[] }
  | { type: 'SET_COSMOS_INVENTORY'; payload: CosmosInventory[] }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'UPDATE_TIMESTAMP'; payload: keyof DataState['lastUpdated'] }
  | { type: 'RESET_DATA' };

// Initial State
const initialState: DataState = {
  d365Accounts: [],
  d365Contacts: [],
  d365Opportunities: [],
  navCustomers: [],
  navItems: [],
  navSalesOrders: [],
  cosmosProducts: [],
  cosmosInventory: [],
  customers: [],
  loading: {
    d365: false,
    nav: false,
    cosmos: false,
    customers: false,
  },
  errors: {
    d365: null,
    nav: null,
    cosmos: null,
    customers: null,
  },
  lastUpdated: {
    d365: null,
    nav: null,
    cosmos: null,
    customers: null,
  },
};

// Reducer
const dataReducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.source]: action.payload.loading,
        },
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.source]: action.payload.error,
        },
      };
    
    case 'SET_D365_ACCOUNTS':
      return {
        ...state,
        d365Accounts: action.payload,
      };
    
    case 'SET_D365_CONTACTS':
      return {
        ...state,
        d365Contacts: action.payload,
      };
    
    case 'SET_D365_OPPORTUNITIES':
      return {
        ...state,
        d365Opportunities: action.payload,
      };
    
    case 'SET_NAV_CUSTOMERS':
      return {
        ...state,
        navCustomers: action.payload,
      };
    
    case 'SET_NAV_ITEMS':
      return {
        ...state,
        navItems: action.payload,
      };
    
    case 'SET_NAV_SALES_ORDERS':
      return {
        ...state,
        navSalesOrders: action.payload,
      };
    
    case 'SET_COSMOS_PRODUCTS':
      return {
        ...state,
        cosmosProducts: action.payload,
      };
    
    case 'SET_COSMOS_INVENTORY':
      return {
        ...state,
        cosmosInventory: action.payload,
      };
    
    case 'SET_CUSTOMERS':
      return {
        ...state,
        customers: action.payload,
      };
    
    case 'UPDATE_TIMESTAMP':
      return {
        ...state,
        lastUpdated: {
          ...state.lastUpdated,
          [action.payload]: new Date(),
        },
      };
    
    case 'RESET_DATA':
      return initialState;
    
    default:
      return state;
  }
};

// Context Interface
export interface DataContextType {
  state: DataState;
  
  // Data Loading Functions
  loadD365Data: () => Promise<void>;
  loadNAVData: () => Promise<void>;
  loadCosmosData: () => Promise<void>;
  loadCustomers: () => Promise<void>;
  loadAllData: () => Promise<void>;
  
  // Data Refresh Functions
  refreshD365Accounts: () => Promise<void>;
  refreshNAVCustomers: () => Promise<void>;
  refreshCosmosProducts: () => Promise<void>;
  
  // Utility Functions
  getCustomerById: (id: string) => Customer | undefined;
  getD365AccountById: (id: string) => D365Account | undefined;
  getNAVCustomerByNo: (no: string) => NAVCustomer | undefined;
  getCosmosProductById: (id: string) => CosmosProduct | undefined;
  
  // Clear Functions
  clearErrors: () => void;
  resetData: () => void;
}

// Create Context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider Props
interface DataProviderProps {
  children: ReactNode;
}

// Data Provider Component
export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // Load Dynamics 365 Data
  const loadD365Data = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'd365', loading: true } });
      dispatch({ type: 'SET_ERROR', payload: { source: 'd365', error: null } });

      const [accounts, contacts, opportunities] = await Promise.all([
        dynamics365Service.getAccounts(),
        dynamics365Service.getContacts(),
        dynamics365Service.getOpportunities(),
      ]);

      dispatch({ type: 'SET_D365_ACCOUNTS', payload: accounts });
      dispatch({ type: 'SET_D365_CONTACTS', payload: contacts });
      dispatch({ type: 'SET_D365_OPPORTUNITIES', payload: opportunities });
      dispatch({ type: 'UPDATE_TIMESTAMP', payload: 'd365' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Dynamics 365 data';
      dispatch({ type: 'SET_ERROR', payload: { source: 'd365', error: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { source: 'd365', loading: false } });
    }
  };

  // Load NAV 2017 Data
  const loadNAVData = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'nav', loading: true } });
      dispatch({ type: 'SET_ERROR', payload: { source: 'nav', error: null } });

      const [customers, items, salesOrders] = await Promise.all([
        nav2017Service.getCustomers(),
        nav2017Service.getItems(),
        nav2017Service.getSalesOrders(),
      ]);

      dispatch({ type: 'SET_NAV_CUSTOMERS', payload: customers });
      dispatch({ type: 'SET_NAV_ITEMS', payload: items });
      dispatch({ type: 'SET_NAV_SALES_ORDERS', payload: salesOrders });
      dispatch({ type: 'UPDATE_TIMESTAMP', payload: 'nav' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load NAV 2017 data';
      dispatch({ type: 'SET_ERROR', payload: { source: 'nav', error: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { source: 'nav', loading: false } });
    }
  };

  // Load Cosmos DB Data
  const loadCosmosData = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'cosmos', loading: true } });
      dispatch({ type: 'SET_ERROR', payload: { source: 'cosmos', error: null } });

      const [products, inventory] = await Promise.all([
        cosmosdbService.getProducts(),
        cosmosdbService.getInventory(),
      ]);

      dispatch({ type: 'SET_COSMOS_PRODUCTS', payload: products });
      dispatch({ type: 'SET_COSMOS_INVENTORY', payload: inventory });
      dispatch({ type: 'UPDATE_TIMESTAMP', payload: 'cosmos' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Cosmos DB data';
      dispatch({ type: 'SET_ERROR', payload: { source: 'cosmos', error: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { source: 'cosmos', loading: false } });
    }
  };

  // Load Unified Customer Data
  const loadCustomers = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'customers', loading: true } });
      dispatch({ type: 'SET_ERROR', payload: { source: 'customers', error: null } });

      // Merge customer data from all sources
      const unifiedCustomers: Customer[] = [];
      
      // Process D365 Accounts
      state.d365Accounts.forEach(account => {
        const customer: Customer = {
          id: account.accountid,
          name: account.name,
          email: account.emailaddress1 || '',
          phone: account.telephone1 || '',
          address: {
            street: account.address1_line1 || '',
            city: account.address1_city || '',
            state: account.address1_stateorprovince || '',
            postalCode: account.address1_postalcode || '',
            country: account.address1_country || '',
          },
          source: 'dynamics365',
          createdAt: new Date(account.createdon),
          updatedAt: new Date(account.modifiedon),
          isActive: account.statecode === 0,
          tags: [],
          customFields: {},
        };
        unifiedCustomers.push(customer);
      });

      dispatch({ type: 'SET_CUSTOMERS', payload: unifiedCustomers });
      dispatch({ type: 'UPDATE_TIMESTAMP', payload: 'customers' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load customer data';
      dispatch({ type: 'SET_ERROR', payload: { source: 'customers', error: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { source: 'customers', loading: false } });
    }
  };

  // Load All Data
  const loadAllData = async (): Promise<void> => {
    await Promise.all([
      loadD365Data(),
      loadNAVData(),
      loadCosmosData(),
    ]);
    await loadCustomers();
  };

  // Refresh Functions
  const refreshD365Accounts = async (): Promise<void> => {
    const accounts = await dynamics365Service.getAccounts();
    dispatch({ type: 'SET_D365_ACCOUNTS', payload: accounts });
    dispatch({ type: 'UPDATE_TIMESTAMP', payload: 'd365' });
  };

  const refreshNAVCustomers = async (): Promise<void> => {
    const customers = await nav2017Service.getCustomers();
    dispatch({ type: 'SET_NAV_CUSTOMERS', payload: customers });
    dispatch({ type: 'UPDATE_TIMESTAMP', payload: 'nav' });
  };

  const refreshCosmosProducts = async (): Promise<void> => {
    const products = await cosmosdbService.getProducts();
    dispatch({ type: 'SET_COSMOS_PRODUCTS', payload: products });
    dispatch({ type: 'UPDATE_TIMESTAMP', payload: 'cosmos' });
  };

  // Utility Functions
  const getCustomerById = (id: string): Customer | undefined => {
    return state.customers.find(customer => customer.id === id);
  };

  const getD365AccountById = (id: string): D365Account | undefined => {
    return state.d365Accounts.find(account => account.accountid === id);
  };

  const getNAVCustomerByNo = (no: string): NAVCustomer | undefined => {
    return state.navCustomers.find(customer => customer.No === no);
  };

  const getCosmosProductById = (id: string): CosmosProduct | undefined => {
    return state.cosmosProducts.find(product => product.id === id);
  };

  // Clear Functions
  const clearErrors = (): void => {
    dispatch({ type: 'SET_ERROR', payload: { source: 'd365', error: null } });
    dispatch({ type: 'SET_ERROR', payload: { source: 'nav', error: null } });
    dispatch({ type: 'SET_ERROR', payload: { source: 'cosmos', error: null } });
    dispatch({ type: 'SET_ERROR', payload: { source: 'customers', error: null } });
  };

  const resetData = (): void => {
    dispatch({ type: 'RESET_DATA' });
  };

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, []);

  const contextValue: DataContextType = {
    state,
    loadD365Data,
    loadNAVData,
    loadCosmosData,
    loadCustomers,
    loadAllData,
    refreshD365Accounts,
    refreshNAVCustomers,
    refreshCosmosProducts,
    getCustomerById,
    getD365AccountById,
    getNAVCustomerByNo,
    getCosmosProductById,
    clearErrors,
    resetData,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Custom Hook
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};