import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!authLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      showToast('Welcome back! Login successful', 'success');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-primary-950 to-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary-500 flex items-center justify-center text-5xl mx-auto mb-4 shadow-xl">
            ⚕️
          </div>
          <h1 className="text-3xl font-bold text-white">BioMed CMS</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Biomedical Device Calibration & Maintenance System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-6">Sign in to your account</h2>

          {error && (
            <div className="alert-danger mb-4 rounded-xl">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-slate-300" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
                required
                autoFocus
                className="input bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="label text-slate-300" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-primary-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full btn-lg mt-2"
              disabled={isSubmitting}
              id="login-submit-btn"
            >
              {isSubmitting ? <><Spinner size="sm" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wide">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-slate-400">admin@hospital.com</p>
                <p className="text-slate-400">Admin@123</p>
              </div>
              <div>
                <p className="font-medium">Technician</p>
                <p className="text-slate-400">tech@hospital.com</p>
                <p className="text-slate-400">Tech@123</p>
              </div>
              <div>
                <p className="font-medium">Staff</p>
                <p className="text-slate-400">staff@hospital.com</p>
                <p className="text-slate-400">Staff@123</p>
              </div>
              <div>
                <p className="font-medium">Auditor</p>
                <p className="text-slate-400">auditor@hospital.com</p>
                <p className="text-slate-400">Audit@123</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2025 Biomedical Device Management System
        </p>
      </div>
    </div>
  );
}
