const { CosmosClient } = require('@azure/cosmos');
const axios = require('axios');

// Configuration
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'CRMIntegration';
const dynamics365BaseUrl = process.env.DYNAMICS365_BASE_URL;
const nav2017BaseUrl = process.env.NAV2017_BASE_URL;
const nav2017Username = process.env.NAV2017_USERNAME;
const nav2017Password = process.env.NAV2017_PASSWORD;

// Initialize Cosmos client
const cosmosClient = new CosmosClient({
  endpoint: cosmosEndpoint,
  key: cosmosKey
});

const database = cosmosClient.database(databaseId);

module.exports = async function (context, req) {
  context.log('Data processor function started');
  
  try {
    const { operation, entityType, data, source, target } = req.body;
    
    if (!operation || !entityType || !data) {
      context.res = {
        status: 400,
        body: { error: 'Missing required parameters: operation, entityType, data' }
      };
      return;
    }

    let result;
    
    switch (operation) {
      case 'transform':
        result = await transformData(context, entityType, data, source, target);
        break;
      case 'validate':
        result = await validateData(context, entityType, data);
        break;
      case 'merge':
        result = await mergeData(context, entityType, data);
        break;
      case 'enrich':
        result = await enrichData(context, entityType, data);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    // Log processing result
    await logProcessingResult(context, {
      operation,
      entityType,
      source,
      target,
      recordCount: Array.isArray(data) ? data.length : 1,
      success: true,
      timestamp: new Date().toISOString()
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        operation,
        entityType,
        result,
        processedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    context.log.error('Data processing error:', error);
    
    // Log error
    await logProcessingResult(context, {
      operation: req.body?.operation,
      entityType: req.body?.entityType,
      error: error.message,
      success: false,
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

async function transformData(context, entityType, data, source, target) {
  context.log(`Transforming ${entityType} data from ${source} to ${target}`);
  
  const transformedData = Array.isArray(data) ? [] : {};
  
  switch (entityType) {
    case 'customer':
      return transformCustomerData(data, source, target);
    case 'product':
      return transformProductData(data, source, target);
    case 'order':
      return transformOrderData(data, source, target);
    case 'opportunity':
      return transformOpportunityData(data, source, target);
    default:
      throw new Error(`Unsupported entity type for transformation: ${entityType}`);
  }
}

function transformCustomerData(data, source, target) {
  const customers = Array.isArray(data) ? data : [data];
  
  return customers.map(customer => {
    let transformed = {};
    
    if (source === 'dynamics365' && target === 'nav2017') {
      transformed = {
        No: customer.accountnumber || customer.accountid,
        Name: customer.name,
        Address: customer.address1_line1 || '',
        City: customer.address1_city || '',
        PostCode: customer.address1_postalcode || '',
        PhoneNo: customer.telephone1 || '',
        Email: customer.emailaddress1 || '',
        ContactName: customer.primarycontactid?.fullname || ''
      };
    } else if (source === 'nav2017' && target === 'dynamics365') {
      transformed = {
        name: customer.Name,
        accountnumber: customer.No,
        address1_line1: customer.Address,
        address1_city: customer.City,
        address1_postalcode: customer.PostCode,
        telephone1: customer.PhoneNo,
        emailaddress1: customer.Email
      };
    } else if (target === 'cosmosdb') {
      transformed = {
        id: customer.id || customer.accountid || customer.No,
        partitionKey: 'customer',
        customerNumber: customer.accountnumber || customer.No,
        name: customer.name || customer.Name,
        email: customer.emailaddress1 || customer.Email,
        phone: customer.telephone1 || customer.PhoneNo,
        address: {
          line1: customer.address1_line1 || customer.Address,
          city: customer.address1_city || customer.City,
          postalCode: customer.address1_postalcode || customer.PostCode
        },
        source: source,
        lastModified: new Date().toISOString()
      };
    }
    
    return transformed;
  });
}

function transformProductData(data, source, target) {
  const products = Array.isArray(data) ? data : [data];
  
  return products.map(product => {
    let transformed = {};
    
    if (source === 'nav2017' && target === 'cosmosdb') {
      transformed = {
        id: product.No,
        partitionKey: 'product',
        productNumber: product.No,
        name: product.Description,
        category: product.ItemCategoryCode || 'General',
        unitPrice: product.UnitPrice || 0,
        inventory: {
          quantity: product.Inventory || 0,
          reserved: product.QtyOnSalesOrder || 0,
          available: (product.Inventory || 0) - (product.QtyOnSalesOrder || 0)
        },
        specifications: {
          baseUnitOfMeasure: product.BaseUnitOfMeasure || 'PCS',
          weight: product.NetWeight || 0,
          blocked: product.Blocked || false
        },
        source: source,
        lastModified: new Date().toISOString()
      };
    }
    
    return transformed;
  });
}

function transformOrderData(data, source, target) {
  const orders = Array.isArray(data) ? data : [data];
  
  return orders.map(order => {
    let transformed = {};
    
    if (source === 'nav2017' && target === 'dynamics365') {
      transformed = {
        name: `Order ${order.No}`,
        ordernumber: order.No,
        customerid: order.SelltoCustomerNo,
        totalamount: order.Amount || 0,
        orderdate: order.OrderDate,
        requestdeliverydate: order.RequestedDeliveryDate,
        description: `NAV Order ${order.No} - ${order.SelltoCustomerName}`
      };
    }
    
    return transformed;
  });
}

function transformOpportunityData(data, source, target) {
  const opportunities = Array.isArray(data) ? data : [data];
  
  return opportunities.map(opportunity => {
    let transformed = {};
    
    if (source === 'dynamics365' && target === 'cosmosdb') {
      transformed = {
        id: opportunity.opportunityid,
        partitionKey: 'opportunity',
        name: opportunity.name,
        accountId: opportunity._parentaccountid_value,
        estimatedValue: opportunity.estimatedvalue || 0,
        estimatedCloseDate: opportunity.estimatedclosedate,
        probability: opportunity.closeprobabilitypct || 0,
        stage: opportunity.salesstagecode || 0,
        source: source,
        lastModified: new Date().toISOString()
      };
    }
    
    return transformed;
  });
}

async function validateData(context, entityType, data) {
  context.log(`Validating ${entityType} data`);
  
  const records = Array.isArray(data) ? data : [data];
  const validationResults = [];
  
  for (const record of records) {
    const validation = {
      id: record.id || record.accountid || record.No || 'unknown',
      isValid: true,
      errors: [],
      warnings: []
    };
    
    switch (entityType) {
      case 'customer':
        validateCustomerRecord(record, validation);
        break;
      case 'product':
        validateProductRecord(record, validation);
        break;
      case 'order':
        validateOrderRecord(record, validation);
        break;
      default:
        validation.warnings.push(`No specific validation rules for entity type: ${entityType}`);
    }
    
    validationResults.push(validation);
  }
  
  return validationResults;
}

function validateCustomerRecord(record, validation) {
  if (!record.name && !record.Name) {
    validation.errors.push('Customer name is required');
    validation.isValid = false;
  }
  
  if (record.emailaddress1 || record.Email) {
    const email = record.emailaddress1 || record.Email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      validation.errors.push('Invalid email format');
      validation.isValid = false;
    }
  }
  
  if (!record.accountnumber && !record.No) {
    validation.warnings.push('Customer number not provided');
  }
}

function validateProductRecord(record, validation) {
  if (!record.name && !record.Description) {
    validation.errors.push('Product name/description is required');
    validation.isValid = false;
  }
  
  if (!record.productNumber && !record.No) {
    validation.errors.push('Product number is required');
    validation.isValid = false;
  }
  
  if (record.unitPrice && record.unitPrice < 0) {
    validation.errors.push('Unit price cannot be negative');
    validation.isValid = false;
  }
}

function validateOrderRecord(record, validation) {
  if (!record.customerid && !record.SelltoCustomerNo) {
    validation.errors.push('Customer ID is required');
    validation.isValid = false;
  }
  
  if (record.totalamount && record.totalamount < 0) {
    validation.errors.push('Total amount cannot be negative');
    validation.isValid = false;
  }
}

async function mergeData(context, entityType, data) {
  context.log(`Merging ${entityType} data`);
  
  // Get existing data from Cosmos DB
  const container = database.container('syncData');
  const mergedData = [];
  
  const records = Array.isArray(data) ? data : [data];
  
  for (const record of records) {
    const id = record.id || record.accountid || record.No;
    
    try {
      const { resource: existingRecord } = await container.item(id, entityType).read();
      
      // Merge logic - newer timestamp wins for conflicts
      const merged = {
        ...existingRecord,
        ...record,
        mergedAt: new Date().toISOString()
      };
      
      // Handle specific merge rules
      if (existingRecord.lastModified && record.lastModified) {
        if (new Date(existingRecord.lastModified) > new Date(record.lastModified)) {
          // Keep existing data for fields that haven't changed
          Object.keys(existingRecord).forEach(key => {
            if (key !== 'mergedAt' && !record.hasOwnProperty(key)) {
              merged[key] = existingRecord[key];
            }
          });
        }
      }
      
      mergedData.push(merged);
      
    } catch (error) {
      if (error.code === 404) {
        // Record doesn't exist, use new data
        mergedData.push({
          ...record,
          mergedAt: new Date().toISOString()
        });
      } else {
        throw error;
      }
    }
  }
  
  return mergedData;
}

async function enrichData(context, entityType, data) {
  context.log(`Enriching ${entityType} data`);
  
  const records = Array.isArray(data) ? data : [data];
  const enrichedData = [];
  
  for (const record of records) {
    const enriched = { ...record };
    
    switch (entityType) {
      case 'customer':
        await enrichCustomerData(enriched);
        break;
      case 'product':
        await enrichProductData(enriched);
        break;
      case 'opportunity':
        await enrichOpportunityData(enriched);
        break;
    }
    
    enrichedData.push(enriched);
  }
  
  return enrichedData;
}

async function enrichCustomerData(customer) {
  // Add customer insights, transaction history, etc.
  try {
    const container = database.container('customers');
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.customerNumber = @customerNumber',
      parameters: [
        { name: '@customerNumber', value: customer.accountnumber || customer.No }
      ]
    };
    
    const { resources: existingCustomers } = await container.items.query(querySpec).fetchAll();
    
    if (existingCustomers.length > 0) {
      const existing = existingCustomers[0];
      customer.insights = existing.insights || {};
      customer.transactionHistory = existing.transactionHistory || [];
      customer.preferences = existing.preferences || {};
    }
    
    // Add calculated fields
    customer.enrichment = {
      totalTransactions: customer.transactionHistory?.length || 0,
      lastTransactionDate: customer.transactionHistory?.[0]?.date || null,
      customerSince: customer.createdOn || customer.createdAt || null,
      enrichedAt: new Date().toISOString()
    };
    
  } catch (error) {
    context.log.warn('Failed to enrich customer data:', error.message);
  }
}

async function enrichProductData(product) {
  // Add inventory levels, pricing history, etc.
  try {
    const container = database.container('products');
    const { resource: existingProduct } = await container.item(product.id || product.No, 'product').read();
    
    if (existingProduct) {
      product.pricingHistory = existingProduct.pricingHistory || [];
      product.salesHistory = existingProduct.salesHistory || [];
    }
    
    // Add calculated fields
    product.enrichment = {
      averagePrice: calculateAveragePrice(product.pricingHistory),
      totalSales: product.salesHistory?.reduce((sum, sale) => sum + sale.quantity, 0) || 0,
      enrichedAt: new Date().toISOString()
    };
    
  } catch (error) {
    context.log.warn('Failed to enrich product data:', error.message);
  }
}

async function enrichOpportunityData(opportunity) {
  // Add customer context, similar opportunities, etc.
  try {
    if (opportunity.accountId || opportunity._parentaccountid_value) {
      const accountId = opportunity.accountId || opportunity._parentaccountid_value;
      
      // Get customer information
      const customerContainer = database.container('customers');
      const { resource: customer } = await customerContainer.item(accountId, 'customer').read();
      
      if (customer) {
        opportunity.customerContext = {
          name: customer.name,
          industry: customer.industry,
          revenue: customer.revenue,
          employeeCount: customer.employeeCount
        };
      }
    }
    
    opportunity.enrichment = {
      daysToClose: opportunity.estimatedclosedate ? 
        Math.ceil((new Date(opportunity.estimatedclosedate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      enrichedAt: new Date().toISOString()
    };
    
  } catch (error) {
    context.log.warn('Failed to enrich opportunity data:', error.message);
  }
}

function calculateAveragePrice(pricingHistory) {
  if (!pricingHistory || pricingHistory.length === 0) return 0;
  const sum = pricingHistory.reduce((total, price) => total + price.value, 0);
  return sum / pricingHistory.length;
}

async function logProcessingResult(context, result) {
  try {
    const container = database.container('processingLogs');
    await container.items.create({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      partitionKey: 'processing',
      ...result
    });
  } catch (error) {
    context.log.warn('Failed to log processing result:', error.message);
  }
}