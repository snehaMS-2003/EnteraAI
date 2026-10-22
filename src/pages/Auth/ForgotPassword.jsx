import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { buildApiUrl } from '../../utils/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const emailRef = useRef(null);
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validateEmail = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return 'Email address is required.';
    }
    if (!emailRegex.test(trimmed)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (touched) {
      setFieldError(validateEmail(val));
    }
    if (errorMsg) {
      setErrorMsg('');
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setFieldError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    setErrorMsg('');
    setTouched(true);
    const err = validateEmail(email);
    setFieldError(err);

    if (err) {
      emailRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(buildApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-test-mode': 'true',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setSubmitted(true);
        setSuccessMsg(
          data?.message ||
          'If an account exists for this email, password reset instructions have been sent.'
        );
        if (data?.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
        if (data?.devResetUrl) {
          setDevResetUrl(data.devResetUrl);
        }
      } else {
        // Backend failure or rate limiting
        const errorMessage = data?.error || 'Unable to process your request at this time. Please try again.';
        setErrorMsg(errorMessage);
      }
    } catch (err) {
      console.error('Forgot password network error:', err);
      setErrorMsg('Unable to connect to the server. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex gap-8 items-center">
        
        {/* Left Side: Form */}
        <div className="w-full lg:w-1/2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
              <BrainCircuit className="h-8 w-8 text-primary-500" />
              <Link to="/" className="text-2xl font-bold text-white tracking-tight">
                Entera<span className="text-primary-500">.ai</span>
              </Link>
            </div>
            
            <Card className="p-8">
              {!submitted ? (
                <>
                  <h2 className="text-2xl font-bold mb-2 text-white">Reset Your Password</h2>
                  <p className="text-gray-400 mb-6 text-sm">
                    Enter the email address associated with your account, and we will send you secure password reset instructions.
                  </p>

                  {errorMsg && (
                    <div 
                      className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm flex items-center gap-2" 
                      role="alert"
                      id="forgot-password-error"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                      <Input
                        ref={emailRef}
                        id="forgot-email"
                        label="Registered Email Address"
                        type="email"
                        name="email"
                        className="pl-10"
                        placeholder="you@company.com"
                        required
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleBlur}
                        error={touched ? fieldError : ''}
                        disabled={loading}
                        autoFocus
                      />
                    </div>

                    <Button
                      type="submit"
                      id="forgot-submit-btn"
                      className="w-full mt-6 h-12 text-base flex items-center justify-center gap-2 font-medium"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Sending instructions...</span>
                        </>
                      ) : (
                        'Send Reset Instructions'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-gray-800 text-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Sign In</span>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2 text-white">Check Your Email</h2>
                  
                  <div 
                    className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm mb-6 text-left"
                    id="forgot-success-message"
                  >
                    <p className="font-medium">{successMsg}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Please check your inbox and spam folder. The password reset link will expire in 1 hour.
                    </p>
                  </div>

                  {/* Live Delivered Email Preview Notification */}
                  {previewUrl && (
                    <div className="mb-6 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm text-left">
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        <Mail className="h-4 w-4 text-indigo-400" />
                        <span>Reset Email Delivered via SMTP</span>
                      </div>
                      <p className="text-xs text-indigo-200/80 mb-2">
                        Your password reset email has been dispatched by the mail server. You can view the actual delivered email in the web inbox below:
                      </p>
                      <a 
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        id="email-preview-link"
                        className="text-xs font-semibold text-primary-400 underline break-all hover:text-primary-300 block bg-black/40 p-2.5 rounded border border-primary-500/20"
                      >
                        View Delivered Email in Web Inbox &rarr;
                      </a>
                    </div>
                  )}

                  {/* Development safe helper notice if email service is not configured */}
                  {devResetUrl && (
                    <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm text-left">
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        <span>Development Mode Notice</span>
                      </div>
                      <p className="text-xs text-amber-200/80 mb-2">
                        Outbound SMTP email service is not configured in this development environment. Use the secure generated reset link below to complete your test:
                      </p>
                      <a 
                        href={devResetUrl}
                        id="dev-reset-link"
                        className="text-xs font-mono text-primary-400 underline break-all hover:text-primary-300 block bg-black/40 p-2 rounded"
                      >
                        {devResetUrl}
                      </a>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setEmail('');
                        setTouched(false);
                        setFieldError('');
                        setDevResetUrl('');
                      }}
                      variant="outline"
                      className="w-full h-11 text-sm"
                    >
                      Resend to Another Email
                    </Button>

                    <Link to="/login" className="block">
                      <Button className="w-full h-11 text-sm flex items-center justify-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Return to Sign In</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
        
        {/* Right Side: Illustration */}
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md relative"
          >
            <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
            <div className="relative glass-card aspect-square rounded-full flex flex-col items-center justify-center border border-primary-500/30 p-8 text-center gap-4">
              <ShieldCheck className="h-16 w-16 text-primary-500" />
              <h3 className="text-xl font-bold">Secure Account Recovery</h3>
              <p className="text-sm text-gray-400">Cryptographic tokens • Single-use verification • Enterprise grade protection</p>
            </div>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
export default ForgotPassword;
