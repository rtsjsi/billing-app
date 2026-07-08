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
    // Confirm if setup is actually needed
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
      setError('Please fill in all required fields (username, password, business name).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
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
      
      // Setup automatically logs in, so fetch 'me' details
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 md:p-10 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-blue-100 rounded-2xl border border-sky-500/20 mb-4 animate-pulse-slow">
            <Zap className="h-8 w-8 text-blue-600 fill-sky-400/20" />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">
            Welcome to BillingApp
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-md">
            Initialize your local single-user business invoicing environment. This is a one-time configuration process.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-600 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Admin Credentials */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-blue-600 border-b border-slate-200 pb-1 uppercase tracking-wider">
                1. Admin Account
              </h2>
              
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Username *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. admin"
                  className="w-full form-input text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Password *</label>
                <input 
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  className="w-full form-input text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Confirm Password *</label>
                <input 
                  type="password"
                  required
                  placeholder="Repeat your password"
                  className="w-full form-input text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Right Column: Profile details */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-blue-600 border-b border-slate-200 pb-1 uppercase tracking-wider">
                2. Business Profile
              </h2>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Business Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Acme Consulting"
                  className="w-full form-input text-sm"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Owner Name (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full form-input text-sm"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5">Email Address (Optional)</label>
                <input 
                  type="email"
                  placeholder="e.g. billing@acme.com"
                  className="w-full form-input text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center">
              <CheckCircle className="h-4 w-4 text-emerald-500 mr-1.5" />
              PBKDF2 security active
            </span>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-medium py-2.5 px-5 rounded-lg flex items-center space-x-2 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-all text-sm duration-200"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Configuring...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
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
