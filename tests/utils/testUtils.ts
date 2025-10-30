import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { SyncProvider } from '../../src/context/SyncContext';
import { Customer } from '../../src/types/customer';
import { D365Account, D365Contact, D365Opportunity } from '../../src/types/dynamics365';
import { NAVCustomer, NAVItem, NAVSalesOrder } from '../../src/types/nav2017';
import { CosmosProduct, CosmosInventory } from '../../src/types/cosmosdb';
import { SyncStatus, SyncOperation } from '../../src/types/index';

// Mock MSAL instance
export const mockMsalInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  acquireTokenSilent: jest.fn(),
  acquireTokenPopup: jest.fn(),
  acquireTokenRedirect: jest.fn(),
  loginPopup: jest.fn(),
  loginRedirect: jest.fn(),
  logout: jest.fn(),
  logoutRedirect: jest.fn(),
  logoutPopup: jest.fn(),
  getAllAccounts: jest.fn().mockReturnValue([]),
  getAccountByHomeId: jest.fn(),
  getAccountByLocalId: jest.fn(),
  getAccountByUsername: jest.fn(),
  setActiveAccount: jest.fn(),
  getActiveAccount: jest.fn(),
  handleRedirectPromise: jest.fn().mockResolvedValue(null),
  getConfiguration: jest.fn(),
  getLogger: jest.fn(),
  setLogger: jest.fn(),
  addEventCallback: jest.fn(),
  removeEventCallback: jest.fn(),
  enableAccountStorageEvents: jest.fn(),
  disableAccountStorageEvents: jest.fn(),
} as unknown as PublicClientApplication;

// Mock data generators
export const createMockCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: '1',
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '+1234567890',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'TS',
    postalCode: '12345',
    country: 'Test Country',
  },
  status: 'active',
  type: 'business',
  industry: 'Technology',
  revenue: 1000000,
  employees: 50,
  website: 'https://test.com',
  source: 'dynamics365',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastContactDate: new Date('2024-01-01'),
  tags: ['test'],
  customFields: {},
  ...overrides,
});

export const createMockD365Account = (overrides: Partial<D365Account> = {}): D365Account => ({
  accountid: '1',
  name: 'Test D365 Account',
  accountnumber: 'ACC001',
  telephone1: '+1234567890',
  emailaddress1: 'test@d365.com',
  websiteurl: 'https://d365test.com',
  address1_line1: '123 D365 St',
  address1_city: 'D365 City',
  address1_stateorprovince: 'D365 State',
  address1_postalcode: '12345',
  address1_country: 'D365 Country',
  industrycode: 1,
  revenue: 1000000,
  numberofemployees: 50,
  statuscode: 1,
  createdon: new Date('2024-01-01').toISOString(),
  modifiedon: new Date('2024-01-01').toISOString(),
  ...overrides,
});

export const createMockD365Opportunity = (overrides: Partial<D365Opportunity> = {}): D365Opportunity => ({
  opportunityid: '1',
  name: 'Test Opportunity',
  description: 'Test opportunity description',
  estimatedvalue: 50000,
  estimatedclosedate: new Date('2024-12-31').toISOString(),
  closeprobability: 75,
  stepname: 'Proposal',
  salesstage: 2,
  statuscode: 1,
  actualvalue: 0,
  actualclosedate: null,
  customerid: '1',
  ownerid: '1',
  createdon: new Date('2024-01-01').toISOString(),
  modifiedon: new Date('2024-01-01').toISOString(),
  ...overrides,
});

export const createMockNAVCustomer = (overrides: Partial<NAVCustomer> = {}): NAVCustomer => ({
  No: 'NAV001',
  Name: 'Test NAV Customer',
  Address: '123 NAV St',
  City: 'NAV City',
  PostCode: '12345',
  CountryRegionCode: 'US',
  PhoneNo: '+1234567890',
  EMail: 'test@nav.com',
  HomePage: 'https://navtest.com',
  CustomerPostingGroup: 'DOMESTIC',
  GenBusPostingGroup: 'DOMESTIC',
  VATBusPostingGroup: 'DOMESTIC',
  PaymentTermsCode: '30 DAYS',
  CurrencyCode: 'USD',
  CreditLimitLCY: 100000,
  Blocked: false,
  LastDateModified: new Date('2024-01-01'),
  ...overrides,
});

export const createMockCosmosProduct = (overrides: Partial<CosmosProduct> = {}): CosmosProduct => ({
  id: '1',
  partitionKey: 'products',
  productNumber: 'PROD001',
  name: 'Test Product',
  description: 'Test product description',
  category: {
    id: '1',
    name: 'Test Category',
    description: 'Test category',
  },
  brand: 'Test Brand',
  manufacturer: 'Test Manufacturer',
  unitPrice: 99.99,
  currency: 'USD',
  weight: 1.5,
  dimensions: {
    length: 10,
    width: 5,
    height: 3,
    unit: 'cm',
  },
  specifications: {},
  images: [],
  tags: ['test'],
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockSyncStatus = (overrides: Partial<SyncStatus> = {}): SyncStatus => ({
  isRunning: false,
  lastSync: new Date('2024-01-01'),
  nextSync: new Date('2024-01-01T01:00:00'),
  status: 'completed',
  progress: 100,
  totalOperations: 10,
  completedOperations: 10,
  failedOperations: 0,
  errors: [],
  ...overrides,
});

// Mock context providers
export const createMockAuthContext = () => ({
  user: {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    roles: ['user'],
  },
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
});

export const createMockDataContext = () => ({
  customers: [
    createMockCustomer({ id: '1', name: 'Customer 1' }),
    createMockCustomer({ id: '2', name: 'Customer 2' }),
    createMockCustomer({ id: '3', name: 'Customer 3' }),
    createMockCustomer({ id: '4', name: 'Customer 4' }),
    createMockCustomer({ id: '5', name: 'Customer 5' }),
  ],
  opportunities: [
    createMockD365Opportunity({ opportunityid: '1', name: 'Opportunity 1' }),
    createMockD365Opportunity({ opportunityid: '2', name: 'Opportunity 2' }),
  ],
  products: [
    createMockCosmosProduct({ id: '1', name: 'Product 1' }),
    createMockCosmosProduct({ id: '2', name: 'Product 2' }),
  ],
  loading: false,
  error: null,
  refreshData: jest.fn(),
});

export const createMockSyncContext = () => ({
  syncStatus: createMockSyncStatus(),
  lastSync: new Date('2024-01-01'),
  isRunning: false,
  error: null,
  startSync: jest.fn(),
  stopSync: jest.fn(),
  getSyncHistory: jest.fn(),
});

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withAuth?: boolean;
  withData?: boolean;
  withSync?: boolean;
  withRouter?: boolean;
  initialEntries?: string[];
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    withAuth = true,
    withData = true,
    withSync = true,
    withRouter = true,
    initialEntries = ['/'],
    ...renderOptions
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let wrappedChildren = children;

    if (withRouter) {
      wrappedChildren = (
        <BrowserRouter>
          {wrappedChildren}
        </BrowserRouter>
      );
    }

    if (withAuth) {
      wrappedChildren = (
        <MsalProvider instance={mockMsalInstance}>
          <AuthProvider>
            {wrappedChildren}
          </AuthProvider>
        </MsalProvider>
      );
    }

    if (withData) {
      wrappedChildren = (
        <DataProvider>
          {wrappedChildren}
        </DataProvider>
      );
    }

    if (withSync) {
      wrappedChildren = (
        <SyncProvider>
          {wrappedChildren}
        </SyncProvider>
      );
    }

    return <>{wrappedChildren}</>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock API responses
export const createMockApiResponse = <T>(data: T, success = true) => ({
  data,
  success,
  message: success ? 'Success' : 'Error',
  timestamp: new Date().toISOString(),
});

// Mock error objects
export const createMockError = (message = 'Test error', code = 'TEST_ERROR') => ({
  message,
  code,
  timestamp: new Date(),
  details: {},
});

// Test data arrays
export const mockCustomers = Array.from({ length: 10 }, (_, i) =>
  createMockCustomer({
    id: `${i + 1}`,
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
  })
);

export const mockOpportunities = Array.from({ length: 5 }, (_, i) =>
  createMockD365Opportunity({
    opportunityid: `${i + 1}`,
    name: `Opportunity ${i + 1}`,
    estimatedvalue: (i + 1) * 10000,
  })
);

export const mockProducts = Array.from({ length: 20 }, (_, i) =>
  createMockCosmosProduct({
    id: `${i + 1}`,
    productNumber: `PROD${String(i + 1).padStart(3, '0')}`,
    name: `Product ${i + 1}`,
    unitPrice: (i + 1) * 10,
  })
);

// Utility functions for tests
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockFormEvent = (value: string) => ({
  target: { value },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
});

export const createMockClickEvent = () => ({
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
});

// Mock localStorage
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock sessionStorage
export const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Setup and teardown helpers
export const setupMockStorage = () => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
  });
};

export const cleanupMocks = () => {
  jest.clearAllMocks();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
  mockSessionStorage.getItem.mockClear();
  mockSessionStorage.setItem.mockClear();
  mockSessionStorage.removeItem.mockClear();
  mockSessionStorage.clear.mockClear();
};

// Mock fetch
export const mockFetch = (response: any, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
  });
};

// Mock console methods
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  
  return () => {
    Object.assign(console, originalConsole);
  };
};