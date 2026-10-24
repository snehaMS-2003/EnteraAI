import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { buildApiUrl, apiFetch } from '../../utils/api';

export function StudentResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Password rules validation
  const passwordChecks = {
    minLen: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg('Missing password reset token. Please request a new link from the Forgot Password page.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Password does not meet the security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch('/api/student/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          setErrorMsg('The cloud server is currently waking up from sleep. Please wait a few seconds and try again.');
          return;
        }
        setErrorMsg(data.error || 'Failed to reset password. The link may have expired or already been used.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMsg('Network error. Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="h-11 w-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Entera<span className="text-primary-500">.ai</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Student Account Security
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Set New Student Password
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Create a secure password to access your student portal.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8">
            {success ? (
              <div className="text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Password Updated!</h2>
                <p className="text-sm text-gray-300">
                  Your student password has been reset successfully. You can now log in with your new credentials.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => navigate('/student/login')}
                    className="w-full bg-primary-600 hover:bg-primary-500 h-11 flex items-center justify-center gap-2"
                  >
                    <span>Sign In to Student Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {!token && (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>No reset token provided. Please use the link sent to your email.</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                  <Input
                    id="new-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="New Password"
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none z-10"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm New Password"
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none z-10"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Checklist */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-xs grid grid-cols-2 gap-2">
                  <span className={`flex items-center gap-1.5 ${passwordChecks.minLen ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> 8+ Characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.upper ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Uppercase
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.lower ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Lowercase
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.number ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Number (0-9)
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.special ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Special symbol
                  </span>
                  <span className={`flex items-center gap-1.5 ${confirmPassword && password === confirmPassword ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full h-11 text-base font-semibold bg-primary-600 hover:bg-primary-500 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <div className="pt-4 border-t border-white/10 text-center">
                  <Link
                    to="/student/login"
                    className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                  >
                    Back to Student Login
                  </Link>
                </div>
              </form>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
