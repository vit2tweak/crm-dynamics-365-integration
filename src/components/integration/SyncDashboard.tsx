import React, { useState, useEffect, useMemo } from 'react';
import { useSync } from '../../hooks/useSync';
import { SyncStatus, SyncOperation, SyncConfiguration } from '../../types/index';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/integration.css';

interface SyncMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  pendingOperations: number;
  averageExecutionTime: number;
  lastSyncTime: Date | null;
  uptime: number;
}

export const SyncDashboard: React.FC = () => {
  const {
    syncStatus,
    syncOperations,
    syncConfigurations,
    loading,
    error,
    startSync,
    stopSync,
    getSyncStatus,
    getSyncOperations,
    getSyncConfigurations
  } = useSync();

  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedSystem, setSelectedSystem] = useState<'all' | 'dynamics365' | 'nav2017' | 'cosmosdb'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await Promise.all([
          getSyncStatus(),
          getSyncOperations(),
          getSyncConfigurations()
        ]);
      } catch (error) {
        console.error('Error loading sync dashboard data:', error);
      }
    };

    loadDashboardData();
  }, [getSyncStatus, getSyncOperations, getSyncConfigurations]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(async () => {
        try {
          await getSyncStatus();
          await getSyncOperations();
        } catch (error) {
          console.error('Error refreshing sync data:', error);
        }
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, getSyncStatus, getSyncOperations]);

  const filteredOperations = useMemo(() => {
    let filtered = syncOperations;

    // Filter by time range
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoffTime = new Date(now.getTime() - timeRangeMs[selectedTimeRange]);
    filtered = filtered.filter(op => new Date(op.startTime) >= cutoffTime);

    // Filter by system
    if (selectedSystem !== 'all') {
      filtered = filtered.filter(op => 
        op.sourceSystem === selectedSystem || op.targetSystem === selectedSystem
      );
    }

    return filtered;
  }, [syncOperations, selectedTimeRange, selectedSystem]);

  const syncMetrics = useMemo((): SyncMetrics => {
    const operations = filteredOperations;
    const totalOperations = operations.length;
    const successfulOperations = operations.filter(op => op.status === 'completed').length;
    const failedOperations = operations.filter(op => op.status === 'failed').length;
    const pendingOperations = operations.filter(op => op.status === 'running' || op.status === 'pending').length;

    const completedOperations = operations.filter(op => op.status === 'completed' && op.endTime);
    const averageExecutionTime = completedOperations.length > 0
      ? completedOperations.reduce((sum, op) => {
          const duration = new Date(op.endTime!).getTime() - new Date(op.startTime).getTime();
          return sum + duration;
        }, 0) / completedOperations.length
      : 0;

    const lastSyncTime = operations.length > 0
      ? new Date(Math.max(...operations.map(op => new Date(op.startTime).getTime())))
      : null;

    // Calculate uptime based on successful operations in the last 24 hours
    const last24h = operations.filter(op => {
      const opTime = new Date(op.startTime);
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return opTime >= cutoff;
    });
    const uptime = last24h.length > 0 ? (last24h.filter(op => op.status === 'completed').length / last24h.length) * 100 : 100;

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      pendingOperations,
      averageExecutionTime,
      lastSyncTime,
      uptime
    };
  }, [filteredOperations]);

  const handleStartSync = async (configId: string) => {
    try {
      await startSync(configId);
      await getSyncStatus();
    } catch (error) {
      console.error('Error starting sync:', error);
    }
  };

  const handleStopSync = async (operationId: string) => {
    try {
      await stopSync(operationId);
      await getSyncStatus();
    } catch (error) {
      console.error('Error stopping sync:', error);
    }
  };

  const getStatusColor = (status: SyncStatus['status']) => {
    switch (status) {
      case 'running': return '#007bff';
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      case 'pending': return '#ffc107';
      case 'stopped': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'stopped': return '⏹️';
      default: return '❓';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  if (loading) {
    return <LoadingSpinner text="Loading sync dashboard..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Sync Dashboard</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="sync-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Sync Dashboard</h1>
          <div className="header-controls">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto Refresh
            </label>
          </div>
        </div>

        <div className="dashboard-filters">
          <div className="filter-group">
            <label>Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="form-control"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="filter-group">
            <label>System:</label>
            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value as any)}
              className="form-control"
            >
              <option value="all">All Systems</option>
              <option value="dynamics365">Dynamics 365</option>
              <option value="nav2017">NAV 2017</option>
              <option value="cosmosdb">Cosmos DB</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">{syncMetrics.totalOperations}</div>
            <div className="metric-label">Total Operations</div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-value">{syncMetrics.successfulOperations}</div>
            <div className="metric-label">Successful</div>
          </div>
        </div>

        <div className="metric-card error">
          <div className="metric-icon">❌</div>
          <div className="metric-content">
            <div className="metric-value">{syncMetrics.failedOperations}</div>
            <div className="metric-label">Failed</div>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">⏳</div>
          <div className="metric-content">
            <div className="metric-value">{syncMetrics.pendingOperations}</div>
            <div className="metric-label">Pending</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <div className="metric-value">{formatDuration(syncMetrics.averageExecutionTime)}</div>
            <div className="metric-label">Avg Duration</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <div className="metric-value">{syncMetrics.uptime.toFixed(1)}%</div>
            <div className="metric-label">Uptime (24h)</div>
          </div>
        </div>
      </div>

      {/* Active Sync Operations */}
      <div className="dashboard-section">
        <h2>Active Sync Operations</h2>
        <div className="active-operations">
          {syncStatus.filter(status => status.status === 'running' || status.status === 'pending').map((status) => (
            <div key={status.id} className="operation-card active">
              <div className="operation-header">
                <div className="operation-info">
                  <span className="operation-type">{status.operationType}</span>
                  <span className="operation-direction">
                    {status.sourceSystem} → {status.targetSystem}
                  </span>
                </div>
                <div className="operation-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(status.status) }}
                  >
                    {getStatusIcon(status.status)} {status.status}
                  </span>
                </div>
              </div>
              
              <div className="operation-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
                <span className="progress-text">{status.progress}%</span>
              </div>

              <div className="operation-details">
                <span>Records: {status.recordsProcessed}/{status.totalRecords}</span>
                <span>Started: {new Date(status.startTime).toLocaleTimeString()}</span>
                {status.status === 'running' && (
                  <button
                    onClick={() => handleStopSync(status.id)}
                    className="btn btn-sm btn-danger"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          ))}

          {syncStatus.filter(status => status.status === 'running' || status.status === 'pending').length === 0 && (
            <div className="no-active-operations">
              <p>No active sync operations</p>
            </div>
          )}
        </div>
      </div>

      {/* Sync Configurations */}
      <div className="dashboard-section">
        <h2>Sync Configurations</h2>
        <div className="sync-configurations">
          {syncConfigurations.map((config) => (
            <div key={config.id} className="config-card">
              <div className="config-header">
                <div className="config-info">
                  <h3>{config.name}</h3>
                  <p>{config.description}</p>
                </div>
                <div className="config-actions">
                  <button
                    onClick={() => handleStartSync(config.id)}
                    className="btn btn-primary btn-sm"
                    disabled={config.enabled === false}
                  >
                    Start Sync
                  </button>
                </div>
              </div>

              <div className="config-details">
                <div className="config-detail">
                  <span className="detail-label">Source:</span>
                  <span className="detail-value">{config.sourceSystem}</span>
                </div>
                <div className="config-detail">
                  <span className="detail-label">Target:</span>
                  <span className="detail-value">{config.targetSystem}</span>
                </div>
                <div className="config-detail">
                  <span className="detail-label">Schedule:</span>
                  <span className="detail-value">{config.schedule || 'Manual'}</span>
                </div>
                <div className="config-detail">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value ${config.enabled ? 'enabled' : 'disabled'}`}>
                    {config.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Operations */}
      <div className="dashboard-section">
        <h2>Recent Operations</h2>
        <div className="recent-operations">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Records</th>
                <th>Duration</th>
                <th>Started</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {filteredOperations.slice(0, 10).map((operation) => (
                <tr key={operation.id} className={`status-${operation.status}`}>
                  <td>{operation.operationType}</td>
                  <td>
                    <span className="operation-direction">
                      {operation.sourceSystem} → {operation.targetSystem}
                    </span>
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(