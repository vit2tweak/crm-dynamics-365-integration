// NAV 2017 ERP Configuration

export interface NAV2017Config {
  baseUrl: string;
  serverInstance: string;
  company: string;
  username: string;
  password: string;
  domain?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  useNTLM: boolean;
  webServicePort: number;
  odataVersion: string;
}

export interface NAV2017Endpoints {
  customers: string;
  vendors: string;
  items: string;
  salesOrders: string;
  purchaseOrders: string;
  salesInvoices: string;
  purchaseInvoices: string;
  generalLedgerEntries: string;
  customerLedgerEntries: string;
  vendorLedgerEntries: string;
  itemLedgerEntries: string;
  dimensions: string;
  currencies: string;
  paymentTerms: string;
  shipmentMethods: string;
}

// Default configuration
export const nav2017Config: NAV2017Config = {
  baseUrl: process.env.REACT_APP_NAV2017_BASE_URL || 'http://nav-server:7048',
  serverInstance: process.env.REACT_APP_NAV2017_SERVER_INSTANCE || 'DynamicsNAV100',
  company: process.env.REACT_APP_NAV2017_COMPANY || 'CRONUS%20International%20Ltd.',
  username: process.env.REACT_APP_NAV2017_USERNAME || '',
  password: process.env.REACT_APP_NAV2017_PASSWORD || '',
  domain: process.env.REACT_APP_NAV2017_DOMAIN || '',
  timeout: parseInt(process.env.REACT_APP_NAV2017_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.REACT_APP_NAV2017_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.REACT_APP_NAV2017_RETRY_DELAY || '1000'),
  useNTLM: process.env.REACT_APP_NAV2017_USE_NTLM === 'true',
  webServicePort: parseInt(process.env.REACT_APP_NAV2017_WS_PORT || '7047'),
  odataVersion: process.env.REACT_APP_NAV2017_ODATA_VERSION || 'v4'
};

// OData Service Endpoints
export const nav2017Endpoints: NAV2017Endpoints = {
  customers: '/ODataV4/Company(\'{company}\')/Customer',
  vendors: '/ODataV4/Company(\'{company}\')/Vendor',
  items: '/ODataV4/Company(\'{company}\')/Item',
  salesOrders: '/ODataV4/Company(\'{company}\')/SalesHeader',
  purchaseOrders: '/ODataV4/Company(\'{company}\')/PurchaseHeader',
  salesInvoices: '/ODataV4/Company(\'{company}\')/SalesInvoiceHeader',
  purchaseInvoices: '/ODataV4/Company(\'{company}\')/PurchInvHeader',
  generalLedgerEntries: '/ODataV4/Company(\'{company}\')/GLEntry',
  customerLedgerEntries: '/ODataV4/Company(\'{company}\')/CustLedgerEntry',
  vendorLedgerEntries: '/ODataV4/Company(\'{company}\')/VendorLedgerEntry',
  itemLedgerEntries: '/ODataV4/Company(\'{company}\')/ItemLedgerEntry',
  dimensions: '/ODataV4/Company(\'{company}\')/Dimension',
  currencies: '/ODataV4/Company(\'{company}\')/Currency',
  paymentTerms: '/ODataV4/Company(\'{company}\')/PaymentTerms',
  shipmentMethods: '/ODataV4/Company(\'{company}\')/ShipmentMethod'
};

// Field mappings for integration with Dynamics 365
export const nav2017FieldMappings = {
  customer: {
    no: 'No',
    name: 'Name',
    name2: 'Name_2',
    address: 'Address',
    address2: 'Address_2',
    city: 'City',
    county: 'County',
    postCode: 'Post_Code',
    countryRegionCode: 'Country_Region_Code',
    phoneNo: 'Phone_No',
    email: 'E_Mail',
    homePage: 'Home_Page',
    vatRegistrationNo: 'VAT_Registration_No',
    customerPostingGroup: 'Customer_Posting_Group',
    genBusPostingGroup: 'Gen_Bus_Posting_Group',
    vatBusPostingGroup: 'VAT_Bus_Posting_Group',
    paymentTermsCode: 'Payment_Terms_Code',
    paymentMethodCode: 'Payment_Method_Code',
    shipmentMethodCode: 'Shipment_Method_Code',
    currencyCode: 'Currency_Code',
    creditLimitLCY: 'Credit_Limit_LCY',
    blocked: 'Blocked',
    lastDateModified: 'Last_Date_Modified'
  },
  item: {
    no: 'No',
    description: 'Description',
    description2: 'Description_2',
    baseUnitOfMeasure: 'Base_Unit_of_Measure',
    type: 'Type',
    inventoryPostingGroup: 'Inventory_Posting_Group',
    shelfNo: 'Shelf_No',
    itemCategoryCode: 'Item_Category_Code',
    productGroupCode: 'Product_Group_Code',
    blocked: 'Blocked',
    lastDateModified: 'Last_Date_Modified',
    unitPrice: 'Unit_Price',
    unitCost: 'Unit_Cost',
    inventory: 'Inventory',
    qtyOnPurchOrder: 'Qty_on_Purch_Order',
    qtyOnSalesOrder: 'Qty_on_Sales_Order'
  },
  salesOrder: {
    no: 'No',
    sellToCustomerNo: 'Sell_to_Customer_No',
    sellToCustomerName: 'Sell_to_Customer_Name',
    orderDate: 'Order_Date',
    postingDate: 'Posting_Date',
    shipmentDate: 'Shipment_Date',
    dueDate: 'Due_Date',
    status: 'Status',
    currencyCode: 'Currency_Code',
    amount: 'Amount',
    amountIncludingVAT: 'Amount_Including_VAT',
    salespersonCode: 'Salesperson_Code',
    externalDocumentNo: 'External_Document_No'
  }
};

// NAV Document Types
export const nav2017DocumentTypes = {
  salesOrder: 1,
  salesInvoice: 2,
  salesCreditMemo: 3,
  salesReturnOrder: 5,
  purchaseOrder: 1,
  purchaseInvoice: 2,
  purchaseCreditMemo: 3,
  purchaseReturnOrder: 5
};

// NAV Status Codes
export const nav2017StatusCodes = {
  document: {
    open: 0,
    released: 1,
    pendingApproval: 2,
    pendingPrepayment: 3
  },
  customer: {
    open: 0,
    blocked: 1,
    ship: 2,
    invoice: 3,
    all: 4
  },
  item: {
    active: 0,
    blocked: 1
  }
};

// Authentication configuration
export const nav2017AuthConfig = {
  authType: process.env.REACT_APP_NAV2017_AUTH_TYPE || 'Windows', // Windows, UserName, NavUserPassword, AccessControlService
  webServiceAccessKey: process.env.REACT_APP_NAV2017_WS_ACCESS_KEY || '',
  tokenEndpoint: process.env.REACT_APP_NAV2017_TOKEN_ENDPOINT || '',
  clientId: process.env.REACT_APP_NAV2017_CLIENT_ID || '',
  clientSecret: process.env.REACT_APP_NAV2017_CLIENT_SECRET || ''
};

// Error codes and messages
export const nav2017ErrorCodes = {
  AUTHENTICATION_FAILED: 'NAV2017_AUTH_FAILED',
  INVALID_COMPANY: 'NAV2017_INVALID_COMPANY',
  RESOURCE_NOT_FOUND: 'NAV2017_RESOURCE_NOT_FOUND',
  PERMISSION_DENIED: 'NAV2017_PERMISSION_DENIED',
  VALIDATION_ERROR: 'NAV2017_VALIDATION_ERROR',
  SERVER_ERROR: 'NAV2017_SERVER_ERROR',
  NETWORK_ERROR: 'NAV2017_NETWORK_ERROR',
  TIMEOUT_ERROR: 'NAV2017_TIMEOUT_ERROR',
  ODATA_ERROR: 'NAV2017_ODATA_ERROR'
};

// Helper function to build full endpoint URL
export const buildNAVEndpointUrl = (endpoint: string, company?: string): string => {
  const companyName = company || nav2017Config.company;
  const baseUrl = `${nav2017Config.baseUrl}/${nav2017Config.serverInstance}`;
  return `${baseUrl}${endpoint.replace('{company}', companyName)}`;
};

// Helper function to build web service URL
export const buildNAVWebServiceUrl = (serviceName: string, company?: string): string => {
  const companyName = company || nav2017Config.company;
  const baseUrl = `${nav2017Config.baseUrl}:${nav2017Config.webServicePort}/${nav2017Config.serverInstance}`;
  return `${baseUrl}/WS/${companyName}/Page/${serviceName}`;
};

export default nav2017Config;