import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, Lock, Eye, EyeOff, Check, X, Loader2, 
  CheckCircle2, AlertCircle, ArrowLeft, ShieldAlert, KeyRound
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { buildApiUrl, apiFetch } from '../../utils/api';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = (searchParams.get('token') || '').trim();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Password rules checklist
  const rules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  // Verify token on mount
  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!tokenFromUrl) {
        if (isMounted) {
          setVerifyingToken(false);
          setTokenValid(false);
          setTokenError('Missing password reset token. Please request a new password reset link.');
        }
        return;
      }

      try {
        const response = await apiFetch(`/api/auth/verify-reset-token/${encodeURIComponent(tokenFromUrl)}`);
        const data = await response.json().catch(() => null);

        if (isMounted) {
          setVerifyingToken(false);
          if (response.ok && data?.valid) {
            setTokenValid(true);
            setTokenError('');
            if (data?.email) setMaskedEmail(data.email);
          } else {
            setTokenValid(false);
            setTokenError(data?.error || 'Invalid or expired password reset token.');
          }
        }
      } catch (err) {
        console.error('Verify token error:', err);
        if (isMounted) {
          setVerifyingToken(false);
          // Network failure on initial check - let user try submitting or display error
          setTokenValid(true); // Don't block completely if temporary network glitch
        }
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, [tokenFromUrl]);

  const validateField = (field, value, otherPassword = password) => {
    if (field === 'password') {
      if (!value) return 'Password is required.';
      const currentRules = {
        minLength: value.length >= 8,
        hasUpper: /[A-Z]/.test(value),
        hasLower: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        hasSpecial: /[^A-Za-z0-9]/.test(value),
      };
      if (!Object.values(currentRules).every(Boolean)) {
        return 'Password must satisfy all security requirements.';
      }
      return '';
    }
    if (field === 'confirmPassword') {
      if (!value) return 'Please confirm your new password.';
      if (value !== otherPassword) return 'Passwords do not match.';
      return '';
    }
    return '';
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (touched.password) {
      setErrors(prev => ({
        ...prev,
        password: validateField('password', val, val)
      }));
    }
    if (touched.confirmPassword && confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: validateField('confirmPassword', confirmPassword, val)
      }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    if (touched.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: validateField('confirmPassword', val, password)
      }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const val = field === 'password' ? password : confirmPassword;
    const err = validateField(field, val, password);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submissions

    setSubmitError('');

    // Mark all as touched and validate
    setTouched({ password: true, confirmPassword: true });
    const passErr = validateField('password', password, password);
    const confErr = validateField('confirmPassword', confirmPassword, password);

    setErrors({ password: passErr, confirmPassword: confErr });

    if (passErr) {
      passwordRef.current?.focus();
      return;
    }
    if (confErr) {
      confirmPasswordRef.current?.focus();
      return;
    }

    if (!tokenFromUrl) {
      setSubmitError('Missing reset token. Please request a new reset link.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: tokenFromUrl,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setResetSuccess(true);
      } else {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          setSubmitError('The cloud server is currently waking up from sleep. Please wait a few seconds and try again.');
          return;
        }
        const errorMsg = data?.error || 'Failed to reset password. Please request a new reset link.';
        setSubmitError(errorMsg);
      }
    } catch (err) {
      console.error('Password reset submit error:', err);
      setSubmitError('Unable to connect to the server. Please check your network and try again.');
    } finally {
      setSubmitting(false);
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
              {/* Initial token check spinner */}
              {verifyingToken ? (
                <div className="py-12 text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" />
                  <p className="text-gray-400 text-sm">Validating your reset link...</p>
                </div>
              ) : tokenError ? (
                /* Invalid / Expired Token Screen */
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="h-8 w-8 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Reset Link Invalid or Expired</h2>
                  <p className="text-gray-400 text-sm">
                    {tokenError}
                  </p>
                  <div className="pt-4 space-y-3">
                    <Link to="/forgot-password" className="block">
                      <Button className="w-full h-11 text-sm">
                        Request a New Reset Link
                      </Button>
                    </Link>
                    <Link to="/login" className="block">
                      <Button variant="outline" className="w-full h-11 text-sm">
                        Return to Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : resetSuccess ? (
                /* Success Screen */
                <div className="text-center py-4 space-y-4" id="reset-success-container">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Password Reset Successfully</h2>
                  <p className="text-gray-400 text-sm">
                    Your password has been updated securely. You can now sign in with your new credentials.
                  </p>
                  <div className="pt-4">
                    <Button
                      id="reset-login-redirect-btn"
                      onClick={() => navigate('/login')}
                      className="w-full h-12 text-base flex items-center justify-center gap-2 font-medium"
                    >
                      <span>Proceed to Sign In</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Reset Password Form */
                <>
                  <h2 className="text-2xl font-bold mb-2 text-white">Set New Password</h2>
                  <p className="text-gray-400 mb-6 text-sm">
                    {maskedEmail ? (
                      <>Resetting password for <span className="text-white font-medium">{maskedEmail}</span>.</>
                    ) : (
                      'Please choose a strong password that meets enterprise security standards.'
                    )}
                  </p>

                  {submitError && (
                    <div 
                      className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm flex items-center gap-2"
                      role="alert"
                      id="reset-submit-error"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    {/* New Password */}
                    <div className="relative">
                      <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                      <Input
                        ref={passwordRef}
                        id="new-password"
                        label="New Password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={handlePasswordChange}
                        onBlur={() => handleBlur('password')}
                        error={touched.password ? errors.password : ''}
                        disabled={submitting}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none z-10"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Confirm New Password */}
                    <div className="relative">
                      <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                      <Input
                        ref={confirmPasswordRef}
                        id="confirm-password"
                        label="Confirm New Password"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        onBlur={() => handleBlur('confirmPassword')}
                        error={touched.confirmPassword ? errors.confirmPassword : ''}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none z-10"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Requirements Checklist (Live Feedback) */}
                    <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-1.5 text-xs text-gray-400">
                      <p className="font-semibold text-gray-300 mb-1">Password Requirements:</p>
                      
                      <div className={`flex items-center gap-1.5 ${rules.minLength ? 'text-emerald-400' : 'text-gray-500'}`} id="rule-min-length">
                        {rules.minLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        <span>At least 8 characters</span>
                      </div>

                      <div className={`flex items-center gap-1.5 ${rules.hasUpper ? 'text-emerald-400' : 'text-gray-500'}`} id="rule-has-upper">
                        {rules.hasUpper ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        <span>At least one uppercase letter (A-Z)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 ${rules.hasLower ? 'text-emerald-400' : 'text-gray-500'}`} id="rule-has-lower">
                        {rules.hasLower ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        <span>At least one lowercase letter (a-z)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 ${rules.hasNumber ? 'text-emerald-400' : 'text-gray-500'}`} id="rule-has-number">
                        {rules.hasNumber ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        <span>At least one number (0-9)</span>
                      </div>

                      <div className={`flex items-center gap-1.5 ${rules.hasSpecial ? 'text-emerald-400' : 'text-gray-500'}`} id="rule-has-special">
                        {rules.hasSpecial ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        <span>At least one special character (!@#$%^&*...)</span>
                      </div>

                      {confirmPassword && (
                        <div className={`flex items-center gap-1.5 pt-1 border-t border-gray-800 ${doPasswordsMatch ? 'text-emerald-400' : 'text-red-400'}`} id="rule-passwords-match">
                          {doPasswordsMatch ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                          <span>{doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      id="reset-submit-btn"
                      className="w-full mt-6 h-12 text-base flex items-center justify-center gap-2 font-medium"
                      disabled={submitting || !isPasswordValid}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Updating password...</span>
                        </>
                      ) : (
                        'Update Password'
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
              <KeyRound className="h-16 w-16 text-primary-500" />
              <h3 className="text-xl font-bold">Credential Security</h3>
              <p className="text-sm text-gray-400">Argon2 / Bcrypt salted hashing • Session termination • Role protection</p>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
export default ResetPassword;
