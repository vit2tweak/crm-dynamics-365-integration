import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { syncService } from '../services/syncService';
import { 
  SyncConfiguration, 
  SyncStatus, 
  SyncResult, 
  SyncError, 
  SyncStatistics 
} from '../types/index';

// Sync State Interface
export interface SyncState {
  // Configuration
  configuration: SyncConfiguration | null;
  
  // Current Sync Status
  currentSync: {
    isRunning: boolean;
    operation: string | null;
    progress: number;
    startTime: Date | null;
    estimatedCompletion: Date | null;
  };
  
  // Sync History
  syncHistory: SyncResult[];
  
  // Sync Statistics
  statistics: SyncStatistics | null;
  
  // Sync Errors
  errors: SyncError[];
  
  // Real-time Status
  realTimeStatus: {
    d365Connected: boolean;
    navConnected: boolean;
    cosmosConnected: boolean;
    lastHeartbeat: Date | null;
  };
  
  // Scheduled Syncs
  scheduledSyncs: {
    id: string;
    name: string;
    schedule: string;
    enabled: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
  }[];
  
  // Loading States
  loading: {
    configuration: boolean;
    sync: boolean;
    history: boolean;
    statistics: boolean;
  };
  
  // Notifications
  notifications: {
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    read: boolean;
  }[];
}

// Action Types
type SyncAction =
  | { type: 'SET_LOADING'; payload: { source: keyof SyncState['loading']; loading: boolean } }
  | { type: 'SET_CONFIGURATION'; payload: SyncConfiguration }
  | { type: 'SET_CURRENT_SYNC'; payload: Partial<SyncState['currentSync']> }
  | { type: 'ADD_SYNC_RESULT'; payload: SyncResult }
  | { type: 'SET_SYNC_HISTORY'; payload: SyncResult[] }
  | { type: 'SET_STATISTICS'; payload: SyncStatistics }
  | { type: 'ADD_ERROR'; payload: SyncError }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_REAL_TIME_STATUS'; payload: Partial<SyncState['realTimeStatus']> }
  | { type: 'SET_SCHEDULED_SYNCS'; payload: SyncState['scheduledSyncs'] }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<SyncState['notifications'][0], 'id'> }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'RESET_SYNC_STATE' };

// Initial State
const initialState: SyncState = {
  configuration: null,
  currentSync: {
    isRunning: false,
    operation: null,
    progress: 0,
    startTime: null,
    estimatedCompletion: null,
  },
  syncHistory: [],
  statistics: null,
  errors: [],
  realTimeStatus: {
    d365Connected: false,
    navConnected: false,
    cosmosConnected: false,
    lastHeartbeat: null,
  },
  scheduledSyncs: [],
  loading: {
    configuration: false,
    sync: false,
    history: false,
    statistics: false,
  },
  notifications: [],
};

// Reducer
const syncReducer = (state: SyncState, action: SyncAction): SyncState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.source]: action.payload.loading,
        },
      };
    
    case 'SET_CONFIGURATION':
      return {
        ...state,
        configuration: action.payload,
      };
    
    case 'SET_CURRENT_SYNC':
      return {
        ...state,
        currentSync: {
          ...state.currentSync,
          ...action.payload,
        },
      };
    
    case 'ADD_SYNC_RESULT':
      return {
        ...state,
        syncHistory: [action.payload, ...state.syncHistory.slice(0, 99)], // Keep last 100 results
      };
    
    case 'SET_SYNC_HISTORY':
      return {
        ...state,
        syncHistory: action.payload,
      };
    
    case 'SET_STATISTICS':
      return {
        ...state,
        statistics: action.payload,
      };
    
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [action.payload, ...state.errors.slice(0, 49)], // Keep last 50 errors
      };
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      };
    
    case 'SET_REAL_TIME_STATUS':
      return {
        ...state,
        realTimeStatus: {
          ...state.realTimeStatus,
          ...action.payload,
        },
      };
    
    case 'SET_SCHEDULED_SYNCS':
      return {
        ...state,
        scheduledSyncs: action.payload,
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          {
            ...action.payload,
            id: Date.now().toString(),
          },
          ...state.notifications.slice(0, 19), // Keep last 20 notifications
        ],
      };
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
      };
    
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    
    case 'RESET_SYNC_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context Interface
export interface SyncContextType {
  state: SyncState;
  
  // Configuration Functions
  loadConfiguration: () => Promise<void>;
  updateConfiguration: (config: Partial<SyncConfiguration>) => Promise<void>;
  
  // Sync Operations
  startFullSync: () => Promise<void>;
  startIncrementalSync: () => Promise<void>;
  startCustomSync: (entities: string[]) => Promise<void>;
  stopSync: () => Promise<void>;
  
  // Data Management
  loadSyncHistory: () => Promise<void>;
  loadStatistics: () => Promise<void>;
  clearSyncHistory: () => Promise<void>;
  
  // Real-time Monitoring
  checkConnectionStatus: () => Promise<void>;
  startRealTimeMonitoring: () => void;
  stopRealTimeMonitoring: () => void;
  
  // Scheduled Syncs
  loadScheduledSyncs: () => Promise<void>;
  createScheduledSync: (sync: Omit<SyncState['scheduledSyncs'][0], 'id'>) => Promise<void>;
  updateScheduledSync: (id: string, updates: Partial<SyncState['scheduledSyncs'][0]>) => Promise<void>;
  deleteScheduledSync: (id: string) => Promise<void>;
  
  // Error Handling
  clearErrors: () => void;
  retryFailedSync: (syncId: string) => Promise<void>;
  
  // Notifications
  addNotification: (notification: Omit<SyncState['notifications'][0], 'id'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Utility Functions
  getSyncProgress: () => number;
  getLastSyncResult: () => SyncResult | null;
  getUnreadNotificationCount: () => number;
  isSystemHealthy: () => boolean;
}

// Create Context
const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Provider Props
interface SyncProviderProps {
  children: ReactNode;
}

// Sync Provider Component
export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(syncReducer, initialState);

  // Real-time monitoring interval
  let monitoringInterval: NodeJS.Timeout | null = null;

  // Load Configuration
  const loadConfiguration = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'configuration', loading: true } });
      const config = await syncService.getConfiguration();
      dispatch({ type: 'SET_CONFIGURATION', payload: config });
    } catch (error) {
      const syncError: SyncError = {
        id: Date.now().toString(),
        message: error instanceof Error ? error.message : 'Failed to load configuration',
        timestamp: new Date(),
        source: 'configuration',
        severity: 'error',
      };
      dispatch({ type: 'ADD_ERROR', payload: syncError });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { source: 'configuration', loading: false } });
    }
  };

  // Update Configuration
  const updateConfiguration = async (config: Partial<SyncConfiguration>): Promise<void> => {
    try {
      const updatedConfig = await syncService.updateConfiguration(config);
      dispatch({ type: 'SET_CONFIGURATION', payload: updatedConfig });
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: 'success', 
          message: 'Configuration updated successfully', 
          timestamp: new Date(),
          read: false 
        } 
      });
    } catch (error) {
      const syncError: SyncError = {
        id: Date.now().toString(),
        message: error instanceof Error ? error.message : 'Failed to update configuration',
        timestamp: new Date(),
        source: 'configuration',
        severity: 'error',
      };
      dispatch({ type: 'ADD_ERROR', payload: syncError });
    }
  };

  // Start Full Sync
  const startFullSync = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'sync', loading: true } });
      dispatch({ 
        type: 'SET_CURRENT_SYNC', 
        payload: { 
          isRunning: true, 
          operation: 'Full Sync', 
          progress: 0, 
          startTime: new Date() 
        } 
      });

      const result = await syncService.startFullSync();
      
      dispatch({ type: 'ADD_SYNC_RESULT', payload: result });
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: result.status === 'completed' ? 'success' : 'error', 
          message: `Full sync ${result.status}`, 
          timestamp: new Date(),
          read: false 
        } 
      });
    } catch (error) {
      const syncError: SyncError = {
        id: Date.now().toString(),
        message: error instanceof Error ? error.message : 'Full sync failed',
        timestamp: new Date(),
        source: 'sync',
        severity: 'error',
      };
      dispatch({ type: 'ADD_ERROR', payload: syncError });
    } finally {
      dispatch({ 
        type: 'SET_CURRENT_SYNC', 
        payload: { 
          isRunning: false, 
          operation: null, 
          progress: 0, 
          startTime: null 
        } 
      });
      dispatch({ type: 'SET_LOADING', payload: { source: 'sync', loading: false } });
    }
  };

  // Start Incremental Sync
  const startIncrementalSync = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'sync', loading: true } });
      dispatch({ 
        type: 'SET_CURRENT_SYNC', 
        payload: { 
          isRunning: true, 
          operation: 'Incremental Sync', 
          progress: 0, 
          startTime: new Date() 
        } 
      });

      const result = await syncService.startIncrementalSync();
      
      dispatch({ type: 'ADD_SYNC_RESULT', payload: result });
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: result.status === 'completed' ? 'success' : 'error', 
          message: `Incremental sync ${result.status}`, 
          timestamp: new Date(),
          read: false 
        } 
      });
    } catch (error) {
      const syncError: SyncError = {
        id: Date.now().toString(),
        message: error instanceof Error ? error.message : 'Incremental sync failed',
        timestamp: new Date(),
        source: 'sync',
        severity: 'error',
      };
      dispatch({ type: 'ADD_ERROR', payload: syncError });
    } finally {
      dispatch({ 
        type: 'SET_CURRENT_SYNC', 
        payload: { 
          isRunning: false, 
          operation: null, 
          progress: 0, 
          startTime: null 
        } 
      });
      dispatch({ type: 'SET_LOADING', payload: { source: 'sync', loading: false } });
    }
  };

  // Start Custom Sync
  const startCustomSync = async (entities: string[]): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { source: 'sync', loading: true } });
      dispatch({ 
        type: 'SET_CURRENT_SYNC', 
        payload: { 
          isRunning: true, 
          operation: `Custom Sync (${entities.join(', ')})`, 
          progress: 0, 
          startTime: new Date() 
        } 
      });

      const result = await syncService.startCustomSync(entities);
      
      dispatch({ type: 'ADD_SYNC_RESULT', payload: result });
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: { 
          type: result.status === 'completed' ? 'success' : 'error', 
          message: `Custom sync ${result.status}`, 
          timestamp: new Date(),
          read: false 
        } 
      });
    } catch (error) {
      const syncError: SyncError = {
        id: Date.now().toString