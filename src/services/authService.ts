import { 
  PublicClientApplication, 
  AccountInfo, 
  AuthenticationResult, 
  SilentRequest,
  RedirectRequest,
  PopupRequest,
  EndSessionRequest
} from '@azure/msal-browser';
import { azureConfig } from '../config/azure';
import { User, AuthState, LoginCredentials } from '../types';

class AuthService {
  private msalInstance: PublicClientApplication;