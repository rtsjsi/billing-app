import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';

// Layout & Pages
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import Invoices from './pages/Invoices';
import InvoiceEditor from './pages/InvoiceEditor';
import InvoicePreview from './pages/InvoicePreview';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Setup from './pages/Setup';

interface UserSession {
  username: string;
  businessName: string;
  currency: string;
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // 1. Initial Authentication Check
  const checkAuth = async () => {
    try {
      const res = await api.auth.me();
      if (res.authenticated && res.username && res.businessName && res.currency) {
        setUser({
          username: res.username,
          businessName: res.businessName,
          currency: res.currency
        });
      } else {
        setUser(null);
        // If not authenticated, check setup status
        const setupRes = await api.auth.checkSetupStatus();
        setNeedsSetup(setupRes.needsSetup);
      }
    } catch (err) {
      console.error('Failed to query user profile details', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // 2. Global Unauthorized Kickback listener
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('api-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('api-unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (session: UserSession) => {
    setUser(session);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          <p className="text-slate-400 text-xs font-medium tracking-wide">Syncing local billing vault...</p>
        </div>
      </div>
    );
  }

  // Helper route guards
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) {
      return <Navigate to={needsSetup ? "/setup" : "/login"} replace />;
    }
    return <Layout user={user} onLogout={handleLogout}>{children}</Layout>;
  };

  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login onLoginSuccess={handleLoginSuccess} />
            </PublicRoute>
          } 
        />
        <Route 
          path="/setup" 
          element={
            <PublicRoute>
              <Setup onSetupComplete={handleLoginSuccess} />
            </PublicRoute>
          } 
        />

        {/* Protected Core Layout routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
        <Route path="/invoices/edit/:id" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
        <Route path="/invoices/preview/:id" element={<ProtectedRoute><InvoicePreview /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
