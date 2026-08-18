import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, ShieldCheck, User, Building, Briefcase, Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [userInfo, setUserInfo] = useState(null);
  const [validating, setValidating] = useState(true);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
      setValidating(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to verify token');
        }
        setUserInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setValidating(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate account');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-white text-lg flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          Verifying invitation...
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card p-8 rounded-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <CheckCircle2 className="h-32 w-32 text-primary-500" />
          </div>
          <div className="relative z-10 flex flex-col items-center justify-center space-y-4 py-8">
            <div className="h-16 w-16 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Account Activated!</h2>
            <p className="text-gray-400 text-sm max-w-xs">
              Your account has been successfully set up. Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Accept Invitation</h1>
            <p className="text-gray-400 text-sm">
              Complete your account setup to access your organization's applications.
            </p>
          </div>

          {error && !userInfo && (
             <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center">
               {error}
             </div>
          )}

          {userInfo && (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center">
                  {error}
                </div>
              )}
              
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-primary-400 shrink-0" />
                  <span className="text-sm font-medium text-white">{userInfo.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary-400 shrink-0" />
                  <span className="text-sm text-gray-400">{userInfo.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-primary-400 shrink-0" />
                  <span className="text-sm text-gray-400 capitalize">{userInfo.role.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-primary-400 shrink-0" />
                  <span className="text-sm text-gray-400">{userInfo.organization_name}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-400">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-400">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Activate Account <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </>
          )}
          
          <div className="mt-6 text-center text-sm text-gray-500">
            Return to <button type="button" onClick={() => navigate('/login')} className="text-primary-400 hover:underline">Log in</button>
          </div>
        </div>
      </div>
    </div>
  );
}
