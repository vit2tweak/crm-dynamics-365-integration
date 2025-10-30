import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../context/DataContext';
import { useSync } from '../../context/SyncContext';
import { MetricsCard } from './MetricsCard';
import { SyncStatus } from './SyncStatus';
import { RecentActivity } from './RecentActivity';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';
import '../../styles/dashboard.css';

interface DashboardMetrics {
  totalCustomers: number;
  activeOpportunities: number;
  totalRevenue: number;
  conversionRate: number;
  monthlyGrowth: number;
  pendingSyncs: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { customers, opportunities, loading: dataLoading, error: dataError } = useData();
  const { syncStatus, lastSync, isLoading: syncLoading } = useSync();
  
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCustomers: 0,
    activeOpportunities: 0,
    totalRevenue: 0,
    conversionRate: 0,
    monthlyGrowth: 0,
    pendingSyncs: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const calculateMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate metrics from available data
        const totalCustomers = customers?.length || 0;
        const activeOpportunities = opportunities?.filter(opp => 
          opp.statecode === 0 && opp.statuscode === 1
        ).length || 0;

        const totalRevenue = opportunities?.reduce((sum, opp) => 
          sum + (opp.estimatedvalue || 0), 0
        ) || 0;

        const closedOpportunities = opportunities?.filter(opp => 
          opp.statecode === 1
        ).length || 0;
        const wonOpportunities = opportunities?.filter(opp => 
          opp.statecode === 1 && opp.statuscode === 3
        ).length || 0;
        const conversionRate = closedOpportunities > 0 ? 
          (wonOpportunities / closedOpportunities) * 100 : 0;

        // Calculate monthly growth (mock calculation)
        const monthlyGrowth = Math.random() * 20 - 5; // -5% to +15%

        const pendingSyncs = syncStatus?.pendingOperations || 0;

        setMetrics({
          totalCustomers,
          activeOpportunities,
          totalRevenue,
          conversionRate,
          monthlyGrowth,
          pendingSyncs
        });
      } catch (err) {
        console.error('Error calculating dashboard metrics:', err);
        setError('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    if (!dataLoading) {
      calculateMetrics();
    }
  }, [customers, opportunities, dataLoading, syncStatus]);

  const handleNavigateToCustomers = () => {
    navigate('/customers');
  };

  const handleNavigateToSales = () => {
    navigate('/sales');
  };

  const handleNavigateToSync = () => {
    navigate('/integration/sync');
  };

  if (loading || dataLoading) {
    return (
      <div className="dashboard-loading">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  if (error || dataError) {
    return (
      <div className="dashboard-error">
        <div className="error-message">
          <h2>Dashboard Error</h2>
          <p>{error || dataError}</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>CRM Dashboard</h1>
            <p>Welcome back, {user?.name || 'User'}</p>
          </div>
          <div className="dashboard-actions">
            <button 
              className="btn btn-outline"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleNavigateToSync}
            >
              Sync Now
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Key Metrics */}
          <section className="metrics-section">
            <h2>Key Metrics</h2>
            <div className="metrics-grid">
              <MetricsCard
                title="Total Customers"
                value={metrics.totalCustomers}
                icon="👥"
                trend={metrics.monthlyGrowth > 0 ? 'up' : 'down'}
                trendValue={Math.abs(metrics.monthlyGrowth)}
                onClick={handleNavigateToCustomers}
              />
              <MetricsCard
                title="Active Opportunities"
                value={metrics.activeOpportunities}
                icon="💼"
                trend="up"
                trendValue={12.5}
                onClick={handleNavigateToSales}
              />
              <MetricsCard
                title="Total Revenue"
                value={metrics.totalRevenue}
                format="currency"
                icon="💰"
                trend={metrics.totalRevenue > 0 ? 'up' : 'neutral'}
                trendValue={8.3}
                onClick={handleNavigateToSales}
              />
              <MetricsCard
                title="Conversion Rate"
                value={metrics.conversionRate}
                format="percentage"
                icon="📈"
                trend={metrics.conversionRate > 50 ? 'up' : 'down'}
                trendValue={metrics.conversionRate}
                onClick={handleNavigateToSales}
              />
            </div>
          </section>

          {/* Sync Status and Recent Activity */}
          <div className="dashboard-grid">
            <section className="sync-section">
              <SyncStatus
                status={syncStatus}
                lastSync={lastSync}
                pendingOperations={metrics.pendingSyncs}
                isLoading={syncLoading}
                onSyncNow={handleNavigateToSync}
              />
            </section>

            <section className="activity-section">
              <RecentActivity
                customers={customers?.slice(0, 5) || []}
                opportunities={opportunities?.slice(0, 5) || []}
                onViewAll={() => navigate('/activity')}
              />
            </section>
          </div>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <h2>Quick Actions</h2>
            <div className="quick-actions-grid">
              <div 
                className="quick-action-card"
                onClick={() => navigate('/customers/new')}
              >
                <div className="quick-action-icon">👤</div>
                <h3>Add Customer</h3>
                <p>Create a new customer record</p>
              </div>
              <div 
                className="quick-action-card"
                onClick={() => navigate('/sales/opportunities/new')}
              >
                <div className="quick-action-icon">🎯</div>
                <h3>New Opportunity</h3>
                <p>Track a new sales opportunity</p>
              </div>
              <div 
                className="quick-action-card"
                onClick={() => navigate('/reports')}
              >
                <div className="quick-action-icon">📊</div>
                <h3>View Reports</h3>
                <p>Access detailed analytics</p>
              </div>
              <div 
                className="quick-action-card"
                onClick={() => navigate('/integration')}
              >
                <div className="quick-action-icon">🔄</div>
                <h3>Integration</h3>
                <p>Manage system integrations</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;