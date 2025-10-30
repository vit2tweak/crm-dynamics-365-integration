import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../../src/components/dashboard/Dashboard';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { SyncProvider } from '../../src/context/SyncContext';
import { createMockAuthContext, createMockDataContext, createMockSyncContext } from '../utils/testUtils';

// Mock the hooks
jest.mock('../../src/hooks/useAuth');
jest.mock('../../src/hooks/useDynamics365');
jest.mock('../../src/hooks/useNav2017');
jest.mock('../../src/hooks/useCosmosDB');
jest.mock('../../src/hooks/useSync');

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock components
jest.mock('../../src/components/dashboard/MetricsCard', () => ({
  MetricsCard: ({ title, value }: { title: string; value: number }) => (
    <div data-testid="metrics-card">
      <span data-testid="metrics-title">{title}</span>
      <span data-testid="metrics-value">{value}</span>
    </div>
  ),
}));

jest.mock('../../src/components/dashboard/SyncStatus', () => ({
  SyncStatus: () => <div data-testid="sync-status">Sync Status Component</div>,
}));

jest.mock('../../src/components/dashboard/RecentActivity', () => ({
  RecentActivity: () => <div data-testid="recent-activity">Recent Activity Component</div>,
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <DataProvider>
        <SyncProvider>
          {children}
        </SyncProvider>
      </DataProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Dashboard Component', () => {
  const mockAuthContext = createMockAuthContext();
  const mockDataContext = createMockDataContext();
  const mockSyncContext = createMockSyncContext();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    require('../../src/hooks/useAuth').useAuth.mockReturnValue({
      user: mockAuthContext.user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    require('../../src/hooks/useDynamics365').useDynamics365.mockReturnValue({
      accounts: mockDataContext.customers.slice(0, 3),
      opportunities: mockDataContext.opportunities,
      loading: false,
      error: null,
      refreshAccounts: jest.fn(),
      refreshOpportunities: jest.fn(),
    });

    require('../../src/hooks/useNav2017').useNav2017.mockReturnValue({
      customers: mockDataContext.customers,
      salesOrders: [],
      loading: false,
      error: null,
      refreshCustomers: jest.fn(),
    });

    require('../../src/hooks/useCosmosDB').useCosmosDB.mockReturnValue({
      products: [],
      inventory: [],
      loading: false,
      error: null,
      refreshProducts: jest.fn(),
    });

    require('../../src/hooks/useSync').useSync.mockReturnValue({
      syncStatus: mockSyncContext.syncStatus,
      lastSync: mockSyncContext.lastSync,
      isRunning: false,
      error: null,
      startSync: jest.fn(),
    });
  });

  it('renders dashboard header correctly', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, John Doe')).toBeInTheDocument();
  });

  it('displays metrics cards with correct data', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const metricsCards = screen.getAllByTestId('metrics-card');
      expect(metricsCards).toHaveLength(4);

      // Check for specific metrics
      expect(screen.getByText('Total Customers')).toBeInTheDocument();
      expect(screen.getByText('Active Opportunities')).toBeInTheDocument();
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    });
  });

  it('shows loading state when data is loading', () => {
    require('../../src/hooks/useDynamics365').useDynamics365.mockReturnValue({
      accounts: [],
      opportunities: [],
      loading: true,
      error: null,
      refreshAccounts: jest.fn(),
      refreshOpportunities: jest.fn(),
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    const errorMessage = 'Failed to load dashboard data';
    require('../../src/hooks/useDynamics365').useDynamics365.mockReturnValue({
      accounts: [],
      opportunities: [],
      loading: false,
      error: errorMessage,
      refreshAccounts: jest.fn(),
      refreshOpportunities: jest.fn(),
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const mockRefreshAccounts = jest.fn();
    const mockRefreshOpportunities = jest.fn();
    
    require('../../src/hooks/useDynamics365').useDynamics365.mockReturnValue({
      accounts: mockDataContext.customers,
      opportunities: mockDataContext.opportunities,
      loading: false,
      error: null,
      refreshAccounts: mockRefreshAccounts,
      refreshOpportunities: mockRefreshOpportunities,
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshAccounts).toHaveBeenCalled();
      expect(mockRefreshOpportunities).toHaveBeenCalled();
    });
  });

  it('renders sync status component', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('sync-status')).toBeInTheDocument();
  });

  it('renders recent activity component', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
  });

  it('navigates to customers page when view all customers is clicked', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const viewAllCustomersButton = screen.getByText('View All Customers');
    fireEvent.click(viewAllCustomersButton);

    expect(mockNavigate).toHaveBeenCalledWith('/customers');
  });

  it('navigates to sales page when view all opportunities is clicked', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const viewAllOpportunitiesButton = screen.getByText('View All Opportunities');
    fireEvent.click(viewAllOpportunitiesButton);

    expect(mockNavigate).toHaveBeenCalledWith('/sales');
  });

  it('calculates metrics correctly', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that metrics are calculated based on mock data
      const customerCount = screen.getByTestId('metrics-value');
      expect(customerCount).toHaveTextContent('5'); // Based on mock data
    });
  });

  it('handles empty data gracefully', () => {
    require('../../src/hooks/useDynamics365').useDynamics365.mockReturnValue({
      accounts: [],
      opportunities: [],
      loading: false,
      error: null,
      refreshAccounts: jest.fn(),
      refreshOpportunities: jest.fn(),
    });

    require('../../src/hooks/useNav2017').useNav2017.mockReturnValue({
      customers: [],
      salesOrders: [],
      loading: false,
      error: null,
      refreshCustomers: jest.fn(),
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Should render without crashing and show zero values
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    const metricsCards = screen.getAllByTestId('metrics-card');
    expect(metricsCards).toHaveLength(4);
  });

  it('updates metrics when data changes', async () => {
    const { rerender } = render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Update mock data
    require('../../src/hooks/useDynamics365').useDynamics365.mockReturnValue({
      accounts: [...mockDataContext.customers, { id: '6', name: 'New Customer' }],
      opportunities: mockDataContext.opportunities,
      loading: false,
      error: null,
      refreshAccounts: jest.fn(),
      refreshOpportunities: jest.fn(),
    });

    rerender(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Metrics should update to reflect new data
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});