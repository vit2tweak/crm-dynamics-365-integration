# CRM Dynamics 365 Integration - API Documentation

## Overview

This document provides comprehensive API documentation for the CRM Dynamics 365 Integration system, including REST endpoints, authentication, data models, and integration patterns.

## Table of Contents

1. [Authentication](#authentication)
2. [Core APIs](#core-apis)
3. [Integration Endpoints](#integration-endpoints)
4. [Webhook APIs](#webhook-apis)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [SDK Usage](#sdk-usage)

## Authentication

### Azure AD Authentication

All API requests require Azure AD authentication using OAuth 2.0.

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Token Acquisition

```javascript
// Client Credentials Flow (Server-to-Server)
POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={client-id}
&scope=https://graph.microsoft.com/.default
&client_secret={client-secret}
&grant_type=client_credentials
```

### Required Scopes

- `https://graph.microsoft.com/User.Read`
- `https://dynamics365.com/user_impersonation`
- `https://cosmos.azure.com/user_impersonation`

## Core APIs

### Customer Management

#### Get All Customers

```http
GET /api/customers
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `search` (optional): Search term for name/email
- `status` (optional): Filter by status (active, inactive)
- `source` (optional): Filter by source system (dynamics365, nav2017)

**Response:**
```json
{
  "data": [
    {
      "id": "customer-uuid",
      "name": "Acme Corporation",
      "email": "contact@acme.com",
      "phone": "+1-555-0123",
      "status": "active",
      "source": "dynamics365",
      "dynamics365": {
        "accountid": "d365-account-id",
        "accountnumber": "ACME001"
      },
      "nav2017": {
        "customerNo": "C001",
        "blocked": false
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

#### Get Customer by ID

```http
GET /api/customers/{customer-id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "customer-uuid",
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "phone": "+1-555-0123",
  "address": {
    "street": "123 Business Ave",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "status": "active",
  "source": "dynamics365",
  "dynamics365Data": {
    "accountid": "d365-account-id",
    "accountnumber": "ACME001",
    "revenue": 1000000,
    "industrycode": 1
  },
  "nav2017Data": {
    "customerNo": "C001",
    "paymentTermsCode": "30DAYS",
    "creditLimit": 50000,
    "blocked": false
  },
  "contacts": [
    {
      "id": "contact-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@acme.com",
      "phone": "+1-555-0124",
      "isPrimary": true
    }
  ],
  "opportunities": [
    {
      "id": "opp-uuid",
      "name": "Q1 Software License",
      "value": 25000,
      "stage": "proposal",
      "probability": 75,
      "closeDate": "2024-03-31"
    }
  ],
  "orders": [
    {
      "id": "order-uuid",
      "orderNumber": "SO-2024-001",
      "date": "2024-01-15",
      "total": 15000,
      "status": "shipped"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

#### Create Customer

```http
POST /api/customers
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Customer Corp",
  "email": "contact@newcustomer.com",
  "phone": "+1-555-9999",
  "address": {
    "street": "456 New St",
    "city": "Boston",
    "state": "MA",
    "zipCode": "02101",
    "country": "USA"
  },
  "source": "dynamics365",
  "syncToNav": true,
  "customFields": {
    "industry": "Technology",
    "companySize": "Medium"
  }
}
```

#### Update Customer

```http
PUT /api/customers/{customer-id}
Authorization: Bearer {token}
Content-Type: application/json
```

### Sales Management

#### Get Opportunities

```http
GET /api/opportunities
Authorization: Bearer {token}
```

**Query Parameters:**
- `customerId` (optional): Filter by customer ID
- `stage` (optional): Filter by sales stage
- `owner` (optional): Filter by opportunity owner
- `dateFrom` (optional): Filter by creation date (ISO 8601)
- `dateTo` (optional): Filter by creation date (ISO 8601)

#### Get Sales Analytics

```http
GET /api/analytics/sales
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (required): Time period (month, quarter, year)
- `year` (required): Year (YYYY)
- `quarter` (optional): Quarter (1-4, required if period=quarter)
- `month` (optional): Month (1-12, required if period=month)

**Response:**
```json
{
  "period": "2024-Q1",
  "metrics": {
    "totalRevenue": 1250000,
    "opportunitiesWon": 45,
    "opportunitiesLost": 12,
    "winRate": 78.9,
    "averageDealSize": 27777,
    "salesCycle": 45
  },
  "byStage": [
    {
      "stage": "qualified",
      "count": 23,
      "value": 575000
    },
    {
      "stage": "proposal",
      "count": 18,
      "value": 450000
    }
  ],
  "byOwner": [
    {
      "ownerId": "user-uuid",
      "ownerName": "Sarah Johnson",
      "revenue": 325000,
      "deals": 12
    }
  ]
}
```

### Product Management

#### Get Products

```http
GET /api/products
Authorization: Bearer {token}
```

**Query Parameters:**
- `category` (optional): Filter by product category
- `inStock` (optional): Filter by inventory status (true/false)
- `priceMin` (optional): Minimum price filter
- `priceMax` (optional): Maximum price filter

#### Get Product Inventory

```http
GET /api/products/{product-id}/inventory
Authorization: Bearer {token}
```

**Response:**
```json
{
  "productId": "product-uuid",
  "productNumber": "PROD-001",
  "name": "Software License Pro",
  "inventory": [
    {
      "location": "Warehouse A",
      "quantity": 150,
      "reserved": 25,
      "available": 125,
      "reorderPoint": 50,
      "lastUpdated": "2024-01-20T09:15:00Z"
    }
  ],
  "totalAvailable": 125,
  "totalReserved": 25,
  "status": "in_stock"
}
```

## Integration Endpoints

### Synchronization

#### Trigger Manual Sync

```http
POST /api/sync/trigger
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "syncType": "full", // or "incremental"
  "entities": ["customers", "products", "orders"], // optional, all if not specified
  "source": "dynamics365", // optional, all sources if not specified
  "priority": "high" // optional: low, normal, high
}
```

#### Get Sync Status

```http
GET /api/sync/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "currentSync": {
    "id": "sync-uuid",
    "type": "incremental",
    "status": "running",
    "progress": 65,
    "startedAt": "2024-01-20T10:00:00Z",
    "estimatedCompletion": "2024-01-20T10:15:00Z",
    "entities": {
      "customers": {
        "processed": 120,
        "total": 150,
        "errors": 2
      },
      "products": {
        "processed": 450,
        "total": 500,
        "errors": 0
      }
    }
  },
  "lastSync": {
    "id": "sync-uuid-prev",
    "type": "full",
    "status": "completed",
    "completedAt": "2024-01-20T08:30:00Z",
    "duration": 1800,
    "summary": {
      "totalProcessed": 2500,
      "totalErrors": 5,
      "entitiesUpdated": 245,
      "entitiesCreated": 12
    }
  },
  "nextScheduledSync": "2024-01-20T12:00:00Z"
}
```

#### Get Sync History

```http
GET /api/sync/history
Authorization: Bearer {token}
```

### Data Mapping Configuration

#### Get Mapping Configuration

```http
GET /api/config/mapping
Authorization: Bearer {token}
```

#### Update Mapping Configuration

```http
PUT /api/config/mapping
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerMapping": {
    "dynamics365ToNav": {
      "name": "Name",
      "emailaddress1": "E-Mail",
      "telephone1": "Phone No.",
      "address1_line1": "Address"
    },
    "navToDynamics365": {
      "Name": "name",
      "E-Mail": "emailaddress1",
      "Phone No.": "telephone1",
      "Address": "address1_line1"
    }
  },
  "productMapping": {
    "cosmosToNav": {
      "productNumber": "No.",
      "name": "Description",
      "unitPrice": "Unit Price"
    }
  }
}
```

## Webhook APIs

### Register Webhook

```http
POST /api/webhooks
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/crm",
  "events": ["customer.created", "customer.updated", "opportunity.won"],
  "secret": "your-webhook-secret",
  "active": true
}
```

### Webhook Events

Available webhook events:
- `customer.created`
- `customer.updated`
- `customer.deleted`
- `opportunity.created`
- `opportunity.updated`
- `opportunity.won`
- `opportunity.lost`
- `order.created`
- `order.shipped`
- `sync.completed`
- `sync.failed`

### Webhook Payload Example

```json
{
  "id": "event-uuid",
  "event": "customer.created",
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    "customer": {
      "id": "customer-uuid",
      "name": "New Customer",
      "email": "new@customer.com"
    }
  },
  "source": "dynamics365"
}
```

## Data Models

### Customer Model

```typescript
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  status: 'active' | 'inactive';
  source: 'dynamics365' | 'nav2017' | 'portal';
  dynamics365Data?: D365Account;
  nav2017Data?: NAVCustomer;
  contacts: Contact[];
  opportunities: Opportunity[];
  orders: Order[];
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### Opportunity Model

```typescript
interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  closeDate: string;
  ownerId: string;
  source: string;
  products: OpportunityProduct[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-20T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` (401)
- `AUTHORIZATION_FAILED` (403)
- `RESOURCE_NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `RATE_LIMIT_EXCEEDED` (429)
- `SYNC_IN_PROGRESS` (409)
- `EXTERNAL_SERVICE_ERROR` (502)
- `INTERNAL_SERVER_ERROR` (500)

## Rate Limiting

- **Standard endpoints**: 1000 requests per hour per user
- **Sync endpoints**: 10 requests per hour per user
- **Webhook endpoints**: 100 requests per hour per webhook

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642680000
```

## SDK Usage

### JavaScript/TypeScript SDK

```bash
npm install @your-org/crm-dynamics365-sdk
```

```typescript
import { CRMClient } from '@your-org/crm-dynamics365-sdk';

const client = new CRMClient({
  baseUrl: 'https://api.your-crm.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tenantId: 'your-tenant-id'
});

// Get customers
const customers = await client.customers.list({
  page: 1,
  limit: 50,
  search: 'acme'
});

// Create customer
const newCustomer = await client.customers.create({
  name: 'New Customer',
  email: 'contact@newcustomer.com'
});

// Trigger sync
const syncResult = await client.sync.trigger({
  syncType: 'incremental',
  entities: ['customers']
});
```

### C# SDK

```csharp
using YourOrg.CRM.Dynamics365.SDK;

var client = new CRMClient(new CRMClientOptions
{
    BaseUrl = "https://api.your-crm.com",
    ClientId = "your-client-id",
    ClientSecret = "your-client-secret",
    TenantId = "your-tenant-id"
});

// Get customers
var customers = await client.Customers.ListAsync(new CustomerListOptions
{
    Page = 1,
    Limit = 50,
    Search = "acme"
});

// Create customer
var newCustomer = await client.Customers.CreateAsync(new CreateCustomerRequest
{
    Name = "New Customer",
    Email = "contact@newcustomer.com"
});
```

## Support

For API support and questions:
- Email: api-support@your-org.com
- Documentation: https://docs.your-crm.com
- Status Page: https://status.your-crm.com