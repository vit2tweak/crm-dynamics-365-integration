const { CosmosClient } = require('@azure/cosmos');
const axios = require('axios');

// Configuration
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'CRMIntegration';
const dynamics365BaseUrl = process.env.DYNAMICS_365_BASE_URL;
const nav2017BaseUrl = process.env.NAV_2017_BASE_URL;
const syncContainerId = process.env.SYNC_CONTAINER_ID || 'syncOperations';

// Initialize Cosmos client
const cosmosClient = new CosmosClient({
  endpoint: cosmosEndpoint,
  key: cosmosKey
});

const database = cosmosClient.database(databaseId);
const syncContainer = database.container(syncContainerId);

module.exports = async function (context, myTimer) {
  const timeStamp = new Date().toISOString();
  
  if (myTimer.isPastDue) {
    context.log('Sync trigger function is running late!');
  }

  context.log('Sync trigger function started at:', timeStamp);

  try {
    // Get sync configurations
    const syncConfigs = await getSyncConfigurations(context);
    
    // Process each sync configuration
    for (const config of syncConfigs) {
      if (config.enabled && shouldRunSync(config)) {
        await processSyncOperation(context, config);
      }
    }

    // Update sync status
    await updateSyncStatus(context, 'completed', timeStamp);
    
    context.log('Sync trigger function completed successfully at:', timeStamp);
    
  } catch (error) {
    context.log.error('Sync trigger function failed:', error);
    await updateSyncStatus(context, 'failed', timeStamp, error.message);
    throw error;
  }
};

async function getSyncConfigurations(context) {
  try {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.type = @type AND c.enabled = @enabled',
      parameters: [
        { name: '@type', value: 'syncConfiguration' },
        { name: '@enabled', value: true }
      ]
    };

    const { resources } = await syncContainer.items.query(querySpec).fetchAll();
    context.log(`Found ${resources.length} enabled sync configurations`);
    
    return resources;
  } catch (error) {
    context.log.error('Error fetching sync configurations:', error);
    return [];
  }
}

function shouldRunSync(config) {
  const now = new Date();
  const lastRun = config.lastRun ? new Date(config.lastRun) : new Date(0);
  const intervalMs = config.intervalMinutes * 60 * 1000;
  
  return (now - lastRun) >= intervalMs;
}

async function processSyncOperation(context, config) {
  const operationId = generateOperationId();
  
  try {
    context.log(`Starting sync operation ${operationId} for ${config.name}`);
    
    // Create sync operation record
    const syncOperation = {
      id: operationId,
      type: 'syncOperation',
      configId: config.id,
      configName: config.name,
      status: 'running',
      startTime: new Date().toISOString(),
      sourceSystem: config.sourceSystem,
      targetSystem: config.targetSystem,
      entityType: config.entityType,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: []
    };

    await syncContainer.items.create(syncOperation);

    // Perform the actual sync based on configuration
    const result = await performSync(context, config, operationId);
    
    // Update operation with results
    syncOperation.status = result.success ? 'completed' : 'failed';
    syncOperation.endTime = new Date().toISOString();
    syncOperation.recordsProcessed = result.recordsProcessed;
    syncOperation.recordsSucceeded = result.recordsSucceeded;
    syncOperation.recordsFailed = result.recordsFailed;
    syncOperation.errors = result.errors;
    syncOperation.duration = calculateDuration(syncOperation.startTime, syncOperation.endTime);

    await syncContainer.items.upsert(syncOperation);
    
    // Update configuration last run time
    config.lastRun = new Date().toISOString();
    await syncContainer.items.upsert(config);
    
    context.log(`Sync operation ${operationId} completed: ${result.recordsSucceeded}/${result.recordsProcessed} records synced`);
    
  } catch (error) {
    context.log.error(`Sync operation ${operationId} failed:`, error);
    
    // Update operation with error
    try {
      const failedOperation = {
        id: operationId,
        type: 'syncOperation',
        configId: config.id,
        configName: config.name,
        status: 'failed',
        endTime: new Date().toISOString(),
        errors: [{ message: error.message, stack: error.stack }]
      };
      
      await syncContainer.items.upsert(failedOperation);
    } catch (updateError) {
      context.log.error('Failed to update operation status:', updateError);
    }
    
    throw error;
  }
}

async function performSync(context, config, operationId) {
  const result = {
    success: true,
    recordsProcessed: 0,
    recordsSucceeded: 0,
    recordsFailed: 0,
    errors: []
  };

  try {
    // Get data from source system
    const sourceData = await getSourceData(context, config);
    result.recordsProcessed = sourceData.length;
    
    context.log(`Retrieved ${sourceData.length} records from ${config.sourceSystem}`);
    
    // Process each record
    for (const record of sourceData) {
      try {
        // Transform data according to mapping rules
        const transformedRecord = await transformRecord(record, config.fieldMappings);
        
        // Send to target system
        await sendToTargetSystem(context, transformedRecord, config);
        
        result.recordsSucceeded++;
        
      } catch (recordError) {
        result.recordsFailed++;
        result.errors.push({
          recordId: record.id || 'unknown',
          message: recordError.message,
          timestamp: new Date().toISOString()
        });
        
        context.log.error(`Failed to sync record ${record.id}:`, recordError);
      }
    }
    
    result.success = result.recordsFailed === 0;
    
  } catch (error) {
    result.success = false;
    result.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  return result;
}

async function getSourceData(context, config) {
  switch (config.sourceSystem) {
    case 'dynamics365':
      return await getDynamics365Data(context, config);
    case 'nav2017':
      return await getNAV2017Data(context, config);
    case 'cosmosdb':
      return await getCosmosDBData(context, config);
    default:
      throw new Error(`Unsupported source system: ${config.sourceSystem}`);
  }
}

async function getDynamics365Data(context, config) {
  try {
    const accessToken = await getDynamics365AccessToken();
    const response = await axios.get(`${dynamics365BaseUrl}/api/data/v9.2/${config.entitySet}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json'
      },
      params: {
        '$filter': config.filter || '',
        '$select': config.selectFields || '',
        '$top': config.batchSize || 1000
      }
    });
    
    return response.data.value || [];
  } catch (error) {
    context.log.error('Error fetching Dynamics 365 data:', error);
    throw error;
  }
}

async function getNAV2017Data(context, config) {
  try {
    const auth = Buffer.from(`${process.env.NAV_USERNAME}:${process.env.NAV_PASSWORD}`).toString('base64');
    const response = await axios.get(`${nav2017BaseUrl}/${config.serviceName}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      params: {
        '$filter': config.filter || '',
        '$top': config.batchSize || 1000
      }
    });
    
    return response.data.value || [];
  } catch (error) {
    context.log.error('Error fetching NAV 2017 data:', error);
    throw error;
  }
}

async function getCosmosDBData(context, config) {
  try {
    const container = database.container(config.containerName);
    const querySpec = {
      query: config.query || 'SELECT * FROM c',
      parameters: config.queryParameters || []
    };
    
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (error) {
    context.log.error('Error fetching Cosmos DB data:', error);
    throw error;
  }
}

async function transformRecord(record, fieldMappings) {
  const transformed = {};
  
  for (const mapping of fieldMappings) {
    try {
      let value = getNestedValue(record, mapping.sourceField);
      
      // Apply transformation if specified
      if (mapping.transformation) {
        value = applyTransformation(value, mapping.transformation);
      }
      
      setNestedValue(transformed, mapping.targetField, value);
    } catch (error) {
      console.error(`Error transforming field ${mapping.sourceField}:`, error);
    }
  }
  
  return transformed;
}

async function sendToTargetSystem(context, record, config) {
  switch (config.targetSystem) {
    case 'dynamics365':
      return await sendToDynamics365(context, record, config);
    case 'nav2017':
      return await sendToNAV2017(context, record, config);
    case 'cosmosdb':
      return await sendToCosmosDB(context, record, config);
    default:
      throw new Error(`Unsupported target system: ${config.targetSystem}`);
  }
}

async function sendToDynamics365(context, record, config) {
  const accessToken = await getDynamics365AccessToken();
  
  if (config.operation === 'create') {
    await axios.post(`${dynamics365BaseUrl}/api/data/v9.2/${config.targetEntitySet}`, record, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      }
    });
  } else if (config.operation === 'update') {
    const id = record[config.keyField];
    delete record[config.keyField];
    
    await axios.patch(`${dynamics365BaseUrl}/api/data/v9.2/${config.targetEntitySet}(${id})`, record, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      }
    });
  }
}

async function sendToNAV2017(context, record, config) {
  const auth = Buffer.from(`${process.env.NAV_USERNAME}:${process.env.NAV_PASSWORD}`).toString('base64');
  
  if (config.operation === 'create') {
    await axios.post(`${nav2017BaseUrl}/${config.targetServiceName}`, record, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
  } else if (config.operation === 'update') {
    const id = record[config.keyField];
    
    await axios.put(`${nav2017BaseUrl}/${config.targetServiceName}('${id}')`, record, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

async function sendToCosmosDB(context, record, config) {
  const container = database.container(config.targetContainerName);
  
  if (config.operation === 'create' || config.operation === 'upsert') {
    await container.items.upsert(record);
  } else if (config.operation === 'update') {
    await container.items.replace(record);
  }
}

async function getDynamics365AccessToken() {
  // Implementation would depend on your authentication method
  // This is a placeholder for the actual token acquisition logic
  return process.env.DYNAMICS_365_ACCESS_TOKEN;
}

async function updateSyncStatus(context, status, timestamp, error = null) {
  try {
    const syncStatus = {
      id: 'global-sync-status',
      type: 'syncStatus',
      status: status,
      lastRun: timestamp,
      error: error
    };
    
    await syncContainer.items.upsert(syncStatus);
  } catch (updateError) {
    context.log.error('Failed to update sync status:', updateError);
  }
}

// Utility functions
function generateOperationId() {
  return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateDuration(startTime, endTime) {
  return new Date(endTime) - new Date(startTime);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

function applyTransformation(value, transformation) {
  switch (transformation.type) {
    case 'dateFormat':
      return new Date(value).toISOString();
    case 'uppercase':
      return value ? value.toString().toUpperCase() : value;
    case 'lowercase':
      return value ? value.toString().toLowerCase() : value;
    case 'trim':
      return value ? value.toString().trim() : value;
    case 'default':
      return value || transformation.defaultValue;
    default:
      return value;
  }
}