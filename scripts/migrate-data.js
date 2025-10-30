#!/usr/bin/env node

/**
 * CRM Dynamics 365 Integration - Data Migration Script
 * This script handles data migration between Dynamics 365, NAV 2017, and Cosmos DB
 */

const { CosmosClient } = require('@azure/cosmos');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuration
const config = {
  cosmosDb: {
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
    databaseId: 'CRMData'
  },
  dynamics365: {
    baseUrl: process.env.DYNAMICS365_BASE_URL,
    clientId: process.env.DYNAMICS365_CLIENT_ID,
    clientSecret: process.env.DYNAMICS365_CLIENT_SECRET,
    tenantId: process.env.DYNAMICS365_TENANT_ID
  },
  nav2017: {
    baseUrl: process.env.NAV2017_BASE_URL,
    username: process.env.NAV2017_USERNAME,
    password: process.env.NAV2017_PASSWORD,
    company: process.env.NAV2017_COMPANY || 'CRONUS'
  }
};

// Logging utilities
const log = {
  info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  success: (message) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`),
  warning: (message) => console.log(`[WARNING] ${new Date().toISOString()} - ${message}`),
  error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`)
};

// Initialize Cosmos DB client
let cosmosClient;
let database;

async function initializeCosmosDB() {
  try {
    cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key
    });
    
    database = cosmosClient.database(config.cosmosDb.databaseId);
    log.success('Cosmos DB client initialized');
  } catch (error) {
    log.error(`Failed to initialize Cosmos DB: ${error.message}`);
    throw error;
  }
}

// Authentication for Dynamics 365
async function getDynamics365Token() {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${config.dynamics365.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', config.dynamics365.clientId);
    params.append('client_secret', config.dynamics365.clientSecret);
    params.append('scope', `${config.dynamics365.baseUrl}/.default`);
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(tokenUrl, params);
    return response.data.access_token;
  } catch (error) {
    log.error(`Failed to get Dynamics 365 token: ${error.message}`);
    throw error;
  }
}

// Migrate customers from Dynamics 365 to Cosmos DB
async function migrateCustomersFromDynamics365() {
  log.info('Starting customer migration from Dynamics 365...');
  
  try {
    const token = await getDynamics365Token();
    const container = database.container('customers');
    
    let nextLink = `${config.dynamics365.baseUrl}/api/data/v9.2/accounts?$select=accountid,name,accountnumber,telephone1,emailaddress1,websiteurl,address1_line1,address1_city,address1_stateorprovince,address1_postalcode,address1_country,createdon,modifiedon`;
    let totalMigrated = 0;
    
    while (nextLink) {
      const response = await axios.get(nextLink, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json'
        }
      });
      
      const accounts = response.data.value;
      
      for (const account of accounts) {
        const customerDoc = {
          id: account.accountid,
          partitionKey: account.accountid,
          source: 'dynamics365',
          type: 'customer',
          name: account.name,
          accountNumber: account.accountnumber,
          phone: account.telephone1,
          email: account.emailaddress1,
          website: account.websiteurl,
          address: {
            line1: account.address1_line1,
            city: account.address1_city,
            state: account.address1_stateorprovince,
            postalCode: account.address1_postalcode,
            country: account.address1_country
          },
          createdOn: account.createdon,
          modifiedOn: account.modifiedon,
          lastSyncDate: new Date().toISOString()
        };
        
        try {
          await container.items.upsert(customerDoc);
          totalMigrated++;
        } catch (error) {
          log.warning(`Failed to migrate customer ${account.name}: ${error.message}`);
        }
      }
      
      nextLink = response.data['@odata.nextLink'];
      log.info(`Migrated ${accounts.length} customers from current batch`);
    }
    
    log.success(`Customer migration completed. Total migrated: ${totalMigrated}`);
  } catch (error) {
    log.error(`Customer migration failed: ${error.message}`);
    throw error;
  }
}

// Migrate products from NAV 2017 to Cosmos DB
async function migrateProductsFromNAV2017() {
  log.info('Starting product migration from NAV 2017...');
  
  try {
    const container = database.container('products');
    const auth = Buffer.from(`${config.nav2017.username}:${config.nav2017.password}`).toString('base64');
    
    const response = await axios.get(
      `${config.nav2017.baseUrl}/Company('${config.nav2017.company}')/Item`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const items = response.data.value;
    let totalMigrated = 0;
    
    for (const item of items) {
      const productDoc = {
        id: item.No,
        partitionKey: item.No,
        source: 'nav2017',
        type: 'product',
        productNumber: item.No,
        name: item.Description,
        description: item.Description_2,
        baseUnitOfMeasure: item.Base_Unit_of_Measure,
        unitPrice: item.