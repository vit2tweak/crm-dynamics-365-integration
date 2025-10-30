import { dynamics365Service } from './dynamics365Service';
import { nav2017Service } from './nav2017Service';
import { cosmosdbService } from './cosmosdbService';
import { 
  SyncConfiguration, 
  SyncStatus, 
  SyncResult, 
  SyncError, 
  SyncMapping, 
  SyncConflict,
  SyncOperation,
  SyncSchedule,
  SyncMetrics
} from '../types';
import { Customer, Product, SalesOrder } from '../types/customer';

class SyncService {
  private syncConfigurations: Map<string, SyncConfiguration> = new Map();
  private activeSyncs: Map<string, SyncStatus> = new Map();
  private syncHistory: SyncResult[] = [];
  private conflictResolutionRules: Map<string, (conflict: SyncConflict) => any> = new Map();

  constructor() {
    this.initializeDefaultConfigurations();
    this.initializeConflictResolutionRules();
  }

  private initializeDefaultConfigurations(): void {
    // Customer sync configuration
    this.syncConfigurations.set('customers', {
      id: 'customers',
      name: 'Customer Synchronization',
      source: 'dynamics365',
      targets: ['nav2017'],
      mappings: [
        {
          sourceField: 'accountid',
          targetField: 'No',
          transformation: 'direct',
          required: true
        },
        {
          sourceField: 'name',
          targetField: 'Name',
          transformation: 'direct',
          required: true
        },
        {
          sourceField: 'emailaddress1',
          targetField: 'E_Mail',
          transformation: 'direct',
          required: false
        }
      ],
      schedule: {
        type: 'interval',
        intervalMinutes: 15,
        enabled: true
      },
      conflictResolution: 'source-wins',
      enabled: true,
      lastSync: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Product sync configuration
    this.syncConfigurations.set('products', {
      id: 'products',
      name: 'Product Synchronization',
      source: 'cosmosdb',
      targets: ['dynamics365', 'nav2017'],
      mappings: [
        {
          sourceField: 'productNumber',
          targetField: 'productnumber',
          transformation: 'direct',
          required: true
        },
        {
          sourceField: 'name',
          targetField: 'name',
          transformation: 'direct',
          required: true
        }
      ],
      schedule: {
        type: 'interval',
        intervalMinutes: 30,
        enabled: true
      },
      conflictResolution: 'manual',
      enabled: true,
      lastSync: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  private initializeConflictResolutionRules(): void {
    this.conflictResolutionRules.set('source-wins', (conflict: SyncConflict) => conflict.sourceValue);
    this.conflictResolutionRules.set('target-wins', (conflict: SyncConflict) => conflict.targetValue);
    this.conflictResolutionRules.set('newest-wins', (conflict: SyncConflict) => {
      const sourceDate = new Date(conflict.sourceTimestamp);
      const targetDate = new Date(conflict.targetTimestamp);
      return sourceDate > targetDate ? conflict.sourceValue : conflict.targetValue;
    });
  }

  // Main sync operations
  async startSync(configurationId: string, options?: { force?: boolean; dryRun?: boolean }): Promise<SyncResult> {
    const configuration = this.syncConfigurations.get(configurationId);
    if (!configuration) {
      throw new Error(`Sync configuration '${configurationId}' not found`);
    }

    if (!configuration.enabled && !options?.force) {
      throw new Error(`Sync configuration '${configurationId}' is disabled`);
    }

    const syncId = `${configurationId}-${Date.now()}`;
    const syncStatus: SyncStatus = {
      id: syncId,
      configurationId,
      status: 'running',
      startTime: new Date().toISOString(),
      progress: 0,
      processedRecords: 0,
      totalRecords: 0,
      errors: [],
      conflicts: []
    };

    this.activeSyncs.set(syncId, syncStatus);

    try {
      const result = await this.executeSyncOperation(configuration, syncStatus, options);
      
      // Update sync history
      this.syncHistory.unshift(result);
      if (this.syncHistory.length > 100) {
        this.syncHistory = this.syncHistory.slice(0, 100);
      }

      // Update configuration last sync time
      configuration.lastSync = result.endTime;
      this.syncConfigurations.set(configurationId, configuration);

      return result;
    } catch (error) {
      const errorResult: SyncResult = {
        id: syncId,
        configurationId,
        status: 'failed',
        startTime: syncStatus.startTime,
        endTime: new Date().toISOString(),
        duration: Date.now() - new Date(syncStatus.startTime).getTime(),
        processedRecords: syncStatus.processedRecords,
        successfulRecords: 0,
        failedRecords: syncStatus.processedRecords,
        conflicts: syncStatus.conflicts,
        errors: [...syncStatus.errors, {
          code: 'SYNC_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown sync error',
          timestamp: new Date().toISOString(),
          details: error
        }],
        metrics: this.calculateSyncMetrics(syncStatus)
      };

      this.syncHistory.unshift(errorResult);
      return errorResult;
    } finally {
      this.activeSyncs.delete(syncId);
    }
  }

  private async executeSyncOperation(
    configuration: SyncConfiguration, 
    syncStatus: SyncStatus, 
    options?: { dryRun?: boolean }
  ): Promise<SyncResult> {
    const operations: SyncOperation[] = [];
    let processedRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;

    try {
      // Fetch source data
      const sourceData = await this.fetchSourceData(configuration.source, configuration);
      syncStatus.totalRecords = sourceData.length;
      this.activeSyncs.set(syncStatus.id, syncStatus);

      // Process each record
      for (const sourceRecord of sourceData) {
        try {
          const mappedData = this.applyMappings(sourceRecord, configuration.mappings);
          
          // Check for conflicts in each target
          for (const target of configuration.targets) {
            const existingRecord = await this.fetchTargetRecord(target, mappedData, configuration);
            
            if (existingRecord) {
              const conflicts = this.detectConflicts(mappedData, existingRecord, configuration.mappings);
              
              if (conflicts.length > 0) {
                syncStatus.conflicts.push(...conflicts);
                
                // Apply conflict resolution
                const resolvedData = await this.resolveConflicts(conflicts, configuration.conflictResolution);
                Object.assign(mappedData, resolvedData);
              }
            }

            // Create sync operation
            const operation: SyncOperation = {
              type: existingRecord ? 'update' : 'create',
              source: configuration.source,
              target,
              sourceRecord,
              mappedData,
              targetRecord: existingRecord,
              timestamp: new Date().toISOString()
            };

            operations.push(operation);

            // Execute operation if not dry run
            if (!options?.dryRun) {
              await this.executeOperation(operation);
            }

            successfulRecords++;
          }

          processedRecords++;
          syncStatus.processedRecords = processedRecords;
          syncStatus.progress = (processedRecords / syncStatus.totalRecords) * 100;
          this.activeSyncs.set(syncStatus.id, syncStatus);

        } catch (error) {
          failedRecords++;
          syncStatus.errors.push({
            code: 'RECORD_PROCESSING_ERROR',
            message: `Failed to process record: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            details: { sourceRecord, error }
          });
        }
      }

      const endTime = new Date().toISOString();
      const duration = Date.now() - new Date(syncStatus.startTime).getTime();

      return {
        id: syncStatus.id,
        configurationId: configuration.id,
        status: failedRecords > 0 ? 'completed-with-errors' : 'completed',
        startTime: syncStatus.startTime,
        endTime,
        duration,
        processedRecords,
        successfulRecords,
        failedRecords,
        conflicts: syncStatus.conflicts,
        errors: syncStatus.errors,
        operations: options?.dryRun ? operations : undefined,
        metrics: this.calculateSyncMetrics(syncStatus)
      };

    } catch (error) {
      throw error;
    }
  }

  private async fetchSourceData(source: string, configuration: SyncConfiguration): Promise<any[]> {
    switch (source) {
      case 'dynamics365':
        if (configuration.id === 'customers') {
          const response = await dynamics365Service.getAccounts();
          return response.success ? response.data.value : [];
        }
        break;
      
      case 'nav2017':
        if (configuration.id === 'customers') {
          const response = await nav2017Service.getCustomers();
          return response.success ? response.data : [];
        }
        break;
      
      case 'cosmosdb':
        if (configuration.id === 'products') {
          const response = await cosmosdbService.getProducts();
          return response.success ? response.data.items : [];
        }
        break;
      
      default:
        throw new Error(`Unknown source: ${source}`);
    }
    
    return [];
  }

  private async fetchTargetRecord(target: string, mappedData: any, configuration: SyncConfiguration): Promise<any | null> {
    try {
      const keyField = configuration.mappings.find(m => m.required)?.targetField;
      if (!keyField || !mappedData[keyField]) return null;

      switch (target) {
        case 'dynamics365':
          if (configuration.id === 'customers') {
            const response = await dynamics365Service.getAccountById(mappedData[keyField]);
            return response.success ? response.data : null;
          }
          break;
        
        case 'nav2017':
          if (configuration.id === 'customers') {
            const response = await nav2017Service.getCustomerById(mappedData[keyField]);
            return response.success ? response.data : null;
          }
          break;
        
        case 'cosmosdb':
          if (configuration.id === 'products') {
            const response = await cosmosdbService.getProductById(mappedData[keyField], mappedData[keyField]);
            return response.success ? response.data : null;
          }
          break;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching target record:', error);
      return null;
    }
  }

  private applyMappings(sourceRecord: any, mappings: SyncMapping[]): any {
    const mappedData: any = {};
    
    for (const mapping of mappings) {
      let value = sourceRecord[mapping.sourceField];
      
      // Apply transformation
      switch (mapping.transformation) {
        case 'direct':
          mappedData[mapping.targetField] = value;
          break;
        case 'uppercase':
          mappedData[mapping.targetField] = typeof value === 'string' ? value.toUpperCase() : value;
          break;
        case 'lowercase':
          mappedData[mapping.targetField] = typeof value === 'string' ? value.toLowerCase() : value;
          break;
        case 'custom':
          if (mapping.customTransformation) {
            mappedData[mapping.targetField] = mapping.customTransformation(value, sourceRecord);
          } else {
            mappedData[mapping.targetField] = value;
          }
          break;
        default:
          mappedData[mapping.targetField] = value;
      }
    }
    
    return mappedData;
  }

  private detectConflicts(mappedData: any, existingRecord: any, mappings: SyncMapping[]): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    
    for (const mapping of mappings) {
      const sourceValue = mappedData[mapping.targetField];
      const targetValue = existingRecord[mapping.targetField];
      
      if (sourceValue !== targetValue && targetValue !== undefined && targetValue !== null) {
        conflicts.push({
          field: mapping.targetField,
          sourceValue,
          targetValue,
          sourceTimestamp: new Date().toISOString(),
          targetTimestamp: existingRecord.modifiedon || existingRecord.lastModified || new Date().toISOString(),
          resolutionStrategy: 'pending'
        });
      }
    }
    
    return conflicts;
  }

  private async resolveConflicts(conflicts: SyncConflict[], strategy: string): Promise<any> {
    const resolvedData: any = {};
    const resolutionRule = this.conflictResolutionRules.get(strategy);
    
    if (!resolutionRule && strategy !== 'manual') {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
    
    for (const conflict of conflicts) {
      if (strategy === 'manual') {
        // For manual resolution, we'll keep the source value and mark for manual review
        resolvedData[conflict.field] = conflict.sourceValue;
        conflict.resolutionStrategy = 'manual-review-required';
      } else if (resolutionRule) {
        resolvedData[conflict.field] = resolutionRule(conflict);
        conflict.resolutionStrategy = strategy;
      }
    }
    
    return resolvedData;
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.target) {
      case 'dynamics365':
        if (operation.type === 'create') {
          await dynamics365Service.createAccount(operation.mappedData);
        } else {
          const keyField = Object.keys(operation.mappedData)[0];
          await dynamics365Service.updateAccount(operation.mappedData[keyField], operation.mappedData);
        }
        break;
      
      case 'nav2017':
        if (operation.type === 'create') {
          await nav2017Service.createCustomer(operation.mappedData);
        } else {
          await nav2017Service.updateCustomer(operation.mappedData.No, operation.mappedData);
        }
        break;
      
      case 'cosmosdb':
        if (operation.type === 'create') {
          await cosmosdbService.createProduct(operation.mappedData);
        } else {
          await cosmosdbService.updateProduct(
            operation.mappedData.id, 
            operation.mappedData.partitionKey, 
            operation.mappedData
          );
        }
        break;
      
      default:
        throw new Error(`Unknown target: ${operation.target}`);
    }
  }

  private calculateSyncMetrics(syncStatus: SyncStatus): SyncMetrics {
    const duration = Date.now() - new Date(syncStatus.startTime).getTime();
    
    return {
      duration,
      recordsPerSecond: syncStatus.processedRecords / (duration / 1000),
      errorRate: syncStatus.errors.length / Math.max(syncStatus.processedRecords, 1),
      conflictRate: syncStatus.conflicts.length / Math.max(syncStatus.processedRecords, 1),
      throughput: syncStatus.processedRecords / (duration / 1000 / 60) // records per minute
    };
  }

  // Configuration management
  getSyncConfigurations(): SyncConfiguration[] {
    return Array.from(this.syncConfigurations.values());
  }

  getSyncConfiguration(id: string): SyncConfiguration | undefined {
    return this.syncConfigurations.get(id);
  }

  updateSyncConfiguration(id: string, updates: Partial<SyncConfiguration>): void {
    const existing = this.syncConfigurations.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      this.syncConfigurations.set(id, updated);
    }
  }

  // Status and monitoring
  getActiveSyncs(): SyncStatus[] {
    return Array.from(this.activeSyncs.values());
  }

  getSyncHistory(limit: number = 50): SyncResult[] {
    return this.syncHistory.slice(0, limit);
  }

  getSyncStatus(syncId: string): SyncStatus | undefined {
    return this.activeSyncs.get(syncId);
  }

  async cancelSync(syncId: string): Promise<boolean> {
    const syncStatus = this.activeSyncs.get(syncId);
    if (syncStatus) {
      syncStatus.status = 'cancelled';
      this.activeSyncs.set(syncId, syncStatus);
      return true;
    }
    return false;
  }

  // Health check
  async getSystemHealth(): Promise<{
    dynamics365: boolean;
    nav2017: boolean;
    cosmosdb: boolean;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const [d365Health, navHealth, cosmosHealth] = await Promise.all([
      dynamics365Service.getConnectionStatus(),
      nav2017Service.getConnectionStatus(),
      cosmosdbService.getConnectionStatus()
    ]);

    const healthyCount = [d365Health, navHealth, cosmosHealth].filter(Boolean).length;
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyCount === 3) {
      overallHealth = 'healthy';
    } else if (healthyCount >= 2) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'unhealthy';
    }

    return {
      dynamics365: d365Health,
      nav2017: navHealth,
      cosmosdb: cosmosHealth,
      overallHealth
    };
  }
}

export const syncService = new SyncService();
export default syncService;