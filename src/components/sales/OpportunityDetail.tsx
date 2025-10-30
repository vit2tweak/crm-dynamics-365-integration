import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useDynamics365 } from '../../hooks/useDynamics365';
import { D365Opportunity, D365OpportunityState } from '../../types/dynamics365';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/components.css';

interface OpportunityDetailProps {
  opportunityId?: string;
}

export const OpportunityDetail: React.FC<OpportunityDetailProps> = ({ 
  opportunityId: propOpportunityId 
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const opportunityId = propOpportunityId || id;
  
  const { state } = useData();
  const { 
    opportunities, 
    loading, 
    error, 
    fetchOpportunity, 
    updateOpportunity,
    deleteOpportunity 
  } = useDynamics365();

  const [opportunity, setOpportunity] = useState<D365Opportunity | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'products' | 'notes'>('overview');

  useEffect(() => {
    const loadOpportunity = async () => {
      if (!opportunityId) return;

      try {
        // First check if opportunity is already in state
        const existingOpportunity = opportunities.find(opp => opp.opportunityid === opportunityId);
        if (existingOpportunity) {
          setOpportunity(existingOpportunity);
        }

        // Fetch detailed opportunity data
        const detailedOpportunity = await fetchOpportunity(opportunityId);
        setOpportunity(detailedOpportunity);
      } catch (error) {
        console.error('Failed to load opportunity:', error);
      }
    };

    loadOpportunity();
  }, [opportunityId, fetchOpportunity, opportunities]);

  const handleStateChange = async (newState: D365OpportunityState, statusCode: number) => {
    if (!opportunity) return;

    setIsUpdating(true);
    try {
      await updateOpportunity(opportunity.opportunityid, {
        statecode: newState,
        statuscode: statusCode
      });

      setOpportunity(prev => prev ? {
        ...prev,
        statecode: newState,
        statuscode: statusCode
      } : null);
    } catch (error) {
      console.error('Failed to update opportunity state:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;

    try {
      await deleteOpportunity(opportunity.opportunityid);
      navigate('/opportunities');
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date?: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStateLabel = (state: D365OpportunityState) => {
    const labels = { 0: 'Open', 1: 'Won', 2: 'Lost' };
    return labels[state] || 'Unknown';
  };

  const getPriorityLabel = (priority?: number) => {
    const labels = { 1: 'High', 2: 'Medium', 3: 'Low' };
    return labels[priority as keyof typeof labels] || 'Normal';
  };

  const calculateDaysToClose = () => {
    if (!opportunity?.estimatedclosedate) return null;
    const closeDate = new Date(opportunity.estimatedclosedate);
    const today = new Date();
    const diffTime = closeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <LoadingSpinner text="Loading opportunity details..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Opportunity</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="not-found-container">
        <h3>Opportunity Not Found</h3>
        <p>The requested opportunity could not be found.</p>
        <Link to="/opportunities" className="btn btn-primary">
          Back to Opportunities
        </Link>
      </div>
    );
  }

  const daysToClose = calculateDaysToClose();

  return (
    <div className="opportunity-detail">
      <div className="detail-header">
        <div className="header-content">
          <div className="breadcrumb">
            <Link to="/opportunities">Opportunities</Link>
            <span>/</span>
            <span>{opportunity.name}</span>
          </div>
          
          <div className="header-title">
            <h1>{opportunity.name}</h1>
            <div className="header-badges">
              <span className={`state-badge state-${opportunity.statecode}`}>
                {getStateLabel(opportunity.statecode)}
              </span>
              {opportunity.prioritycode && (
                <span className={`priority-badge priority-${opportunity.prioritycode}`}>
                  {getPriorityLabel(opportunity.prioritycode)}
                </span>
              )}
            </div>
          </div>

          <div className="header-actions">
            <button
              onClick={() => navigate(`/opportunities/${opportunity.opportunityid}/edit`)}
              className="btn btn-secondary"
            >
              Edit
            </button>
            
            {opportunity.statecode === 0 && (
              <div className="state-actions">
                <button
                  onClick={() => handleStateChange(1, 3)}
                  disabled={isUpdating}
                  className="btn btn-success"
                >
                  Mark as Won
                </button>
                <button
                  onClick={() => handleStateChange(2, 4)}
                  disabled={isUpdating}
                  className="btn btn-danger"
                >
                  Mark as Lost
                </button>
              </div>
            )}

            {opportunity.statecode !== 0 && (
              <button
                onClick={() => handleStateChange(0, 1)}
                disabled={isUpdating}
                className="btn btn-warning"
              >
                Reopen
              </button>
            )}

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-danger-outline"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="key-metrics">
          <div className="metric">
            <label>Estimated Value</label>
            <span className="value currency">
              {formatCurrency(opportunity.estimatedvalue)}
            </span>
          </div>
          <div className="metric">
            <label>Close Probability</label>
            <span className="value">
              {opportunity.closeprobability ? `${opportunity.closeprobability}%` : 'Not set'}
            </span>
          </div>
          <div className="metric">
            <label>Days to Close</label>
            <span className={`value ${daysToClose && daysToClose < 0 ? 'overdue' : ''}`}>
              {daysToClose !== null 
                ? daysToClose < 0 
                  ? `${Math.abs(daysToClose)} days overdue`
                  : `${daysToClose} days`
                : 'Not set'
              }
            </span>
          </div>
          <div className="metric">
            <label>Owner</label>
            <span className="value">
              {opportunity.ownerid?.fullname || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          Activities
        </button>
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button
          className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
      </div>

      <div className="detail-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="content-grid">
              <div className="info-section">
                <h3>Opportunity Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Account</label>
                    <span>
                      {opportunity.parentaccountid ? (
                        <Link to={`/customers/${opportunity.parentaccountid.accountid}`}>
                          {opportunity.parentaccountid.name}
                        </Link>
                      ) : (
                        'Not specified'
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Contact</label>
                    <span>
                      {opportunity.parentcontactid ? (
                        <Link to={`/contacts/${opportunity.parentcontactid.contactid}`}>
                          {opportunity.parentcontactid.fullname}
                        </Link>
                      ) : (
                        'Not specified'
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Estimated Close Date</label>
                    <span>{formatDate(opportunity.estimatedclosedate)}</span>
                  </div>
                  <div className="info-item">
                    <label>Actual Close Date</label>
                    <span>{formatDate(opportunity.actualclosedate)}</span>
                  </div>
                  <div className="info-item">
                    <label>Created On</label>
                    <span>{formatDateTime(opportunity.createdon)}</span>
                  </div>
                  <div className="info-item">
                    <label>Modified On</label>
                    <span>{formatDateTime(opportunity.modifiedon)}</span>
                  </div>
                </div>
              </div>

              <div className="description-section">
                <h3>Description</h3>
                <div className="description-content">
                  {opportunity.description || 'No description provided.'}
                </div>
              </div>

              <div className="timeline-section">
                <h3>Recent Activity</h3>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <h4>Opportunity Created</h4>
                      <p>{formatDateTime(opportunity.createdon)}</p>
                    </div>
                  </div>
                  {opportunity.modifiedon !== opportunity.createdon && (
                    <div className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h4>Last Modified</h4>
                        <p>{formatDateTime(opportunity.modifiedon)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="activities-tab">
            <div className="activities-header">
              <h3>Activities</h3>
              <button className="btn btn-primary">New Activity</button>
            </div>
            <div className="activities-list">
              <p>Activities functionality will be implemented in future updates.</p>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-tab">
            <div className="products-header">
              <h3>Opportunity Products</h3>
              <button className="btn btn-primary">Add Product</button>
            </div>
            <div className="products-list">
              <p>Products functionality will be implemented in future updates.</p>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-tab">
            <div className="notes-header">
              <h3>Notes</h3>
              <button className="btn btn-primary">Add Note</button>
            </div>
            <div className="notes-list">
              <p>Notes functionality will be implemented in future updates.</p>
            </div>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete the opportunity "{opportunity.name}"? 
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};