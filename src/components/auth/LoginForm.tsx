import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/components.css';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, redirectTo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithRedirect, isAuthenticated, isLoading, error } = useAuth();
  
  const [loginMethod, setLoginMethod] = useState<'popup' | 'redirect'>('popup');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the intended destination from location state or use provided redirectTo
  const from = (location.state as any)?.from?.pathname || redirectTo || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, navigate, from, onSuccess]);

  const handlePopupLogin = async () => {
    try {
      setIsSubmitting(true);
      await login();
    } catch (error) {
      console.error('Popup login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedirectLogin = async () => {
    try {
      setIsSubmitting(true);
      await loginWithRedirect();
    } catch (error) {
      console.error('Redirect login failed:', error);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginMethod === 'popup') {
      await handlePopupLogin();
    } else {
      await handleRedirectLogin();
    }
  };

  if (isLoading) {
    return (
      <div className="login-loading">
        <LoadingSpinner size="large" text="Checking authentication..." />
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo.png" alt="CRM Logo" />
          </div>
          <h1>CRM Dynamics 365</h1>
          <p>Sign in to access your integrated CRM system</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <div className="error-icon">⚠️</div>
              <div className="error-text">
                <strong>Authentication Failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="login-method-selector">
            <label className="login-method-label">
              <input
                type="radio"
                name="loginMethod"
                value="popup"
                checked={loginMethod === 'popup'}
                onChange={(e) => setLoginMethod(e.target.value as 'popup')}
              />
              <span>Sign in with popup</span>
              <small>Opens authentication in a popup window</small>
            </label>

            <label className="login-method-label">
              <input
                type="radio"
                name="loginMethod"
                value="redirect"
                checked={loginMethod === 'redirect'}
                onChange={(e) => setLoginMethod(e.target.value as 'redirect')}
              />
              <span>Sign in with redirect</span>
              <small>Redirects to Microsoft authentication page</small>
            </label>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="small" color="white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.64 12.204c0-.639-.057-1.252-.164-1.841H12v3.481h6.509a5.565 5.565 0 01-2.414 3.655v3.032h3.906c2.287-2.107 3.609-5.205 3.609-8.327z"/>
                  <path d="M12 24c3.24 0 5.956-1.075 7.945-2.907l-3.906-3.032c-1.075.72-2.449 1.145-4.039 1.145-3.106 0-5.734-2.098-6.675-4.915H1.279v3.132C3.258 21.295 7.327 24 12 24z"/>
                  <path d="M5.325 14.291c-.238-.72-.374-1.487-.374-2.291s.136-1.571.374-2.291V6.577H1.279C.465 8.169 0 9.96 0 12s.465 3.831 1.279 5.423l4.046-3.132z"/>
                  <path d="M12 4.773c1.748 0 3.317.6 4.551 1.778l3.414-3.414C17.951 1.145 15.24 0 12 0 7.327 0 3.258 2.705 1.279 6.577l4.046 3.132C6.266 6.872 8.894 4.773 12 4.773z"/>
                </svg>
                <span>Sign in with Microsoft</span>
              </>
            )}
          </button>
        </form>

        <div className="login-info">
          <div className="info-section">
            <h3>System Integration</h3>
            <ul>
              <li>Microsoft Dynamics 365 Sales</li>
              <li>NAV 2017 ERP System</li>
              <li>Cosmos DB Product Warehouse</li>
              <li>Customer Portal</li>
            </ul>
          </div>

          <div className="info-section">
            <h3>Features</h3>
            <ul>
              <li>Real-time data synchronization</li>
              <li>360-degree customer insights</li>
              <li>Automated workflows</li>
              <li>Comprehensive reporting</li>
            </ul>
          </div>
        </div>

        <div className="login-footer">
          <p>
            Need help? <a href="/support">Contact Support</a> | 
            <a href="/privacy"> Privacy Policy</a> | 
            <a href="/terms"> Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;