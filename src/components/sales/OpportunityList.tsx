import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useDynamics365 } from '../../hooks/useDynamics365';
import { D365Opportunity, D365OpportunityState } from '../../types/dynamics365';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/components.css';

interface OpportunityListProps {
  customerId?: string;
  limit?: number;
  showFilters?: boolean;
}

interface OpportunityFilters {
  state: D365OpportunityState | 'all';
  priority: 'all' | 'high' | 'medium' | 'low';
  owner: string;
  dateRange: 'all' | 'week' | 'month' | 'quarter' | 'year';
  searchTerm: string;
}

export const OpportunityList: React.FC<OpportunityListProps> = ({
  customerId,
  limit,
  showFilters = true
}) => {
  const navigate = useNavigate();
  const { state } = useData();
  const { opportunities, loading, error, fetchOpportunities, updateOpportunity } = useDynamics365();

  const [filters, setFilters] = useState<OpportunityFilters>({
    state: 'all',
    priority: 'all',
    owner: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

  const [sortBy, setSortBy] = useState<'name' | 'estimatedvalue' | 'estimatedclosedate' | 'createdon'>('createdon');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);

  useEffect(() => {
    const loadOpportunities = async () => {
      try {
        const queryOptions = customerId 
          ? { filter: `_parentaccountid_value eq ${customerId}` }
          : {};
        
        await fetchOpportunities(queryOptions);
      } catch (error) {
        console.error('Failed to load opportunities:', error);
      }
    };

    loadOpportunities();
  }, [customerId, fetchOpportunities]);

  const filteredAndSortedOpportunities = useMemo(() => {
    let filtered = opportunities;

    // Apply filters
    if (filters.state !== 'all') {
      filtered = filtered.filter(opp => opp.statecode === filters.state);
    }

    if (filters.priority !== 'all') {
      const priorityMap = { high: 1, medium: 2, low: 3 };
      filtered = filtered.filter(opp => opp.prioritycode === priorityMap[filters.priority]);
    }

    if (filters.owner !== 'all') {
      filtered = filtered.filter(opp => opp._ownerid_value === filters.owner);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const dateThresholds = {
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      };
      
      const threshold = dateThresholds[filters.dateRange];
      filtered = filtered.filter(opp => 
        new Date(opp.createdon) >= threshold
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(opp =>
        opp.name.toLowerCase().includes(searchLower) ||
        opp.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'estimatedvalue') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (sortBy === 'estimatedclosedate' || sortBy === 'createdon') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply limit if specified
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [opportunities, filters, sortBy, sortOrder, limit]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleOpportunitySelect = (opportunityId: string) => {
    setSelectedOpportunities(prev =>
      prev.includes(opportunityId)
        ? prev.filter(id => id !== opportunityId)
        : [...prev, opportunityId]
    );
  };

  const handleBulkAction = async (action: 'close-won' | 'close-lost' | 'reopen') => {
    try {
      const updates = selectedOpportunities.map(id => {
        const stateMap = {
          'close-won': { statecode: 1, statuscode: 3 },
          'close-lost': { statecode: 1, statuscode: 4 },
          'reopen': { statecode: 0, statuscode: 1 }
        };
        
        return updateOpportunity(id, stateMap[action]);
      });

      await Promise.all(updates);
      setSelectedOpportunities([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStateLabel = (state: D365OpportunityState) => {
    const labels = {
      0: 'Open',
      1: 'Won',
      2: 'Lost'
    };
    return labels[state] || 'Unknown';
  };

  const getPriorityLabel = (priority?: number) => {
    const labels = { 1: 'High', 2: 'Medium', 3: 'Low' };
    return labels[priority as keyof typeof labels] || 'Normal';
  };

  if (loading) {
    return <LoadingSpinner text="Loading opportunities..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Opportunities</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="opportunity-list">
      <div className="list-header">
        <div className="header-content">
          <h2>Sales Opportunities</h2>
          <div className="header-actions">
            {selectedOpportunities.length > 0 && (
              <div className="bulk-actions">
                <button onClick={() => handleBulkAction('close-won')}>
                  Mark as Won
                </button>
                <button onClick={() => handleBulkAction('close-lost')}>
                  Mark as Lost
                </button>
                <button onClick={() => handleBulkAction('reopen')}>
                  Reopen
                </button>
              </div>
            )}
            <Link to="/opportunities/new" className="btn btn-primary">
              New Opportunity
            </Link>
          </div>
        </div>

        {showFilters && (
          <div className="filters">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search opportunities..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
              <select
                value={filters.state}
                onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value as any }))}
              >
                <option value="all">All States</option>
                <option value={0}>Open</option>
                <option value={1}>Won</option>
                <option value={2}>Lost</option>
              </select>
            </div>

            <div className="filter-group">
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="filter-group">
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="opportunity-table-container">
        <table className="opportunity-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedOpportunities.length === filteredAndSortedOpportunities.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOpportunities(filteredAndSortedOpportunities.map(opp => opp.opportunityid));
                    } else {
                      setSelectedOpportunities([]);
                    }
                  }}
                />
              </th>
              <th 
                className={`sortable ${sortBy === 'name' ? `sorted-${sortOrder}` : ''}`}
                onClick={() => handleSort('name')}
              >
                Opportunity Name
              </th>
              <th>Account</th>
              <th 
                className={`sortable ${sortBy === 'estimatedvalue' ? `sorted-${sortOrder}` : ''}`}
                onClick={() => handleSort('estimatedvalue')}
              >
                Est. Value
              </th>
              <th 
                className={`sortable ${sortBy === 'estimatedclosedate' ? `sorted-${sortOrder}` : ''}`}
                onClick={() => handleSort('estimatedclosedate')}
              >
                Close Date
              </th>
              <th>State</th>
              <th>Priority</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedOpportunities.map((opportunity) => (
              <tr key={opportunity.opportunityid}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedOpportunities.includes(opportunity.opportunityid)}
                    onChange={() => handleOpportunitySelect(opportunity.opportunityid)}
                  />
                </td>
                <td>
                  <Link 
                    to={`/opportunities/${opportunity.opportunityid}`}
                    className="opportunity-name-link"
                  >
                    {opportunity.name}
                  </Link>
                </td>
                <td>
                  {opportunity.parentaccountid?.name || '-'}
                </td>
                <td className="currency">
                  {formatCurrency(opportunity.estimatedvalue)}
                </td>
                <td>
                  {opportunity.estimatedclosedate 
                    ? formatDate(opportunity.estimatedclosedate)
                    : '-'
                  }
                </td>
                <td>
                  <span className={`state-badge state-${opportunity.statecode}`}>
                    {getStateLabel(opportunity.statecode)}
                  </span>
                </td>
                <td>
                  <span className={`priority-badge priority-${opportunity.prioritycode}`}>
                    {getPriorityLabel(opportunity.prioritycode)}
                  </span>
                </td>
                <td>
                  {opportunity.ownerid?.fullname || '-'}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => navigate(`/opportunities/${opportunity.opportunityid}`)}
                      className="btn-icon"
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => navigate(`/opportunities/${opportunity.opportunityid}/edit`)}
                      className="btn-icon"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedOpportunities.length === 0 && (
          <div className="empty-state">
            <h3>No Opportunities Found</h3>
            <p>
              {filters.searchTerm || filters.state !== 'all' || filters.priority !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Create your first opportunity to get started.'
              }
            </p>
            <Link to="/opportunities/new" className="btn btn-primary">
              Create Opportunity
            </Link>
          </div>
        )}
      </div>

      <div className="list-summary">
        <p>
          Showing {filteredAndSortedOpportunities.length} of {opportunities.length} opportunities
          {selectedOpportunities.length > 0 && (
            <span> • {selectedOpportunities.length} selected</span>
          )}
        </p>
      </div>
    </div>
  );
};