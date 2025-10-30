import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { D365Opportunity } from '../../types/dynamics365';
import '../../styles/dashboard.css';

interface ActivityItem {
  id: string;
  type: 'customer' | 'opportunity' | 'sync' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error' | 'info';
  entityId?: string;
  icon: string;
}

interface RecentActivityProps {
  customers?: Customer[];
  opportunities?: D365Opportunity[];
  maxItems?: number;
  onViewAll?: () => void;
  className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  customers = [],
  opportunities = [],
  maxItems = 10,
  onViewAll,
  className = ''
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'customer' | 'opportunity' | 'sync'>('all');

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add customer activities
    customers.forEach(customer => {
      if (customer.createdOn) {
        items.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          title: 'New Customer Added',
          description: `${customer.name} was added to the system`,
          timestamp: new Date(customer.createdOn),
          status: 'success',
          entityId: customer.id,
          icon: '👤'
        });
      }

      if (customer.modifiedOn && customer.modifiedOn !== customer.createdOn) {
        items.push({
          id: `customer-update-${customer.id}`,
          type: 'customer',
          title: 'Customer Updated',
          description: `${customer.name} information was updated`,
          timestamp: new Date(customer.modifiedOn),
          status: 'info',
          entityId: customer.id,
          icon: '✏️'
        });
      }
    });

    // Add opportunity activities
    opportunities.forEach(opportunity => {
      if (opportunity.createdon) {
        items.push({
          id: `opportunity-${opportunity.opportunityid}`,
          type: 'opportunity',
          title: 'New Opportunity Created',
          description: `${opportunity.name} - ${opportunity.estimatedvalue ? 
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(opportunity.estimatedvalue) : 
            'No value specified'}`,
          timestamp: new Date(opportunity.createdon),
          status: 'success',
          entityId: opportunity.opportunityid,
          icon: '💼'
        });
      }

      if (opportunity.modifiedon && opportunity.modifiedon !== opportunity.createdon) {
        items.push({
          id: `opportunity-update-${opportunity.opportunityid}`,
          type: 'opportunity',
          title: 'Opportunity Updated',
          description: `${opportunity.name} was modified`,
          timestamp: new Date(opportunity.modifiedon),
          status: 'info',
          entityId: opportunity.opportunityid,
          icon: '📝'
        });
      }

      // Add status change activities
      if (opportunity.statecode === 1) { // Closed
        const isWon = opportunity.statuscode === 3;
        items.push({
          id: `opportunity-closed-${opportunity.opportunityid}`,
          type: 'opportunity',
          title: `Opportunity ${isWon ? 'Won' : 'Lost'}`,
          description: `${opportunity.name} was ${isWon ? 'won' : 'lost'}`,
          timestamp: new Date(opportunity.modifiedon || opportunity.createdon),
          status: isWon ? 'success' : 'warning',
          entityId: opportunity.opportunityid,
          icon: isWon ? '🎉' : '😞'
        });
      }
    });

    // Add some mock sync activities
    const now = new Date();
    items.push(
      {
        id: 'sync-1',
        type: 'sync',
        title: 'Data Synchronization Completed',
        description: 'Successfully synchronized with Dynamics 365 and NAV 2017',
        timestamp: new Date(now.getTime() - 30 * 60000), // 30 minutes ago
        status: 'success',
        icon: '🔄'
      },
      {
        id: 'sync-2',
        type: 'sync',
        title: 'Product Catalog Updated',
        description: 'Cosmos DB product warehouse synchronized',
        timestamp: new Date(now.getTime() - 2 * 60 * 60000), // 2 hours ago
        status: 'info',
        icon: '📦'
      }
    );

    // Sort by timestamp (most recent first) and apply filter
    return items
      .filter(item => filter === 'all' || item.type === filter)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [customers, opportunities, filter, maxItems]);

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getStatusClass = (status?: string): string => {
    switch (status) {
      case 'success':
        return 'activity-success';
      case 'warning':
        return 'activity-warning';
      case 'error':
        return 'activity-error';
      case 'info':
      default:
        return 'activity-info';
    }
  };

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.entityId) {
      switch (activity.type) {
        case 'customer':
          navigate(`/customers/${activity.entityId}`);
          break;
        case 'opportunity':
          navigate(`/sales/opportunities/${activity.entityId}`);
          break;
        default:
          break;
      }
    }
  };

  const cardClasses = [
    'recent-activity-card',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      <div className="recent-activity-header">
        <h3>Recent Activity</h3>
        <div className="activity-controls">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="activity-filter"
          >
            <option value="all">All Activity</option>
            <option value="customer">Customers</option>
            <option value="opportunity">Opportunities</option>
            <option value="sync">Synchronization</option>
          </select>
          {onViewAll && (
            <button 
              className="btn-link"
              onClick={onViewAll}
            >
              View All
            </button>
          )}
        </div>
      </div>

      <div className="recent-activity-content">
        {activities.length === 0 ? (
          <div className="no-activity">
            <div className="no-activity-icon">📭</div>
            <div className="no-activity-text">
              {filter === 'all' ? 'No recent activity' : `No recent ${filter} activity`}
            </div>
          </div>
        ) : (
          <div className="activity-list">
            {activities.map((activity) => (
              <div 
                key={activity.id}
                className={`activity-item ${getStatusClass(activity.status)} ${
                  activity.entityId ? 'activity-clickable' : ''
                }`}
                onClick={() => handleActivityClick(activity)}
                role={activity.entityId ? 'button' : 'listitem'}
                tabIndex={activity.entityId ? 0 : -1}
                onKeyPress={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && activity.entityId) {
                    e.preventDefault();
                    handleActivityClick(activity);
                  }
                }}
              >
                <div className="activity-icon">
                  {activity.icon}
                </div>
                <div className="activity-details">
                  <div className="activity-title">
                    {activity.title}
                  </div>
                  <div className="activity-description">
                    {activity.description}
                  </div>
                </div>
                <div className="activity-timestamp">
                  {formatTimestamp(activity.timestamp)}
                </div>
                {activity.entityId && (
                  <div className="activity-arrow">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activities.length > 0 && onViewAll && (
        <div className="recent-activity-footer">
          <button 
            className="btn btn-outline btn-full-width"
            onClick={onViewAll}
          >
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
--- en