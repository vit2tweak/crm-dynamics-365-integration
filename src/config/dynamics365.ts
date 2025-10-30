// Dynamics 365 Configuration

export interface Dynamics365Config {
  baseUrl: string;
  apiVersion: string;
  clientId: string;
  tenantId: string;
  resource: string;
  scope: string[];
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface Dynamics365Endpoints {
  accounts: string;
  contacts: string;
  opportunities: string;
  leads: string;
  activities: string;
  products: string;
  quotes: string;
  orders: string;
  invoices: string;
  cases: string;
  campaigns: string;
  systemUsers: string;
  businessUnits: string;
}

// Default configuration
export const dynamics365Config: Dynamics365Config = {
  baseUrl: process.env.REACT_APP_DYNAMICS365_BASE_URL || 'https://your-org.crm.dynamics.com',
  apiVersion: process.env.REACT_APP_DYNAMICS365_API_VERSION || 'v9.2',
  clientId: process.env.REACT_APP_AZURE_CLIENT_ID || '',
  tenantId: process.env.REACT_APP_AZURE_TENANT_ID || '',
  resource: process.env.REACT_APP_DYNAMICS365_RESOURCE || 'https://your-org.crm.dynamics.com',
  scope: [
    'https://your-org.crm.dynamics.com/user_impersonation',
    'openid',
    'profile',
    'offline_access'
  ],
  timeout: parseInt(process.env.REACT_APP_DYNAMICS365_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.REACT_APP_DYNAMICS365_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.REACT_APP_DYNAMICS365_RETRY_DELAY || '1000')
};

// API Endpoints
export const dynamics365Endpoints: Dynamics365Endpoints = {
  accounts: '/api/data/v9.2/accounts',
  contacts: '/api/data/v9.2/contacts',
  opportunities: '/api/data/v9.2/opportunities',
  leads: '/api/data/v9.2/leads',
  activities: '/api/data/v9.2/activities',
  products: '/api/data/v9.2/products',
  quotes: '/api/data/v9.2/quotes',
  orders: '/api/data/v9.2/salesorders',
  invoices: '/api/data/v9.2/invoices',
  cases: '/api/data/v9.2/incidents',
  campaigns: '/api/data/v9.2/campaigns',
  systemUsers: '/api/data/v9.2/systemusers',
  businessUnits: '/api/data/v9.2/businessunits'
};

// OData Query Options
export interface ODataQueryOptions {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $expand?: string;
  $count?: boolean;
}

// Common field mappings for integration
export const dynamics365FieldMappings = {
  account: {
    id: 'accountid',
    name: 'name',
    accountNumber: 'accountnumber',
    phone: 'telephone1',
    email: 'emailaddress1',
    website: 'websiteurl',
    address1: 'address1_line1',
    address2: 'address1_line2',
    city: 'address1_city',
    state: 'address1_stateorprovince',
    postalCode: 'address1_postalcode',
    country: 'address1_country',
    industry: 'industrycode',
    revenue: 'revenue',
    employees: 'numberofemployees',
    createdOn: 'createdon',
    modifiedOn: 'modifiedon'
  },
  contact: {
    id: 'contactid',
    firstName: 'firstname',
    lastName: 'lastname',
    fullName: 'fullname',
    email: 'emailaddress1',
    phone: 'telephone1',
    mobile: 'mobilephone',
    jobTitle: 'jobtitle',
    accountId: '_parentcustomerid_value',
    createdOn: 'createdon',
    modifiedOn: 'modifiedon'
  },
  opportunity: {
    id: 'opportunityid',
    name: 'name',
    description: 'description',
    estimatedValue: 'estimatedvalue',
    estimatedCloseDate: 'estimatedclosedate',
    actualValue: 'actualvalue',
    actualCloseDate: 'actualclosedate',
    probability: 'closeprobability',
    stage: 'salesstagecode',
    status: 'statecode',
    accountId: '_parentaccountid_value',
    contactId: '_parentcontactid_value',
    ownerId: '_ownerid_value',
    createdOn: 'createdon',
    modifiedOn: 'modifiedon'
  }
};

// Status code mappings
export const dynamics365StatusCodes = {
  opportunity: {
    open: 0,
    won: 1,
    lost: 2
  },
  lead: {
    open: 1,
    qualified: 2,
    disqualified: 3
  },
  case: {
    active: 0,
    resolved: 1,
    canceled: 2
  }
};

// Error codes and messages
export const dynamics365ErrorCodes = {
  AUTHENTICATION_FAILED: 'DYNAMICS365_AUTH_FAILED',
  INVALID_REQUEST: 'DYNAMICS365_INVALID_REQUEST',
  RESOURCE_NOT_FOUND: 'DYNAMICS365_RESOURCE_NOT_FOUND',
  PERMISSION_DENIED: 'DYNAMICS365_PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'DYNAMICS365_RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'DYNAMICS365_SERVER_ERROR',
  NETWORK_ERROR: 'DYNAMICS365_NETWORK_ERROR',
  TIMEOUT_ERROR: 'DYNAMICS365_TIMEOUT_ERROR'
};

export default dynamics365Config;