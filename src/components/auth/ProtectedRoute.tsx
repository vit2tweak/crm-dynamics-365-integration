import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallback,
  redirectTo = '/login'
}) => {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    hasRole, 
    hasPermission,
    acquireTokenSilently 
  } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Attempt to acquire token silently when component mounts
    if (isAuthenticated && user) {
      acquireTokenSilently().catch(error => {
        console.warn('Failed to acquire token silently:', error);
      });
    }
  }, [isAuthenticated, user, acquireTokenSilently]);

  // Show loading spinner while authentication is being determined
  if (isLoading) {
    return (
      <div className="protected-route-loading">
        <LoadingSpinner 
          size="large" 
          text="Verifying authentication..." 
          overlay 
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <UnauthorizedAccess 
          message="You don't have the required role to access this page."
          requiredRoles={requiredRoles}
          userRoles={user?.roles || []}
          fallback={fallback}
        />
      );
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => 
      hasPermission(permission)
    );
    if (!hasRequiredPermission) {
      return (
        <UnauthorizedAccess 
          message="You don't have the required permissions to access this page."
          requiredPermissions={requiredPermissions}
          userPermissions={user?.permissions || []}
          fallback={fallback}
        />
      );
    }
  }

  // Render the protected content
  return <>{children}</>;
};

// Component for unauthorized access
interface UnauthorizedAccessProps {
  message: string;
  requiredRoles?: string[];
  userRoles?: string[];
  requiredPermissions?: string[];
  userPermissions?: string[];
  fallback?: React.ReactNode;
}

const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
  message,
  requiredRoles = [],
  userRoles = [],
  requiredPermissions = [],
  userPermissions = [],
  fallback
}) => {
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="unauthorized-access">
      <div className="unauthorized-content">
        <div className="unauthorized-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="m4.9 4.9 14.2 14.2"/>
          </svg>
        </div>
        
        <h2>Access Denied</h2>
        <p>{message}</p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="unauthorized-debug">
            <details>
              <summary>Debug Information</summary>
              <div className="debug-info">
                {requiredRoles.length > 0 && (
                  <div>
                    <strong>Required Roles:</strong> {requiredRoles.join(', ')}
                    <br />
                    <strong>User Roles:</strong> {userRoles.join(', ') || 'None'}
                  </div>
                )}
                {requiredPermissions.length > 0 && (
                  <div>
                    <strong>Required Permissions:</strong> {requiredPermissions.join(', ')}
                    <br />
                    <strong>User Permissions:</strong> {userPermissions.join(', ') || 'None'}
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
        
        <div className="unauthorized-actions">
          <button 
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            Go Back
          </button>
          <Navigate to="/dashboard" />
        </div>
      </div>
    </div>
  );
};

// Higher-order component for protecting components
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) => {
  const ProtectedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withProtectedRoute(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
};

// Hook for checking permissions within components
export const usePermissionCheck = () => {
  const { hasRole, hasPermission, user } = useAuth();

  const checkAccess = (
    roles: string[] = [],
    permissions: string[] = []
  ): boolean => {
    if (roles.length > 0) {
      const hasRequiredRole = roles.some(role => hasRole(role));
      if (!hasRequiredRole) return false;
    }

    if (permissions.length > 0) {
      const hasRequiredPermission = permissions.some(permission => 
        hasPermission(permission)
      );
      if (!hasRequiredPermission) return false;
    }

    return true;
  };

  return {
    checkAccess,
    hasRole,
    hasPermission,
    user
  };
};

export default ProtectedRoute;