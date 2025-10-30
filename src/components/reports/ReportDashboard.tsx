import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useDynamics365 } from '../../hooks/useDynamics365';
import { useNav2017 } from '../../hooks/useNav2017';
import { useCosmosDB } from '../../hooks/useCosmosDB';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatUtils';
import { formatDate, getDateRange, DateRangeType } from '../../utils/dateUtils';
import '../../styles/dashboard.css';

interface ReportMetric {
  id: string;
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'customers' | 'products' | 'integration';
  lastRun?: Date;
  isScheduled: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

interface ReportFilters {
  dateRange: DateRangeType;
  customStartDate?: Date;
  customEndDate?: Date;
  salesRep?: string;
  customerSegment?: string;
  productCategory?: string;
}

export const ReportDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { customers } = useData();
  const { opportunities, accounts, loading: d365Loading } = useDynamics365();
  const { salesOrders, items, loading: navLoading } = useNav2017();
  const { products, inventory, loading: cosmosLoading } = useCosmosDB();

  const [selectedFilters, setSelectedFilters] = useState<ReportFilters>({
    dateRange: 'thisMonth'
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'scheduled'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate key metrics
  const metrics = useMemo((): ReportMetric[] => {
    if (d365Loading || navLoading || cosmosLoading) return [];

    const dateRange = getDateRange(selectedFilters.dateRange, selectedFilters.customStartDate, selectedFilters.customEndDate);
    
    // Filter data by date range
    const filteredOpportunities = opportunities.filter(opp => {
      const createdDate = new Date(opp.createdon);
      return createdDate >= dateRange.start && createdDate <= dateRange.end;
    });

    const filteredOrders = salesOrders.filter(order => {
      const orderDate = new Date(order.OrderDate);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });

    // Calculate metrics
    const totalRevenue = filteredOpportunities
      .filter(opp => opp.statecode === 1) // Won opportunities
      .reduce((sum, opp) => sum + (opp.estimatedvalue || 0), 0);

    const totalOpportunities = filteredOpportunities.length;
    const wonOpportunities = filteredOpportunities.filter(opp => opp.statecode === 1).length;
    const winRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0;

    const totalOrders = filteredOrders.length;
    const orderValue = filteredOrders.reduce((sum, order) => sum + order.Amount, 0);

    const activeCustomers = customers.filter(customer => customer.isActive).length;

    return [
      {
        id: 'revenue',
        title: 'Total Revenue',
        value: totalRevenue,
        format: 'currency',
        change: 12.5,
        changeType: 'increase',
        icon: '💰'
      },
      {
        id: 'opportunities',
        title: 'Opportunities',
        value: totalOpportunities,
        format: 'number',
        change: 8.2,
        changeType: 'increase',
        icon: '🎯'
      },
      {
        id: 'winRate',
        title: 'Win Rate',
        value: winRate,
        format: 'percentage',
        change: -2.1,
        changeType: 'decrease',
        icon: '📈'
      },
      {
        id: 'orders',
        title: 'Sales Orders',
        value: totalOrders,
        format: 'number',
        change: 15.3,
        changeType: 'increase',
        icon: '📋'
      },
      {
        id: 'orderValue',
        title: 'Order Value',
        value: orderValue,
        format: 'currency',
        change: 7.8,
        changeType: 'increase',
        icon: '💵'
      },
      {
        id: 'customers',
        title: 'Active Customers',
        value: activeCustomers,
        format: 'number',
        change: 3.4,
        changeType: 'increase',
        icon: '👥'
      }
    ];
  }, [opportunities, salesOrders, customers, selectedFilters, d365Loading, navLoading, cosmosLoading]);

  // Report templates
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'sales-performance',
      name: 'Sales Performance Report',
      description: 'Comprehensive sales metrics including revenue, opportunities, and win rates',
      category: 'sales',
      lastRun: new Date('2024-01-15'),
      isScheduled: true,
      frequency: 'weekly'
    },
    {
      id: 'customer-analysis',
      name: 'Customer Analysis Report',
      description: '360-degree customer insights with segmentation and behavior analysis',
      category: 'customers',
      lastRun: new Date('2024-01-14'),
      isScheduled: true,
      frequency: 'monthly'
    },
    {
      id: 'product-performance',
      name: 'Product Performance Report',
      description: 'Product sales, inventory levels, and profitability analysis',
      category: 'products',
      lastRun: new Date('2024-01-13'),
      isScheduled: false
    },
    {
      id: 'integration-health',
      name: 'Integration Health Report',
      description: 'System integration status, sync performance, and error analysis',
      category: 'integration',
      lastRun: new Date('2024-01-15'),
      isScheduled: true,
      frequency: 'daily'
    },
    {
      id: 'executive-summary',
      name: 'Executive Summary',
      description: 'High-level business metrics and KPIs for executive review',
      category: 'sales',
      lastRun: new Date('2024-01-12'),
      isScheduled: true,
      frequency: 'weekly'
    }
  ];

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setSelectedFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRunReport = async (templateId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Navigate to custom report builder with template
      navigate(`/reports/builder?template=${templateId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (templateId: string) => {
    navigate(`/reports/viewer?template=${templateId}`);
  };

  const formatMetricValue = (metric: ReportMetric): string => {
    switch (metric.format) {
      case 'currency':
        return formatCurrency(metric.value);
      case 'percentage':
        return formatPercentage(metric.value);
      default:
        return formatNumber(metric.value);
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'sales': return '📊';
      case 'customers': return '👥';
      case 'products': return '📦';
      case 'integration': return '🔄';
      default: return '📋';
    }
  };

  const isLoading = d365Loading || navLoading || cosmosLoading || loading;

  return (
    <div className="report-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Reports & Analytics</h1>
          <p>Comprehensive business intelligence and reporting dashboard</p>
        </div>
        <div className="header-actions">
          <Link to="/reports/builder" className="btn btn-primary">
            Create Custom Report
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Date Range</label>
            <select
              value={selectedFilters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value as DateRangeType)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisWeek">This Week</option>
              <option value="lastWeek">Last Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="lastQuarter">Last Quarter</option>
              <option value="thisYear">This Year</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {selectedFilters.dateRange === 'custom' && (
            <>
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={selectedFilters.customStartDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleFilterChange('customStartDate', new Date(e.target.value))}
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={selectedFilters.customEndDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleFilterChange('customEndDate', new Date(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Report Templates
          </button>
          <button
            className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            Scheduled Reports
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner size="large" text="Loading reports data..." />
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              <div className="metrics-grid">
                {metrics.map(metric => (
                  <div key={metric.id} className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon">{metric.icon}</span>
                      <h3>{metric.title}</h3>
                    </div>
                    <div className="metric-value">
                      {formatMetricValue(metric)}
                    </div>
                    {metric.change && (
                      <div className={`metric-change ${metric.changeType}`}>
                        <span className="change-icon">
                          {metric.changeType === 'increase' ? '↗️' : '↘️'}
                        </span>
                        <span>{formatPercentage(Math.abs(metric.change))}</span>
                        <span className="change-period">vs last period</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="quick-reports">
                <h2>Quick Reports</h2>
                <div className="quick-reports-grid">
                  {reportTemplates.slice(0, 4).map(template => (
                    <div key={template.id} className="quick-report-card">
                      <div className="report-icon">
                        {getCategoryIcon(template.category)}
                      </div>
                      <h3>{template.name}</h3>
                      <p>{template.description}</p>
                      <div className="report-actions">
                        <button
                          onClick={() => handleRunReport(template.id)}
                          className="btn btn-sm btn-primary"
                        >
                          Run Report
                        </button>
                        {template.lastRun && (
                          <button
                            onClick={() => handleViewReport(template.id)}
                            className="btn btn-sm btn-secondary"
                          >
                            View Last Run
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="tab-content">
              <div className="templates-list">
                {reportTemplates.map(template => (
                  <div key={template.id} className="template-card">
                    <div className="template-header">
                      <div className="template-info">
                        <span className="template-icon">
                          {getCategoryIcon(template.category)}
                        </span>
                        <div>
                          <h3>{template.name}</h3>
                          <p>{template.description}</p>
                          <div className="template-meta">
                            <span className={`category-badge ${template.category}`}>
                              {template.category}
                            </span>
                            {template.lastRun && (
                              <span className="last-run">
                                Last run: {formatDate(template.lastRun)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="template-actions">
                        <button
                          onClick={() => handleRunReport(template.id)}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          Run Report
                        </button>
                        {template.lastRun && (
                          <button
                            onClick={() => handleViewReport(template.id)}
                            className="btn btn-secondary"
                          >
                            View Results
                          </button>
                        )}
                      </div>
                    </div>
                    {template.isScheduled && (
                      <div className="schedule-info">
                        <span className="schedule-badge">
                          📅 Scheduled {template.frequency}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Reports Tab */}
          {activeTab === 'scheduled' && (
            <div className="tab-content">
              <div className="scheduled-reports">
                <div className="section-header">
                  <h2>Scheduled Reports</h2>
                  <p>Manage automated report generation and delivery</p>
                </div>
                
                <div className="scheduled-list">
                  {reportTemplates
                    .filter(template => template.isScheduled)
                    .map(template => (
                      <div key={template.id} className="scheduled-card">
                        <div className="scheduled-info">
                          <div className="schedule-header">
                            <span className="template-icon">
                              {getCategoryIcon(template.category)}
                            </span>
                            <div>
                              <h3>{template.name}</h3>
                              <p>Runs {template.frequency}</p>
                            </div>
                          </div>
                          <div className="schedule-status">
                            <span className="status-badge active">Active</span>
                            {template.lastRun && (
                              <span className="next-run">
                                Last: {formatDate(template.lastRun)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="scheduled-actions">
                          <button className="btn btn-sm btn-secondary">
                            Edit Schedule
                          </button>
                          <button className="btn btn-sm btn-outline">
                            View History
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};