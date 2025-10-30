import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginForm } from './components/auth/LoginForm';
import { useAuth } from './hooks/useAuth';
import './App.css';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const CustomerList = lazy(() => import('./components/customers/CustomerList'));
const CustomerDetail = lazy(() => import('./components/customers/CustomerDetail'));
const Customer360View = lazy(() => import('./components/customers/Customer360View'));
const CustomerPortal = lazy(() => import('./components/customers/CustomerPortal'));
const SalesOverview = lazy(() => import('./components/sales/SalesOverview'));
const ProductCatalog = lazy(() => import('./components/products/ProductCatalog'));
const SyncDashboard = lazy(() => import('./components/integration/SyncDashboard'));
const WorkflowBuilder = lazy(() => import('./components/integration/WorkflowBuilder'));
const ReportDashboard = lazy(() => import('./components/reports/ReportDashboard'));

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner size="large" />
        <p>Initializing CRM System...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <ErrorBoundary>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginForm />
              )
            } 
          />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      {/* Dashboard */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Customer Management */}
                      <Route path="/customers" element={<CustomerList />} />
                      <Route path="/customers/:id" element={<CustomerDetail />} />
                      <Route path="/customers/:id/360" element={<Customer360View />} />
                      <Route path="/portal" element={<CustomerPortal />} />
                      
                      {/* Sales */}
                      <Route path="/sales" element={<SalesOverview />} />
                      
                      {/* Products */}
                      <Route path="/products" element={<ProductCatalog />} />
                      
                      {/* Integration */}
                      <Route path="/integration" element={<SyncDashboard />} />
                      <Route path="/integration/workflows" element={<WorkflowBuilder />} />
                      
                      {/* Reports */}
                      <Route path="/reports" element={<ReportDashboard />} />
                      
                      {/* Default redirect */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      
                      {/* 404 fallback */}
                      <Route 
                        path="*" 
                        element={
                          <div className="not-found">
                            <h1>404 - Page Not Found</h1>
                            <p>The page you're looking for doesn't exist.</p>
                            <button onClick={() => window.history.back()}>
                              Go Back
                            </button>
                          </div>
                        } 
                      />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </ErrorBoundary>
    </div>
  );
};

export default App;