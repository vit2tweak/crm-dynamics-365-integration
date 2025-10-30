import { CosmosClient, Database, Container, ItemResponse, FeedResponse } from '@azure/cosmos';
import { cosmosdbConfig } from '../config/cosmosdb';
import { 
  CosmosProduct, 
  CosmosInventory, 
  CosmosProductCategory, 
  CosmosProductQuery,
  CosmosInventoryUpdate,
  CosmosBulkOperation 
} from '../types/cosmosdb';
import { ApiResponse, PaginatedResponse } from '../types';

class CosmosDBService {
  private client: CosmosClient;
  private database: Database;
  private containers: {
    products: Container;
    inventory: Container;
    categories: Container;
    priceList: Container;
  };
  private isInitialized = false;

  constructor() {
    this.client = new CosmosClient({
      endpoint: cosmosdbConfig.endpoint,
      key: cosmosdbConfig.key,
      connectionPolicy: {
        requestTimeout: cosmosdbConfig.timeout,
        enableEndpointDiscovery: true,
        preferredLocations: cosmosdbConfig.preferredRegions
      }
    });
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.database = this.client.database(cosmosdbConfig.databaseId);
      
      this.containers = {
        products: this.database.container(cosmosdbConfig.containers.products),
        inventory: this.database.container(cosmosdbConfig.containers.inventory),
        categories: this.database.container(cosmosdbConfig.containers.categories),
        priceList: this.database.container(cosmosdbConfig.containers.priceList)
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Cosmos DB service:', error);
      throw new Error('Cosmos DB initialization failed');
    }
  }

  // Product Operations
  async getProducts(query?: CosmosProductQuery): Promise<ApiResponse<PaginatedResponse<CosmosProduct>>> {
    try {
      await this.initialize();

      let sqlQuery = 'SELECT * FROM c';
      const parameters: any[] = [];

      if (query) {
        const conditions: string[] = [];

        if (query.category) {
          conditions.push('c.category = @category');
          parameters.push({ name: '@category', value: query.category });
        }

        if (query.searchTerm) {
          conditions.push('(CONTAINS(LOWER(c.name), LOWER(@searchTerm)) OR CONTAINS(LOWER(c.description), LOWER(@searchTerm)))');
          parameters.push({ name: '@searchTerm', value: query.searchTerm });
        }

        if (query.priceRange) {
          if (query.priceRange.min !== undefined) {
            conditions.push('c.price >= @minPrice');
            parameters.push({ name: '@minPrice', value: query.priceRange.min });
          }
          if (query.priceRange.max !== undefined) {
            conditions.push('c.price <= @maxPrice');
            parameters.push({ name: '@maxPrice', value: query.priceRange.max });
          }
        }

        if (query.isActive !== undefined) {
          conditions.push('c.isActive = @isActive');
          parameters.push({ name: '@isActive', value: query.isActive });
        }

        if (conditions.length > 0) {
          sqlQuery += ' WHERE ' + conditions.join(' AND ');
        }
      }

      if (query?.sortBy) {
        sqlQuery += ` ORDER BY c.${query.sortBy} ${query.sortOrder || 'ASC'}`;
      }

      const querySpec = {
        query: sqlQuery,
        parameters
      };

      const response: FeedResponse<CosmosProduct> = await this.containers.products.items
        .query(querySpec, {
          maxItemCount: query?.pageSize || 50,
          continuationToken: query?.continuationToken
        })
        .fetchNext();

      return {
        success: true,
        data: {
          items: response.resources,
          totalCount: response.resources.length,
          hasMore: !!response.continuationToken,
          continuationToken: response.continuationToken
        }
      };
    } catch (error) {
      console.error('Error fetching products from Cosmos DB:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_QUERY_ERROR',
          message: 'Failed to fetch products',
          details: error
        }
      };
    }
  }

  async getProductById(id: string, partitionKey: string): Promise<ApiResponse<CosmosProduct>> {
    try {
      await this.initialize();

      const response: ItemResponse<CosmosProduct> = await this.containers.products.item(id, partitionKey).read();

      if (response.resource) {
        return {
          success: true,
          data: response.resource
        };
      } else {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        };
      }
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_READ_ERROR',
          message: 'Failed to fetch product',
          details: error
        }
      };
    }
  }

  async createProduct(product: Omit<CosmosProduct, 'id' | '_ts' | '_etag'>): Promise<ApiResponse<CosmosProduct>> {
    try {
      await this.initialize();

      const newProduct: CosmosProduct = {
        ...product,
        id: product.productNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response: ItemResponse<CosmosProduct> = await this.containers.products.items.create(newProduct);

      return {
        success: true,
        data: response.resource!
      };
    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_CREATE_ERROR',
          message: 'Failed to create product',
          details: error
        }
      };
    }
  }

  async updateProduct(id: string, partitionKey: string, updates: Partial<CosmosProduct>): Promise<ApiResponse<CosmosProduct>> {
    try {
      await this.initialize();

      const existingResponse = await this.containers.products.item(id, partitionKey).read();
      if (!existingResponse.resource) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        };
      }

      const updatedProduct = {
        ...existingResponse.resource,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const response: ItemResponse<CosmosProduct> = await this.containers.products.item(id, partitionKey).replace(updatedProduct);

      return {
        success: true,
        data: response.resource!
      };
    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_UPDATE_ERROR',
          message: 'Failed to update product',
          details: error
        }
      };
    }
  }

  // Inventory Operations
  async getInventoryStatus(productId?: string): Promise<ApiResponse<CosmosInventory[]>> {
    try {
      await this.initialize();

      let sqlQuery = 'SELECT * FROM c';
      const parameters: any[] = [];

      if (productId) {
        sqlQuery += ' WHERE c.productId = @productId';
        parameters.push({ name: '@productId', value: productId });
      }

      const querySpec = {
        query: sqlQuery,
        parameters
      };

      const response: FeedResponse<CosmosInventory> = await this.containers.inventory.items
        .query(querySpec)
        .fetchAll();

      return {
        success: true,
        data: response.resources
      };
    } catch (error) {
      console.error('Error fetching inventory status:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_INVENTORY_ERROR',
          message: 'Failed to fetch inventory status',
          details: error
        }
      };
    }
  }

  async updateInventory(updates: CosmosInventoryUpdate[]): Promise<ApiResponse<boolean>> {
    try {
      await this.initialize();

      const operations: CosmosBulkOperation[] = updates.map(update => ({
        operationType: 'Upsert',
        resourceBody: {
          ...update,
          lastUpdated: new Date().toISOString()
        }
      }));

      const response = await this.containers.inventory.items.bulk(operations);

      const hasErrors = response.some(result => result.statusCode >= 400);

      if (hasErrors) {
        console.error('Some inventory updates failed:', response);
        return {
          success: false,
          error: {
            code: 'BULK_UPDATE_PARTIAL_FAILURE',
            message: 'Some inventory updates failed'
          }
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('Error updating inventory:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_INVENTORY_UPDATE_ERROR',
          message: 'Failed to update inventory',
          details: error
        }
      };
    }
  }

  // Category Operations
  async getCategories(): Promise<ApiResponse<CosmosProductCategory[]>> {
    try {
      await this.initialize();

      const response: FeedResponse<CosmosProductCategory> = await this.containers.categories.items
        .query('SELECT * FROM c ORDER BY c.name')
        .fetchAll();

      return {
        success: true,
        data: response.resources
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_CATEGORIES_ERROR',
          message: 'Failed to fetch categories',
          details: error
        }
      };
    }
  }

  // Utility Methods
  async executeCustomQuery<T>(containerName: keyof typeof this.containers, query: string, parameters?: any[]): Promise<ApiResponse<T[]>> {
    try {
      await this.initialize();

      const querySpec = {
        query,
        parameters: parameters || []
      };

      const response: FeedResponse<T> = await this.containers[containerName].items
        .query(querySpec)
        .fetchAll();

      return {
        success: true,
        data: response.resources
      };
    } catch (error) {
      console.error('Error executing custom query:', error);
      return {
        success: false,
        error: {
          code: 'COSMOS_CUSTOM_QUERY_ERROR',
          message: 'Failed to execute custom query',
          details: error
        }
      };
    }
  }

  async getConnectionStatus(): Promise<boolean> {
    try {
      await this.initialize();
      await this.database.read();
      return true;
    } catch (error) {
      console.error('Cosmos DB connection test failed:', error);
      return false;
    }
  }
}

export const cosmosdbService = new CosmosDBService();
export default cosmosdbService;