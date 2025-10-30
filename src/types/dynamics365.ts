// Dynamics 365 Sales API Types

export interface D365Account {
  accountid: string;
  name: string;
  accountnumber?: string;
  telephone1?: string;
  emailaddress1?: string;
  websiteurl?: string;
  address1_line1?: string;
  address1_line2?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  industrycode?: number;
  revenue?: number;
  numberofemployees?: number;
  customertypecode?: number;
  statuscode: number;
  statecode: number;
  createdon: string;
  modifiedon: string;
  ownerid: string;
  _parentaccountid_value?: string;
}

export interface D365Contact {
  contactid: string;
  firstname: string;
  lastname: string;
  fullname: string;
  emailaddress1?: string;
  telephone1?: string;
  mobilephone?: string;
  jobtitle?: string;
  department?: string;
  address1_line1?: string;
  address1_line2?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  statuscode: number;
  statecode: number;
  createdon: string;
  modifiedon: string;
  _parentcustomerid_value?: string;
  _accountid_value?: string;
}

export interface D365Opportunity {
  opportunityid: string;
  name: string;
  description?: string;
  estimatedvalue?: number;
  actualvalue?: number;
  closeprobability?: number;
  estimatedclosedate?: string;
  actualclosedate?: string;
  salesstage?: string;
  stepname?: string;
  statuscode: number;
  statecode: number;
  createdon: string;
  modifiedon: string;
  _customerid_value?: string;
  _ownerid_value: string;
  _accountid_value?: string;
  _contactid_value?: string;
}

export interface D365Lead {
  leadid: string;
  subject: string;
  firstname?: string;
  lastname?: string;
  fullname: string;
  companyname?: string;
  emailaddress1?: string;
  telephone1?: string;
  mobilephone?: string;
  jobtitle?: string;
  industrycode?: number;
  revenue?: number;
  leadqualitycode?: number;
  leadsourcecode?: number;
  statuscode: number;
  statecode: number;
  createdon: string;
  modifiedon: string;
  _ownerid_value: string;
}

export interface D365Quote {
  quoteid: string;
  name: string;
  quotenumber: string;
  description?: string;
  totalamount?: number;
  totaldiscountamount?: number;
  totallineitemamount?: number;
  totaltax?: number;
  effectivefrom?: string;
  effectiveto?: string;
  statuscode: number;
  statecode: number;
  createdon: string;
  modifiedon: string;
  _customerid_value?: string;
  _opportunityid_value?: string;
  _ownerid_value: string;
}

export interface D365Order {
  salesorderid: string;
  name: string;
  ordernumber: string;
  description?: string;
  totalamount?: number;
  totaldiscountamount?: number;
  totallineitemamount?: number;
  totaltax?: number;
  requestdeliveryby?: string;
  statuscode: number;
  statecode: number;
  createdon: string;
  modifiedon: string;
  _customerid_value?: string;
  _opportunityid_value?: string;
  _quoteid_value?: string;
  _ownerid_value: string;
}

export interface D365Activity {
  activityid: string;
  subject: string;
  description?: string;
  activitytypecode: string;
  scheduledstart?: string;
  scheduledend?: string;
  actualstart?: string;
  actualend?: string;
  statuscode: number;
  statecode: number;
  prioritycode?: number;
  createdon: string;
  modifiedon: string;
  _regardingobjectid_value?: string;
  _ownerid_value: string;
}

export interface D365User {
  systemuserid: string;
  fullname: string;
  firstname?: string;
  lastname?: string;
  internalemailaddress?: string;
  title?: string;
  businessunitid: string;
  isdisabled: boolean;
  createdon: string;
  modifiedon: string;
}

export interface D365ApiResponse<T> {
  '@odata.context': string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  value: T[];
}

export interface D365ApiError {
  error: {
    code: string;
    message: string;
    innererror?: {
      message: string;
      type: string;
      stacktrace: string;
    };
  };
}

export interface D365QueryOptions {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $expand?: string;
  $count?: boolean;
}

export interface D365BatchRequest {
  requests: D365BatchRequestItem[];
}

export interface D365BatchRequestItem {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface D365BatchResponse {
  responses: D365BatchResponseItem[];
}

export interface D365BatchResponseItem {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: any;
}

export interface D365WebhookNotification {
  subscriptionId: string;
  clientState: string;
  expirationDateTime: string;
  resource: string;
  resourceData: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
  changeType: 'created' | 'updated' | 'deleted';
  tenantId: string;
}

export interface D365SyncStatus {
  lastSyncTime: string;
  status: 'success' | 'error' | 'in-progress';
  recordsProcessed: number;
  errors: string[];
}

export type D365EntityType = 
  | 'account'
  | 'contact'
  | 'opportunity'
  | 'lead'
  | 'quote'
  | 'salesorder'
  | 'task'
  | 'appointment'
  | 'phonecall'
  | 'email';

export type D365StateCode = 0 | 1 | 2 | 3; // Active, Inactive, etc.
export type D365StatusCode = number; // Varies by entity