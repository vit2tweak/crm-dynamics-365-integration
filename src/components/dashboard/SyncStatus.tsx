import React, { useState, useEffect } from 'react';
import { SyncStatus as SyncStatusType, SyncOperation } from '../../types/index';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/dashboard.css';

interface SyncStatusProps {
  status?: SyncStatusType;
  lastSync?: Date;
  pendingOperations?: number;
  isLoading?: boolean;
  error?: string;
  onSyncNow?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  status,
  lastSync,
  pendingOperations = 0,
  isLoading = false,
  error,
  onSyncNow,
  onViewDetails,
  className = ''
}) => {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSync) {
        setTimeAgo('Never');
        return;
      }

      const now = new Date();
      const diff = now.getTime() - lastSync.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setTimeAgo(`${days} day${days > 1 ? 's' : ''} ago`);
      } else if (hours > 0) {
        setTimeAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else if (minutes > 0) {
        setTimeAgo(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else {
        setTimeAgo('Just now');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSync]);

  const getStatusColor = (syncStatus?: SyncStatusType): string => {
    switch (syncStatus) {
      case 'syncing':
        return 'status-syncing';
      case 'completed':
        return 'status-success';
      case 'failed':
        return 'status-error';
      case 'idle':
      default:
        return 'status-idle';
    }
  };

  const getStatusIcon = (syncStatus?: SyncStatusType): string => {
    switch (syncStatus) {
      case 'syncing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'idle':
      default:
        return '⏸️';
    }
  };

  const getStatusText = (syncStatus?: SyncStatusType): string => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing in progress...';
      case 'completed':
        return 'All systems synchronized';
      case 'failed':
        return 'Synchronization failed';
      case 'idle':
      default:
        return 'Ready to sync';
    }
  };

  const cardClasses = [
    'sync-status-card',
    className,
    getStatusColor(status)
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      <div className="sync-status-header">
        <h3>Synchronization Status</h3>
        {onViewDetails && (
          <button 
            className="btn-link"
            onClick={onViewDetails}
            aria-label="View sync details"
          >
            View Details
          </button>
        )}
      </div>

      <div className="sync-status-content">
        {isLoading ? (
          <div className="sync-status-loading">
            <LoadingSpinner size="small" />
            <span>Loading sync status...</span>
          </div>
        ) : error ? (
          <div className="sync-status-error">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
          </div>
        ) : (
          <>
            <div className="sync-status-main">
              <div className="status-indicator">
                <span className="status-icon">{getStatusIcon(status)}</span>
                <div className="status-details">
                  <div className="status-text">{getStatusText(status)}</div>
                  <div className="status-time">Last sync: {timeAgo}</div>
                </div>
              </div>
            </div>

            <div className="sync-status-metrics">
              <div className="sync-metric">
                <div className="metric-label">Pending Operations</div>
                <div className="metric-value">
                  {pendingOperations}
                  {pendingOperations > 0 && (
                    <span className="metric-badge">!</span>
                  )}
                </div>
              </div>

              <div className="sync-metric">
                <div className="metric-label">Systems</div>
                <div className="metric-value">
                  <div className="system-indicators">
                    <div className="system-indicator system-d365" title="Dynamics 365">
                      D365
                    </div>
                    <div className="system-indicator system-nav" title="NAV 2017">
                      NAV
                    </div>
                    <div className="system-indicator system-cosmos" title="Cosmos DB">
                      DB
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {status === 'syncing' && (
              <div className="sync-progress">
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
                <div className="progress-text">Synchronizing data...</div>
              </div>
            )}

            {pendingOperations > 0 && status !== 'syncing' && (
              <div className="sync-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  {pendingOperations} operation{pendingOperations > 1 ? 's' : ''} pending sync
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sync-status-actions">
        {onSyncNow && (
          <button 
            className={`btn ${status === 'syncing' ? 'btn-disabled' : 'btn-primary'}`}
            onClick={onSyncNow}
            disabled={status === 'syncing' || isLoading}
          >
            {status === 'syncing' ? (
              <>
                <LoadingSpinner size="small" color="white" />
                Syncing...
              </>
            ) : (
              <>
                <span className="btn-icon">🔄</span>
                Sync Now
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default SyncStatus;