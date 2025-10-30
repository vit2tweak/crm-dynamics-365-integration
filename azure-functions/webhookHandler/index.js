const { CosmosClient } = require('@azure/cosmos');
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'CRMIntegration';
const webhookSecret = process.env.WEBHOOK_SECRET;
const dataProcessorUrl = process.env.DATA_PROCESSOR_URL;
const syncTriggerUrl = process.env.SYNC_TRIGGER_URL;

// Initialize Cosmos client
const cosmosClient = new CosmosClient({
  endpoint: cosmosEndpoint,
  key: cosmosKey
});

const database = cosmosClient.database(databaseId);

module.exports = async function (context, req) {
  context.log('Webhook handler function started');
  
  try {
    // Validate webhook signature if secret is configured
    if (webhookSecret && !validateWebhookSignature(req, webhookSecret)) {
      context.res = {
        status: 401,
        body: { error: 'Invalid webhook signature' }
      };
      return;
    }

    const { source, event, entityType, data, timestamp } = req.body;
    
    if (!source || !event || !entityType) {
      context.res = {
        status: 400,
        body: { error: 'Missing required parameters: source, event, entityType' }
      };
      return;
    }

    context.log(`Processing webhook: ${source} - ${event} - ${entityType}`);

    // Log incoming webhook
    await logWebhookEvent(context, {
      source,
      event,
      entityType,
      timestamp: timestamp || new Date().toISOString(),
      headers: req.headers,
      dataSize: JSON.stringify(data || {}).length
    });

    let result;

    switch (event) {
      case 'created':
        result = await handleCreateEvent(context, source, entityType, data);
        break;
      case 'updated':
        result = await handleUpdateEvent(context, source, entityType, data);
        break;
      case 'deleted':
        result = await handleDeleteEvent(context, source, entityType, data);
        break;
      case 'sync_requested':
        result = await handleSyncRequestEvent(context, source, entityType, data);
        break;
      case 'batch_update':
        result = await handleBatchUpdateEvent(context, source, entityType, data);
        break;
      default:
        result = await handleGenericEvent(context, source, event, entityType, data);
    }

    // Trigger related workflows
    await triggerWorkflows(context, source, event, entityType, data);

    context.res = {
      status: 200,
      body: {
        success: true,
        message: `Webhook processed successfully`,
        source,
        event,
        entityType,
        result,
        processedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    context.log.error('Webhook processing error:', error);
    
    // Log error
    await logWebhookError(context, {
      source: req.body?.source,
      event: req.body?.event,
      entityType: req.body?.entityType,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};

function validateWebhookSignature(req, secret) {
  const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];
  
  if (!signature) {
    return false;
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

async function handleCreateEvent(context, source, entityType, data) {
  context.log(`Handling create event for ${entityType} from ${source}`);
  
  // Store the new record
  const container = database.container('webhookEvents');
  const eventRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    partitionKey: entityType,
    source,
    event: 'created',
    entityType,
    entityId: data.id || data.accountid || data.No || 'unknown',
    data,
    timestamp: new Date().toISOString(),
    processed: false
  };
  
  await container.items.create(eventRecord);
  
  // Trigger data processing
  if (dataProcessorUrl) {
    try {
      await axios.post(dataProcessorUrl, {
        operation: 'transform',
        entityType,
        data,
        source,
        target: 'cosmosdb'
      });
    } catch (error) {
      context.log.warn('Failed to trigger data processor:', error.message);
    }
  }
  
  // Trigger sync to other systems
  await triggerCrossSystemSync(context, source, entityType, data, 'create');
  
  return { action: 'created', entityId: eventRecord.entityId };
}

async function handleUpdateEvent(context, source, entityType, data) {
  context.log(`Handling update event for ${entityType} from ${source}`);
  
  // Store the update event
  const container = database.container('webhookEvents');
  const eventRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    partitionKey: entityType,
    source,
    event: 'updated',
    entityType,
    entityId: data.id || data.accountid || data.No || 'unknown',
    data,
    timestamp: new Date().toISOString(),
    processed: false
  };
  
  await container.items.create(eventRecord);
  
  // Check for conflicts
  const conflicts = await checkForConflicts(context, entityType, data);
  
  if (conflicts.length > 0) {
    context.log.warn(`Conflicts detected for ${entityType}:`, conflicts);
    await handleConflicts(context, entityType, data, conflicts);
  } else {
    // Process the update
    if (dataProcessorUrl) {
      try {
        await axios.post(dataProcessorUrl, {
          operation: 'merge',
          entityType,
          data,
          source
        });
      } catch (error) {
        context.log.warn('Failed to trigger data processor:', error.message);
      }
    }
    
    // Trigger sync to other systems
    await triggerCrossSystemSync(context, source, entityType, data, 'update');
  }
  
  return { action: 'updated', entityId: eventRecord.entityId, conflicts: conflicts.length };
}

async function handleDeleteEvent(context, source, entityType, data) {
  context.log(`Handling delete event for ${entityType} from ${source}`);
  
  const entityId = data.id || data.accountid || data.No || 'unknown';
  
  // Store the delete event
  const container = database.container('webhookEvents');
  const eventRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    partitionKey: entityType,
    source,
    event: 'deleted',
    entityType,
    entityId,
    data,
    timestamp: new Date().toISOString(),
    processed: false
  };
  
  await container.items.create(eventRecord);
  
  // Mark as deleted in Cosmos DB (soft delete)
  try {
    const dataContainer = database.container(getContainerName(entityType));
    const { resource: existingRecord } = await dataContainer.item(entityId, entityType).read();
    
    if (existingRecord) {
      existingRecord.deleted = true;
      existingRecord.deletedAt = new Date().toISOString();
      existingRecord.deletedBy = source;
      
      await dataContainer.item(entityId, entityType).replace(existingRecord);
    }
  } catch (error) {
    context.log.warn('Failed to mark record as deleted:', error.message);
  }
  
  // Trigger sync to other systems
  await triggerCrossSystemSync(context, source, entityType, data, 'delete');
  
  return { action: 'deleted', entityId };
}

async function handleSyncRequestEvent(context, source, entityType, data) {
  context.log(`Handling sync request for ${entityType} from ${source}`);
  
  // Trigger immediate sync
  if (syncTriggerUrl) {
    try {
      await axios.post(syncTriggerUrl, {
        source,
        entityType,
        syncType: 'immediate',
        filter: data.filter || {},
        requestedBy: data.requestedBy || 'webhook'
      });
    } catch (error) {
      context.log.warn('Failed to trigger sync:', error.message);
    }
  }
  
  return { action: 'sync_triggered', entityType, source };
}

async function handleBatchUpdateEvent(context, source, entityType, data) {
  context.log(`Handling batch update for ${entityType} from ${source}`);
  
  const records = Array.isArray(data) ? data : [data];
  const results = [];
  
  for (const record of records) {
    try {
      const result = await handleUpdateEvent(context, source, entityType, record);
      results.push({ success: true, entityId: result.entityId, ...result });
    } catch (error) {
      results.push({ 
        success: false, 
        entityId: record.id || record.accountid || record.No || 'unknown',
        error: error.message 
      });
    }
  }
  
  return { action: 'batch_processed', totalRecords: records.length, results };
}

async function handleGenericEvent(context, source, event, entityType, data) {
  context.log(`Handling generic event: ${event} for ${entityType} from ${source}`);
  
  // Store the generic event
  const container = database.container('webhookEvents');
  const eventRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    partitionKey: entityType,
    source,
    event,
    entityType,
    entityId: data.id || data.accountid || data.No || 'unknown',
    data,
    timestamp: new Date().toISOString(),
    processed: false
  };
  
  await container.items.create(eventRecord);
  
  return { action: 'logged', event, entityType };
}

async function checkForConflicts(context, entityType, data) {
  const conflicts = [];
  const entityId = data.id || data.accountid || data.No;
  
  if (!entityId) return conflicts;
  
  try {
    // Check for recent updates from other sources
    const container = database.container('webhookEvents');
    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.entityType = @entityType 
        AND c.entityId = @entityId 
        AND c.timestamp > @recentTime 
        ORDER BY c.timestamp DESC
      `,
      parameters: [
        { name: '@entityType', value: entityType },
        { name: '@entityId', value: entityId },
        { name: '@recentTime', value: new Date(Date.now() - 5 * 60 * 1000).toISOString() } // Last 5 minutes
      ]
    };
    
    const { resources: recentEvents } = await container.items.query(querySpec).fetchAll();
    
    if (recentEvents.length > 1) {
      const sources = [...new Set(recentEvents.map(e => e.source))];
      if (sources.length > 1) {
        conflicts.push({
          type: 'concurrent_update',
          entityId,
          sources,
          events: recentEvents
        });
      }
    }
    
  } catch (error) {
    context.log.warn('Failed to check for conflicts:', error.message);
  }
  
  return conflicts;
}

async function handleConflicts(context, entityType, data, conflicts) {
  context.log(`Handling conflicts for ${entityType}:`, conflicts);
  
  // Store conflict information
  const container = database.container('syncConflicts');
  
  for (const conflict of conflicts) {
    const conflictRecord = {
      id: `${Date.now()}-${Math