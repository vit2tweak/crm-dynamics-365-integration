import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useDynamics365 } from '../../hooks/useDynamics365';
import { useNav2017 } from '../../hooks/useNav2017';
import { useCosmosDB } from '../../hooks/useCosmosDB';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Customer } from '../../types/customer';
import { D365Opportunity } from '../../types/dynamics365';
import { NAVSalesOrder } from '../../types/nav2017';
import { formatCurrency, formatDate } from '../../utils/formatUtils';
import '../../styles/customers.css';

interface CustomerDetailProps {
  customerId?: string;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({ customerId: propCustomerId }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = propCustomerId || id;
  
  const { customers, loading: dataLoading, error: dataError } = useData();
  const { getOpportunitiesByAccount, loading: d365Loading } = useDynamics365();
  const { getSalesOrdersByCustomer, loading: navLoading } = useNav2017();
  const { getProductsByCustomer, loading: cosmosLoading } = useCosmosDB();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [opportunities, setOpportunities] = useState<D365Opportunity[]>([]);
  const [salesOrders, setSalesOrders] = useState<NAVSalesOrder[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'orders' | 'products' | 'activity'>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setError('Customer ID is required');
      return;
    }

    const foundCustomer = customers.find(c => c.id === customerId);
    if (foundCustomer) {
      setCustomer(foundCustomer);
      loadCustomerData(foundCustomer);
    } else if (!dataLoading) {
      setError('Customer not found');
    }
  }, [customerId, customers, dataLoading]);

  const loadCustomerData = async (customerData: Customer) => {
    try {
      setError(null);
      
      // Load opportunities from Dynamics 365
      if (customerData.dynamics365?.accountId) {
        const opps = await getOpportunitiesByAccount(customerData.dynamics365.accountId);
        setOpportunities(opps);
      }

      // Load sales orders from NAV 2017
      if (customerData.nav2017?.customerNo) {
        const orders = await getSalesOrdersByCustomer(customerData.nav2017.customerNo);
        setSalesOrders(orders);
      }

      // Load recent products from Cosmos DB
      const products = await getProductsByCustomer(customerId!);
      setRecentProducts(products.slice(0, 10)); // Show last 10 products
    } catch (err) {
      console.error('Error loading customer data:', err);
      setError('Failed to load customer details');
    }
  };

  const handleEdit = () => {
    navigate(`/customers/${customerId}/edit`);
  };

  const handleView360 = () => {
    navigate(`/customers/${customerId}/360`);
  };

  const loading = dataLoading || d365Loading || navLoading || cosmosLoading;

  if (loading) {
    return (
      <div className="customer-detail-loading">
        <LoadingSpinner size="large" text="Loading customer details..." />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="customer-detail-error">
        <div className="error-content">
          <h2>Error Loading Customer</h2>
          <p>{error || 'Customer not found'}</p>
          <div className="error-actions">
            <button onClick={() => navigate('/customers')} className="btn btn-primary">
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalOpportunityValue = opportunities.reduce((sum, opp) => sum + (opp.estimatedvalue || 0), 0);
  const totalOrderValue = salesOrders.reduce((sum, order) => sum + (order.Amount || 0), 0);

  return (
    <div className="customer-detail">
      <div className="customer-detail-header">
        <div className="header-content">
          <div className="customer-info">
            <div className="customer-avatar">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="customer-meta">
              <h1>{customer.name}</h1>
              <p className="customer-number">Customer #{customer.customerNumber}</p>
              <div className="customer-status">
                <span className={`status-badge ${customer.status.toLowerCase()}`}>
                  {customer.status}
                </span>
                <span className="customer-type">{customer.type}</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={handleEdit} className="btn btn-secondary">
              Edit Customer
            </button>
            <button onClick={handleView360} className="btn btn-primary">
              360° View
            </button>
          </div>
        </div>
      </div>

      <div className="customer-detail-nav">
        <nav className="tab-nav">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'opportunities' ? 'active' : ''}`}
            onClick={() => setActiveTab('opportunities')}
          >
            Opportunities ({opportunities.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders ({salesOrders.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products ({recentProducts.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </nav>
      </div>

      <div className="customer-detail-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-grid">
              <div className="overview-section">
                <h3>Contact Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Email</label>
                    <span>{customer.email || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <span>{customer.phone || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Website</label>
                    <span>{customer.website || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              <div className="overview-section">
                <h3>Address</h3>
                <div className="address-info">
                  <p>{customer.address?.street}</p>
                  <p>{customer.address?.city}, {customer.address?.state} {customer.address?.postalCode}</p>
                  <p>{customer.address?.country}</p>
                </div>
              </div>

              <div className="overview-section">
                <h3>Key Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-value">{formatCurrency(totalOpportunityValue)}</div>
                    <div className="metric-label">Pipeline Value</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{formatCurrency(totalOrderValue)}</div>
                    <div className="metric-label">Total Orders</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{customer.lastContactDate ? formatDate(customer.lastContactDate) : 'Never'}</div>
                    <div className="metric-label">Last Contact</div>
                  </div>
                </div>
              </div>

              <div className="overview-section">
                <h3>Integration Status</h3>
                <div className="integration-status">
                  <div className="status-item">
                    <span className="status-label">Dynamics 365</span>
                    <span className={`status-indicator ${customer.dynamics365 ? 'connected' : 'disconnected'}`}>
                      {customer.dynamics365 ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">NAV 2017</span>
                    <span className={`status-indicator ${customer.nav2017 ? 'connected' : 'disconnected'}`}>
                      {customer.nav2017 ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="opportunities-tab">
            <div className="section-header">
              <h3>Sales Opportunities</h3>
              <Link to={`/sales/opportunities/new?customerId=${customerId}`} className="btn btn-primary">
                New Opportunity
              </Link>
            </div>
            {opportunities.length > 0 ? (
              <div className="opportunities-list">
                {opportunities.map((opportunity) => (
                  <div key={opportunity.opportunityid} className="opportunity-card">
                    <div className="opportunity-header">
                      <h4>{opportunity.name}</h4>
                      <span className={`status-badge ${opportunity.statuscode?.toString().toLowerCase()}`}>
                        {opportunity.statuscode}
                      </span>
                    </div>
                    <div className="opportunity-details">
                      <div className="detail-item">
                        <label>Value</label>
                        <span>{formatCurrency(opportunity.estimatedvalue || 0)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Close Date</label>
                        <span>{opportunity.estimatedclosedate ? formatDate(opportunity.estimatedclosedate) : 'Not set'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Probability</label>
                        <span>{opportunity.closeprobability || 0}%</span>
                      </div>
                    </div>
                    <div className="opportunity-actions">
                      <Link to={`/sales/opportunities/${opportunity.opportunityid}`} className="btn btn-sm btn-secondary">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No opportunities found for this customer.</p>
                <Link to={`/sales/opportunities/new?customerId=${customerId}`} className="btn btn-primary">
                  Create First Opportunity
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-tab">
            <div className="section-header">
              <h3>Sales Orders</h3>
            </div>
            {salesOrders.length > 0 ? (
              <div className="orders-list">
                {salesOrders.map((order) => (
                  <div key={order.No} className="order-card">
                    <div className="order-header">
                      <h4>Order #{order.No}</h4>
                      <span className={`status-badge ${order.Status?.toLowerCase()}`}>
                        {order.Status}
                      </span>
                    </div>
                    <div className="order-details">
                      <div className="detail-item">
                        <label>Amount</label>
                        <span>{formatCurrency(order.Amount || 0)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Order Date</label>
                        <span>{order.OrderDate ? formatDate(order.OrderDate) : 'Not set'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Ship Date</label>
                        <span>{order.ShipmentDate ? formatDate(order.ShipmentDate) : 'Not scheduled'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No sales orders found for this customer.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-tab">
            <div className="section-header">
              <h3>Recent Products</h3>
              <Link to={`/products?customerId=${customerId}`} className="btn btn-secondary">
                View All Products
              </Link>
            </div>
            {recentProducts.length > 0 ? (
              <div className="products-list">
                {recentProducts.map((product) => (
                  <div key={product.id} className="product-card">
                    <div className="product-info">
                      <h4>{product.name}</h4>
                      <p className="product-number">#{product.productNumber}</p>
                      <p className="product-description">{product.description}</p>
                    </div>
                    <div className="product-details">
                      <div className="detail-item">
                        <label>Price</label>
                        <span>{formatCurrency(product.price || 0)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Category</label>
                        <span>{product.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recent products found for this customer.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-tab">
            <div className="section-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-timeline">
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>Customer Created</h4>
                  <p>Customer record was created in the system</p>
                  <span className="timeline-date">{formatDate(customer.createdDate)}</span>
                </div>
              </div>
              {customer.lastModifiedDate && (
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Profile Updated</h4>
                    <p>Customer information was last modified</p>
                    <span className="timeline-date">{formatDate(customer.lastModifiedDate)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};