import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { api } from '../lib/api';

interface LoginProps {
  onLoginSuccess: (user: { username: string; businessName: string; currency: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if system has any users; if not, go to setup
    const checkSetup = async () => {
      try {
        const { needsSetup } = await api.auth.checkSetupStatus();
        if (needsSetup) {
          navigate('/setup');
        }
      } catch (err) {
        console.error('Failed to check setup status', err);
      } finally {
        setChecking(false);
      }
    };
    checkSetup();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      // Use login method pointing to /api/auth/login
      await api.auth.login({ username, password });
      
      // Load user profile
      const userRes = await api.auth.me();
      if (userRes.authenticated && userRes.username && userRes.businessName && userRes.currency) {
        onLoginSuccess({
          username: userRes.username,
          businessName: userRes.businessName,
          currency: userRes.currency
        });
        navigate('/');
      } else {
        setError('Authentication succeeded but failed to load user profile settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
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
      {/* Background glowing blobs */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-blue-100 rounded-2xl border border-sky-500/20 mb-4">
            <Zap className="h-8 w-8 text-blue-600 fill-sky-400/20" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
            Sign In to BillingApp
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Enter your credentials to manage your business
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-600 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Username</label>
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs text-slate-400 font-medium uppercase tracking-wider">Password</label>
            </div>
            <input 
              type="password"
              required
              placeholder="••••••••"
              className="w-full form-input text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-all text-sm duration-200"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200/40 text-center flex items-center justify-center space-x-2 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          <span>Secured with HttpOnly Cookies</span>
        </div>
      </div>
    </div>
  );
}
