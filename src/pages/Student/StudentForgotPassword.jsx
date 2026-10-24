import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { buildApiUrl, apiFetch } from '../../utils/api';

export function StudentForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your registered email address or admission number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await apiFetch('/api/student/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed, email: trimmed, admissionNumber: trimmed }),
      });

      const data = await response.json().catch(() => ({}));

      // Generic response always shown to prevent account enumeration
      setSubmitted(true);
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch (err) {
      console.error('Student forgot password error:', err);
      setErrorMsg('Unable to submit request. Please try again later.');
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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Reset Student Password
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Enter your registered email address or student admission number.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8">
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Reset Instructions Sent</h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  If an active account exists matching <strong>{identifier}</strong>, password reset instructions and a secure single-use link have been sent.
                </p>

                {devResetUrl && (
                  <div className="p-3 rounded-lg bg-primary-950/40 border border-primary-500/30 text-left text-xs space-y-1">
                    <p className="font-semibold text-primary-300 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" /> Development / Test Reset Link:
                    </p>
                    <a
                      href={devResetUrl}
                      className="text-primary-400 underline break-all hover:text-primary-300 flex items-center gap-1"
                    >
                      <span>Proceed to Reset Password</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                <div className="pt-4">
                  <Link to="/student/login">
                    <Button className="w-full bg-primary-600 hover:bg-primary-500 h-10">
                      Return to Student Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {errorMsg && (
                  <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                  <Input
                    id="student-forgot-id"
                    name="identifier"
                    label="Email or Admission Number"
                    placeholder="student@school.edu or ADM-0114"
                    className="pl-10"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    helperText="We will look up your registered account"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base font-semibold bg-primary-600 hover:bg-primary-500 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending instructions...</span>
                    </>
                  ) : (
                    'Send Password Reset Link'
                  )}
                </Button>

                <div className="pt-4 border-t border-white/10 text-center">
                  <Link
                    to="/student/login"
                    className="text-xs text-primary-400 hover:text-primary-300 font-medium inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Student Login
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
