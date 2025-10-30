// Cosmos DB Configuration

export interface CosmosDBConfig {
  endpoint: string;
  key: string;
  databaseId: string;
  containers: {
    products: string;
    inventory: string;
    categories: string;
    suppliers: string;
    priceHistory: string;
    stockMovements: string;
  };
  connectionPolicy: {
    requestTimeout: number;
    mediaRequestTimeout: number;
    enableEndpointDiscovery: boolean;
    preferredLocations: string[];
    retryOptions: {
      maxRetryAttemptCount: number;
      fixedRetryIntervalInMilliseconds: number;
      maxWaitTimeInSeconds: number;
    };
  };
  consistencyLevel: 'Strong' | 'BoundedStaleness' | 'Session' | 'ConsistentPrefix' | 'Eventual';
}

export interface CosmosDBQueryOptions {
  maxItemCount?: number;
  continuationToken?: string;
  enableCrossPartitionQuery?: boolean;
  maxDegreeOfParallelism?: number;
  bufferItems?: boolean;
  enableScanInQuery?: boolean;
}

// Default configuration
export const cosmosDBConfig: CosmosDBConfig = {
  endpoint: process.env.REACT_APP_COSMOSDB_ENDPOINT || 'https://your-cosmosdb.documents.azure.com:443/',
  key: process.env.REACT_APP_COSMOSDB_KEY || '',
  databaseId: process.env.REACT_APP_COSMOSDB_DATABASE_ID || 'ProductWarehouse',
  containers: {
    products: process.env.REACT_APP_COSMOSDB_PRODUCTS_CONTAINER || 'Products',
    inventory: process.env.REACT_APP_COSMOSDB_INVENTORY_CONTAINER || 'Inventory',
    categories: process.env.REACT_APP_COSMOSDB_CATEGORIES_CONTAINER || 'Categories',
    suppliers: process.env.REACT_APP_COSMOSDB_SUPPLIERS_CONTAINER || 'Suppliers',
    priceHistory: process.env.REACT_APP_COSMOSDB_PRICE_HISTORY_CONTAINER || 'PriceHistory',
    stockMovements: process.env.REACT_APP_COSMOSDB_STOCK_MOVEMENTS_CONTAINER || 'StockMovements'
  },
  connectionPolicy: {
    requestTimeout: parseInt(process.env.REACT_APP_COSMOSDB_REQUEST_TIMEOUT || '30000'),
    mediaRequestTimeout: parseInt(process.env.REACT_APP_COSMOSDB_MEDIA_REQUEST_TIMEOUT || '30000'),
    enableEndpointDiscovery: process.env.REACT_APP_COSMOSDB_ENABLE_ENDPOINT_DISCOVERY !== 'false',
    preferredLocations: (process.env.REACT_APP_COSMOSDB_PREFERRED_LOCATIONS || 'East US,West US').split(','),
    retryOptions: {
      maxRetryAttemptCount: parseInt(process.env.REACT_APP_COSMOSDB_MAX_RETRY_ATTEMPTS || '3'),
      fixedRetryIntervalInMilliseconds: parseInt(process.env.REACT_APP_COSMOSDB_RETRY_INTERVAL || '1000'),
      maxWaitTimeInSeconds: parseInt(process.env.REACT_APP_COSMOSDB_MAX_WAIT_TIME || '30')
    }
  },
  consistencyLevel: (process.env.REACT_APP_COSMOSDB_CONSISTENCY_LEVEL as any) || 'Session'
};

// Container partition key configurations
export const cosmosDBPartitionKeys = {
  products: '/category',
  inventory: '/productId',
  categories: '/parentCategoryId',
  suppliers: '/region',
  priceHistory: '/productId',
  stockMovements: '/warehouseId'
};

// Index policies for containers
export const cosmosDBIndexPolicies = {
  products: {
    indexingMode: 'consistent',
    automatic: true,
    includedPaths: [
      { path: '/*' },
      { path: '/name/?', indexes: [{ kind: 'Range', dataType: 'String', precision: -1 }] },
      { path: '/category/?', indexes: [{ kind: 'Range', dataType: 'String', precision: -1 }] },
      { path: '/price/?', indexes: [{ kind: 'Range', dataType: 'Number', precision: -1 }] },
      { path: '/lastModified/?', indexes: [{ kind: 'Range', dataType: 'String', precision: -1 }] }
    ],
    excludedPaths: [
      { path: '/description/*' },
      { path: '/specifications/*' }
    ]
  },
  inventory: {
    indexingMode: 'consistent',
    automatic: true,
    includedPaths: [
      { path: '/*' },
      { path: '/productId/?', indexes: [{ kind: 'Range', dataType: 'String', precision: -1 }] },
      { path: '/warehouseId/?', indexes: [{ kind: 'Range', dataType: 'String', precision: -1 }] },
      { path: '/quantity/?', indexes: [{ kind: 'Range', dataType: 'Number', precision: -1 }] },
      { path: '/lastUpdated/?', indexes: [{ kind: 'Range', dataType: 'String', precision: -1 }] }
    ],
    excludedPaths: []
  }
};

// Query templates for common operations
export const cosmosDBQueries = {
  products: {
    getByCategory: "SELECT * FROM c WHERE c.category = @category",
    getByPriceRange: "SELECT * FROM c WHERE c.price >= @minPrice AND c.price <= @maxPrice",
    searchByName: "SELECT * FROM c WHERE CONTAINS(UPPER(c.name), UPPER(@searchTerm))",
    getActiveProducts: "SELECT * FROM c WHERE c.isActive = true",
    getBySupplier: "SELECT * FROM c WHERE c.supplierId = @supplierId",
    getRecentlyModified: "SELECT * FROM c WHERE c.lastModified >= @fromDate ORDER BY c.lastModified DESC"
  },
  inventory: {
    getByProduct: "SELECT * FROM c WHERE c.productId = @productId",
    getLowStock: "SELECT * FROM c WHERE c.quantity <= c.reorderLevel",
    getByWarehouse: "SELECT * FROM c WHERE c.warehouseId = @warehouseId",
    getOutOfStock: "SELECT * FROM c WHERE c.quantity = 0",
    getTotalInventoryValue: "SELECT SUM(c.quantity * c.unitCost) as totalValue FROM c"
  },
  stockMovements: {
    getByProduct: "SELECT * FROM c WHERE c.productId = @productId ORDER BY c.movementDate DESC",
    getByDateRange: "SELECT * FROM c WHERE c.movementDate >= @startDate AND c.movementDate <= @endDate",
    getByType: "SELECT * FROM c WHERE c.movementType = @movementType",
    getByWarehouse: "SELECT * FROM c WHERE c.warehouseId = @warehouseId ORDER BY c.movementDate DESC"
  }
};

// Stored procedures
export const cosmosDBStoredProcedures = {
  updateInventoryQuantity: 'updateInventoryQuantity',
  bulkInsertProducts: 'bulkInsertProducts',
  calculateInventoryValue: 'calculateInventoryValue',
  processStockMovement: 'processStockMovement',
  syncProductData: 'syncProductData'
};

// User-defined functions
export const cosmosDBUserDefinedFunctions = {
  calculateDiscountedPrice: 'calculateDiscountedPrice',
  formatProductCode: 'formatProductCode',
  validateInventoryData: 'validateInventoryData'
};

// Triggers
export const cosmosDBTriggers = {
  preInsertProduct: 'preInsertProduct',
  postUpdateInventory: 'postUpdateInventory',
  auditStockMovement: 'auditStockMovement'
};

// Error codes and messages
export const cosmosDBErrorCodes = {
  AUTHENTICATION_FAILED: 'COSMOSDB_AUTH_FAILED',
  INVALID_REQUEST: 'COSMOSDB_INVALID_REQUEST',
  RESOURCE_NOT_FOUND: 'COSMOSDB_RESOURCE_NOT_FOUND',
  CONFLICT: 'COSMOSDB_CONFLICT',
  PRECONDITION_FAILED: 'COSMOSDB_PRECONDITION_FAILED',
  REQUEST_RATE_TOO_LARGE: 'COSMOSDB_RATE_LIMIT_EXCEEDED',
  PARTITION_KEY_MISMATCH: 'COSMOSDB_PARTITION_KEY_MISMATCH',
  QUERY_TIMEOUT: 'COSMOSDB_QUERY_TIMEOUT',
  INSUFFICIENT_PERMISSIONS: 'COSMOSDB_INSUFFICIENT_PERMISSIONS',
  SERVICE_UNAVAILABLE: 'COSMOSDB_SERVICE_UNAVAILABLE'
};

// HTTP status code mappings
export const cosmosDBHttpStatusCodes = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  412: 'Precondition Failed',
  413: 'Request Entity Too Large',
  429: 'Too Many Requests',
  449: 'Retry With',
  500: 'Internal Server Error',
  503: 'Service Unavailable'
};

// Performance monitoring thresholds
export const cosmosDBPerformanceThresholds = {
  requestUnitsPerSecond: parseInt(process.env.REACT_APP_COSMOSDB_RU_THRESHOLD || '1000'),
  queryExecutionTimeMs: parseInt(process.env.REACT_APP_COSMOSDB_QUERY_TIME_THRESHOLD || '5000'),
  maxItemsPerQuery: parseInt(process.env.REACT_APP_COSMOSDB_MAX_ITEMS_PER_QUERY || '1000'),
  maxQueryComplexity: parseInt(process.env.REACT_APP_COSMOSDB_MAX_QUERY_COMPLEXITY || '10')
};

// Helper function to build connection string
export const buildCosmosDBConnectionString = (): string => {
  return `AccountEndpoint=${cosmosDBConfig.endpoint};AccountKey=${cosmosDBConfig.key};`;
};

// Helper function to get container configuration
export const getContainerConfig = (containerName: keyof typeof cosmosDBConfig.containers) => {
  return {
    id: cosmosDBConfig.containers[containerName],
    partitionKey: cosmosDBPartitionKeys[containerName],
    indexingPolicy: cosmosDBIndexPolicies[containerName] || cosmosDBIndexPolicies.products
  };
};

export default cosmosDBConfig;