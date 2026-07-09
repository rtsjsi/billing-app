import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

interface SetupProps {
  onSetupComplete: (user: { username: string; businessName: string; currency: string }) => void;
}

export default function Setup({ onSetupComplete }: SetupProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { needsSetup } = await api.auth.checkSetupStatus();
        if (!needsSetup) {
          navigate('/login');
        }
      } catch (err) {
        console.error('Failed to check setup status', err);
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password || !businessName) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.setup({
        username,
        password,
        business_name: businessName,
        owner_name: ownerName,
        email
      });

      const userRes = await api.auth.me();
      if (userRes.authenticated && userRes.username && userRes.businessName && userRes.currency) {
        onSetupComplete({
          username: userRes.username,
          businessName: userRes.businessName,
          currency: userRes.currency
        });
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] safe-area-top safe-area-bottom">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-brand-50 rounded-2xl mb-4">
            <Zap className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-900 tracking-tight">
            Set up BillingApp
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            One-time setup to configure your invoicing workspace
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-600 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="app-card p-5 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
                Admin Account
              </h2>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username *</label>
                <input type="text" required placeholder="e.g. admin" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password *</label>
                <input type="password" required placeholder="At least 6 characters" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm Password *</label>
                <input type="password" required placeholder="Repeat password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
                Business Profile
              </h2>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Business Name *</label>
                <input type="text" required placeholder="e.g. Acme Consulting" className="form-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Owner Name</label>
                <input type="text" placeholder="e.g. John Doe" className="form-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
                <input type="email" placeholder="billing@acme.com" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-brand-500" />
              PBKDF2 security active
            </span>
            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Configuring...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
