import { SyncConfiguration, SyncStatus, SyncOperation, SyncResult, SyncConflict, SyncMapping } from '../types/index';
import { Customer } from '../types/customer';
import { D365Account, D365Contact, D365Opportunity } from '../types/dynamics365';
import { NAVCustomer, NAVItem, NAVSalesOrder } from '../types/nav2017';
import { CosmosProduct, CosmosInventory } from '../types/cosmosdb';

// Sync status helpers
export const createSyncStatus = (
  operation: SyncOperation,
  status: 'pending' | 'running' | 'completed' | 'failed' = 'pending'
): SyncStatus => ({
  id: generateSyncId(),
  operation,
  status,
  startTime: new Date(),
  endTime: undefined,
  recordsProcessed: 0,
  recordsSucceeded: 0,
  recordsFailed: 0,
  errors: [],
  conflicts: [],
  metadata: {}
});

// Generate unique sync ID
export const generateSyncId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `sync_${timestamp}_${random}`;
};

// Calculate sync progress
export const calculateSyncProgress = (syncStatus: SyncStatus): number => {
  if (syncStatus.recordsProcessed === 0) return 0;
  return Math.round((syncStatus.recordsSucceeded / syncStatus.recordsProcessed) * 100);
};

// Check if sync is complete
export const isSyncComplete = (syncStatus: SyncStatus): boolean => {
  return syncStatus.status === 'completed' || syncStatus.status === 'failed';
};

// Get sync duration
export const getSyncDuration = (syncStatus: SyncStatus): number => {
  if (!syncStatus.endTime) return 0;
  return syncStatus.endTime.getTime() - syncStatus.startTime.getTime();
};

// Format sync duration
export const formatSyncDuration = (duration: number): string => {
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${Math.round(duration / 1000)}s`;
  if (duration < 3600000) return `${Math.round(duration / 60000)}m`;
  return `${Math.round(duration / 3600000)}h`;
};

// Data mapping utilities
export const mapD365AccountToCustomer = (account: D365Account): Customer => ({
  id: account.accountid,
  name: account.name,
  accountNumber: account.accountnumber || '',
  email: account.emailaddress1 || '',
  phone: account.telephone1 || '',
  website: account.websiteurl || '',
  address: {
    street: account.address1_line1 || '',
    city: account.address1_city || '',
    state: account.address1_stateorprovince || '',
    postalCode: account.address1_postalcode || '',
    country: account.address1_country || ''
  },
  creditLimit: account.creditlimit || 0,
  status: account.statecode === 0 ? 'active' : 'inactive',
  type: 'account',
  source: 'dynamics365',
  lastModified: new Date(account.modifiedon || Date.now()),
  syncStatus: 'synced'
});

export const mapCustomerToD365Account = (customer: Customer): Partial<D365Account> => ({
  name: customer.name,
  accountnumber: customer.accountNumber,
  emailaddress1: customer.email,
  telephone1: customer.phone,
  websiteurl: customer.website,
  address1_line1: customer.address?.street,
  address1_city: customer.address?.city,
  address1_stateorprovince: customer.address?.state,
  address1_postalcode: customer.address?.postalCode,
  address1_country: customer.address?.country,
  creditlimit: customer.creditLimit,
  statecode: customer.status === 'active' ? 0 : 1
});

export const mapNAVCustomerToCustomer = (navCustomer: NAVCustomer): Customer => ({
  id: navCustomer.No,
  name: navCustomer.Name,
  accountNumber: navCustomer.No,
  email: navCustomer.EMail || '',
  phone: navCustomer.PhoneNo || '',
  website: navCustomer.HomePage || '',
  address: {
    street: navCustomer.Address,
    city: navCustomer.City,
    state: navCustomer.County || '',
    postalCode: navCustomer.PostCode,
    country: navCustomer.CountryRegionCode || ''
  },
  creditLimit: navCustomer.CreditLimitLCY || 0,
  status: navCustomer.Blocked ? 'inactive' : 'active',
  type: 'customer',
  source: 'nav2017',
  lastModified: new Date(navCustomer.LastModifiedDateTime || Date.now()),
  syncStatus: 'synced'
});

export const mapCustomerToNAVCustomer = (customer: Customer): Partial<NAVCustomer> => ({
  Name: customer.name,
  EMail: customer.email,
  PhoneNo: customer.phone,
  HomePage: customer.website,
  Address: customer.address?.street || '',
  City: customer.address?.city || '',
  County: customer.address?.state,
  PostCode: customer.address?.postalCode || '',
  CountryRegionCode: customer.address?.country,
  CreditLimitLCY: customer.creditLimit,
  Blocked: customer.status !== 'active'
});

// Conflict detection
export const detectConflicts = (
  sourceRecord: any,
  targetRecord: any,
  mapping: SyncMapping
): SyncConflict[] => {
  const conflicts: SyncConflict[] = [];

  mapping.fieldMappings.forEach(fieldMapping => {
    const sourceValue = getNestedValue(sourceRecord, fieldMapping.sourceField);
    const targetValue = getNestedValue(targetRecord, fieldMapping.targetField);

    if (sourceValue !== targetValue) {
      conflicts.push({
        id: `${sourceRecord.id}_${fieldMapping.sourceField}`,
        recordId: sourceRecord.id,
        field: fieldMapping.targetField,
        sourceValue,
        targetValue,
        conflictType: 'field_mismatch',
        resolution: 'manual',
        timestamp: new Date()
      });
    }
  });

  return conflicts;
};

// Resolve conflicts based on strategy
export const resolveConflict = (
  conflict: SyncConflict,
  strategy: 'source_wins' | 'target_wins' | 'newest_wins' | 'manual'
): any => {
  switch (strategy) {
    case 'source_wins':
      return conflict.sourceValue;
    case 'target_wins':
      return conflict.targetValue;
    case 'newest_wins':
      // This would require timestamp comparison logic
      return conflict.sourceValue; // Default to source for now
    case 'manual':
    default:
      return null; // Requires manual intervention
  }
};

// Data transformation utilities
export const transformData = (
  data: any,
  transformations: Array<{ field: string; transform: (value: any) => any }>
): any => {
  const transformed = { ...data };

  transformations.forEach(({ field, transform }) => {
    const value = getNestedValue(transformed, field);
    if (value !== undefined) {
      setNestedValue(transformed, field, transform(value));
    }
  });

  return transformed;
};

// Get nested object value
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Set nested object value
export const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

// Batch processing utilities
export const createBatches = <T>(items: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
};

// Retry logic for failed operations
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
};

// Sync result aggregation
export const aggregateSyncResults = (results: SyncResult[]): SyncResult => {
  const aggregated: SyncResult = {
    operation: 'bulk_sync',
    success: true,
    recordsProcessed: 0,
    recordsSucceeded: 0,
    recordsFailed: 0,
    errors: [],
    conflicts: [],
    duration: 0,
    timestamp: new Date()
  };

  results.forEach(result => {
    aggregated.recordsProcessed += result.recordsProcessed;
    aggregated.recordsSucceeded += result.recordsSucceeded;
    aggregated.recordsFailed += result.recordsFailed;
    aggregated.errors.push(...result.errors);
    aggregated.conflicts.push(...result.conflicts);
    aggregated.duration += result.duration;
    
    if (!result.success) {
      aggregated.success = false;
    }
  });

  return aggregated;
};

// Sync configuration validation
export const validateSyncConfiguration = (config: SyncConfiguration): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Configuration name is required');
  }

  if (!config.source || !config.target) {
    errors.push('Both source and target systems must be specified');
  }

  if (!config.mappings || config.mappings.length === 0) {
    errors.push('At least one mapping must be configured');
  }

  config.mappings?.forEach((mapping, index) => {
    if (!mapping.sourceEntity || !mapping.targetEntity) {
      errors.push(`Mapping ${index + 1}: Source and target entities are required`);
    }

    if (!mapping.fieldMappings || mapping.fieldMappings.length === 0) {
      errors.push(`Mapping ${index + 1}: At least one field mapping is required`);
    }
  });

  if (config.schedule) {
    if (config.schedule.frequency && !['manual', 'hourly', 'daily', 'weekly'].includes(config.schedule.frequency)) {
      errors.push('Invalid schedule frequency');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate sync report
export const generateSyncReport = (syncStatus: SyncStatus): string => {
  const duration = getSyncDuration(syncStatus);
  const progress = calculateSyncProgress(syncStatus);
  
  return `
Sync Report
===========
Operation: ${syncStatus.operation}
Status: ${syncStatus.status}
Duration: ${formatSyncDuration(duration)}
Progress: ${progress}%

Records:
- Processed: ${syncStatus.recordsProcessed}
- Succeeded: ${syncStatus.recordsSucceeded}
- Failed: ${syncStatus.recordsFailed}

Errors: ${syncStatus.errors.length}
Conflicts: ${syncStatus.conflicts.length}

Started: ${syncStatus.startTime.toISOString()}
${syncStatus.endTime ? `Ended: ${syncStatus.endTime.toISOString()}` : 'Still running...'}
  `.trim();
};

// Data quality checks
export const performDataQualityCheck = (data: any[]): { score: number; issues: string[] } => {
  const issues: string[] = [];
  let totalFields = 0;
  let validFields = 0;

  data.forEach((record, index) => {
    Object.entries(record).forEach(([field, value]) => {
      totalFields++;
      
      if (value === null || value === undefined || value === '') {
        issues.push(`Record ${index + 1}: Missing value for field '${field}'`);
      } else {
        validFields++;
      }
    });
  });

  const score = totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0;

  return { score, issues };
};

// Sync scheduling utilities
export const getNextSyncTime = (lastSync: Date, frequency: string): Date => {
  const next = new Date(lastSync);

  switch (frequency) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    default:
      return next; // Manual sync
  }

  return next;
};

export const shouldRunSync = (lastSync: Date, frequency: string): boolean => {
  if (frequency === 'manual') return false;
  
  const nextSync = getNextSyncTime(lastSync, frequency);
  return new Date() >= nextSync;
};