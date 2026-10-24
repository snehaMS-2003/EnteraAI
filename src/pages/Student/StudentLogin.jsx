import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Building2,
  Hash
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { buildApiUrl, apiFetch, pingBackendWarmup } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

export function StudentLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [customOrgCode, setCustomOrgCode] = useState('');
  const [orgMode, setOrgMode] = useState('select'); // 'select' | 'manual'

  useEffect(() => {
    pingBackendWarmup();
    apiFetch('/api/public/organizations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrganizations(data);
        }
      })
      .catch(err => console.warn('Could not fetch organizations for student login:', err));
  }, []);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState({ identifier: false, password: false });
  const [errors, setErrors] = useState({ identifier: '', password: '' });

  const idRef = useRef(null);
  const passRef = useRef(null);

  const validate = () => {
    const errs = {};
    const trimmedId = identifier.trim();
    if (!trimmedId) {
      errs.identifier = 'Email address or Admission Number is required.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    }
    return errs;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ identifier: true, password: true });

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.identifier) idRef.current?.focus();
      else if (validationErrors.password) passRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      let targetOrgCode = undefined;
      let targetOrgId = undefined;

      if (orgMode === 'manual' && customOrgCode.trim()) {
        targetOrgCode = customOrgCode.trim().toUpperCase();
      } else if (orgMode === 'select' && selectedOrgId) {
        targetOrgId = parseInt(selectedOrgId, 10);
        const selectedOrg = organizations.find(o => String(o.id) === String(selectedOrgId));
        if (selectedOrg?.org_code) {
          targetOrgCode = selectedOrg.org_code;
        }
      }

      const response = await apiFetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          organizationCode: targetOrgCode || undefined,
          orgCode: targetOrgCode || undefined,
          organizationId: targetOrgId || undefined
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.user) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          setErrorMsg('The cloud server is waking up from sleep. Please wait a few seconds and try again.');
        } else if (response.status >= 500) {
          setErrorMsg(data.error || 'The server encountered an error. Please try again shortly.');
        } else {
          setErrorMsg(data.error || 'Invalid email, admission number, or password.');
        }
        return;
      }

      // Login success: Store user session
      if (login) {
        login(data.user);
      } else {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // If Remember Me checked, can persist preference
      if (rememberMe) {
        localStorage.setItem('remembered_student_id', identifier.trim());
      } else {
        localStorage.removeItem('remembered_student_id');
      }

      // Navigate to dedicated Student Dashboard
      navigate('/student/dashboard');
    } catch (err) {
      console.error('Student login error:', err);
      setErrorMsg('Unable to connect to login service. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Entera<span className="text-primary-500">.ai</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Official Student & Parent Portal
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign In to Student Portal
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Access your academic records, attendance, and profile details.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8">
            {errorMsg && (
              <div
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} noValidate className="space-y-5">
              {/* School / Organization Selection */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary-400" />
                    School / Organization
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrgMode(prev => prev === 'select' ? 'manual' : 'select')}
                    className="text-primary-400 hover:text-primary-300 text-[11px] underline transition-colors"
                  >
                    {orgMode === 'select' ? 'Enter Code Manually' : 'Select from List'}
                  </button>
                </div>

                {orgMode === 'select' ? (
                  <Select
                    id="student-login-org-select"
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="text-xs h-9 bg-gray-900/90"
                  >
                    <option value="">Direct Login (Auto-Detect School)</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.org_code || `ORG-${org.id}`})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="relative">
                    <Hash className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
                    <Input
                      id="student-login-org-code"
                      placeholder="ENTER SCHOOL CODE (e.g. TECHCORP)"
                      value={customOrgCode}
                      onChange={(e) => setCustomOrgCode(e.target.value.toUpperCase())}
                      className="pl-8 text-xs uppercase font-mono tracking-wider h-9"
                    />
                  </div>
                )}

                <p className="text-[11px] text-gray-400">
                  {orgMode === 'select' && selectedOrgId
                    ? `Logging into: ${organizations.find(o => String(o.id) === String(selectedOrgId))?.name || 'Selected School'}`
                    : orgMode === 'manual' && customOrgCode.trim()
                    ? `School code: ${customOrgCode.trim().toUpperCase()}`
                    : 'Select your school or enter school code.'}
                </p>
              </div>

              <div className="relative">
                <User className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <Input
                  ref={idRef}
                  id="student-identifier"
                  name="identifier"
                  label="Email or Admission Number"
                  placeholder="e.g. ADM-0114 or student@school.edu"
                  className="pl-10"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, identifier: true }))}
                  error={touched.identifier ? errors.identifier : ''}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <Input
                  ref={passRef}
                  id="student-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  error={touched.password ? errors.password : ''}
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

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500/20"
                  />
                  Remember Me
                </label>
                <Link
                  to="/student/forgot-password"
                  id="student-forgot-password-link"
                  className="text-primary-400 hover:text-primary-300 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold bg-primary-600 hover:bg-primary-500 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Student Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Registration Callout */}
            <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-3">
              <p className="text-sm text-gray-400">
                New student or parent?{' '}
                <Link
                  to="/student/register"
                  id="student-register-link"
                  className="text-primary-400 hover:text-primary-300 font-semibold"
                >
                  Register & Link Student Account
                </Link>
              </p>
              <div>
                <Link
                  to="/login"
                  className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Administrator or Faculty? Entera Platform Login →
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
