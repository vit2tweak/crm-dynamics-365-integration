import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { dynamics365Config, dynamics365Endpoints, dynamics365FieldMappings, dynamics365ErrorCodes, ODataQueryOptions } from '../config/dynamics365';
import { D365Account, D365Contact, D365Opportunity, D365Lead, D365Activity, D365Product } from '../types/dynamics365';

export class Dynamics365Service {
  private msalInstance: PublicClientApplication;
  private accessToken: string | null = null;
  private tokenExpirationTime: number = 0;

  constructor(msalInstance: PublicClientApplication) {
    this.msalInstance = msalInstance;
  }

  // Authentication methods
  private async getAccessToken(): Promise<string> {
    try {
      if (this.accessToken && Date.now() < this.tokenExpirationTime) {
        return this.accessToken;
      }

      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No authenticated accounts found');
      }

      const silentRequest = {
        scopes: dynamics365Config.scope,
        account: accounts[0]
      };

      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      this.accessToken = response.accessToken;
      this.tokenExpirationTime = response.expiresOn?.getTime() || 0;

      return this.accessToken;
    } catch (error) {
      console.error('Failed to acquire access token:', error);
      throw new Error(dynamics365ErrorCodes.AUTHENTICATION_FAILED);
    }
  }

  // Generic API request method
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    data?: any,
    queryOptions?: ODataQueryOptions
  ): Promise<T> {
    try {
      const token = await this.getAccessToken();
      const baseUrl = `${dynamics365Config.baseUrl}${endpoint}`;
      
      let url = baseUrl;
      if (queryOptions) {
        const params = new URLSearchParams();
        Object.entries(queryOptions).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }

      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json'
      };

      if (method === 'PATCH') {
        headers['If-Match'] = '*';
      }

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(dynamics365Config.timeout)
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await this.retryRequest(() => fetch(url, requestOptions));

      if (!response.ok) {
        await this.handleApiError(response);
      }

      if (method === 'DELETE' || response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`Dynamics 365 API request failed:`, error);
      throw this.mapError(error);
    }
  }

  // Retry mechanism
  private async retryRequest(requestFn: () => Promise<Response>): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= dynamics365Config.retryAttempts; attempt++) {