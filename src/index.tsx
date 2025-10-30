import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SyncProvider } from './context/SyncContext';
import { msalConfig } from './config/azure';
import './index.css';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
msalInstance.initialize().then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <AuthProvider>
            <DataProvider>
              <SyncProvider>
                <App />
              </SyncProvider>
            </DataProvider>
          </AuthProvider>
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
}).catch((error) => {
  console.error('Failed to initialize MSAL:', error);
  
  // Fallback rendering without MSAL if initialization fails
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <div className="error-container">
          <h1>Authentication Service Unavailable</h1>
          <p>Please check your configuration and try again.</p>
          <p>Error: {error.message}</p>
        </div>
      </BrowserRouter>
    </React.StrictMode>
  );
});

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept();
}