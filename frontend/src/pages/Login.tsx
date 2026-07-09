import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      await api.auth.login({ username, password });
      const userRes = await api.auth.me();
      if (userRes.authenticated && userRes.username && userRes.businessName && userRes.currency) {
        onLoginSuccess({
          username: userRes.username,
          businessName: userRes.businessName,
          currency: userRes.currency
        });
        navigate('/');
      } else {
        setError('Authentication succeeded but failed to load profile.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
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
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col safe-area-top safe-area-bottom">
      <div className="flex-1 flex flex-col justify-center px-5 py-8 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-brand-50 rounded-2xl mb-4">
            <Zap className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Sign in to manage your billing
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-600 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username</label>
            <input
              type="text"
              required
              placeholder="e.g. admin"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Lock className="h-3.5 w-3.5" />
          <span>Secured with HttpOnly cookies</span>
        </div>
      </div>
    </div>
  );
}
