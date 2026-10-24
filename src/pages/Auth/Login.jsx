import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { buildApiUrl, apiFetch, pingBackendWarmup } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    // Proactively ping backend to wake it up if idle
    pingBackendWarmup();
  }, []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Field validation and touch state
  const [errors, setErrors] = useState({ username: '', password: '' });
  const [touched, setTouched] = useState({ username: false, password: false });

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const validateField = (name, val) => {
    if (name === 'username') {
      const trimmed = (val || '').trim();
      if (!trimmed) {
        return 'Email or username is required.';
      }
      if (trimmed.length < 2 || trimmed.length > 100) {
        return 'Email or username must contain between 2 and 100 characters.';
      }
      return '';
    }
    if (name === 'password') {
      if (!val) {
        return 'Password is required.';
      }
      if (typeof val === 'string' && val.trim().length === 0) {
        return 'Password cannot contain only spaces.';
      }
      return '';
    }
    return '';
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const val = field === 'username' ? username : password;
    const err = validateField(field, val);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setUsername(val);
    if (touched.username) {
      setErrors(prev => ({ ...prev, username: validateField('username', val) }));
    }
    if (errorMsg) {
      setErrorMsg('');
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validateField('password', val) }));
    }
    if (errorMsg) {
      setErrorMsg('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    setErrorMsg('');

    // Mark all touched and validate
    setTouched({ username: true, password: true });
    const userErr = validateField('username', username);
    const passErr = validateField('password', password);

    setErrors({ username: userErr, password: passErr });

    if (userErr) {
      usernameRef.current?.focus();
      return;
    }
    if (passErr) {
      passwordRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: username.trim(), password }),
      });

      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      }

      if (response.ok && data.user) {
        data.user.organizationId = data.user.organizationId || data.user.organization_id;
        localStorage.setItem('user', JSON.stringify(data.user));
        if (login) {
          login(data.user);
        }
        const role = (data.user?.role || '').toLowerCase();
        
        if (role === 'sys_admin') {
          window.location.href = '/admin/dashboard';
        } else if (role === 'org_admin') {
          window.location.href = '/org-admin/dashboard';
        } else if (role === 'app_admin') {
          window.location.href = '/app-admin/dashboard';
        } else if (role === 'designer' || role === 'lead_designer') {
          window.location.href = '/designer/dashboard';
        } else if (role === 'student') {
          window.location.href = '/student/dashboard';
        } else if (role === 'user') {
          window.location.href = '/user/dashboard';
        } else {
          window.location.href = '/user/dashboard';
        }
      } else {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          setErrorMsg('The cloud server is waking up from sleep. Please wait a few seconds and try logging in again.');
        } else if (response.status >= 500) {
          setErrorMsg(data.error || 'The server encountered an error. Please try again shortly.');
        } else if (response.status === 429) {
          setErrorMsg(data.error || 'Too many attempts. Please wait a moment.');
        } else {
          setErrorMsg(data.error || 'Invalid username or password.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex gap-8 items-center">
        
        {/* Left Side: Login Form */}
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
              <h2 className="text-2xl font-bold mb-2">Welcome Back to Entera</h2>
              <p className="text-gray-400 mb-6">Sign in to continue building enterprise applications with AI.</p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm flex items-center gap-2" role="alert">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <form onSubmit={handleLogin} noValidate className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                  <Input 
                    ref={usernameRef}
                    id="login-username"
                    label="Email or Username" 
                    type="text" 
                    name="username"
                    className="pl-10" 
                    placeholder="Enter your email or username" 
                    required 
                    value={username}
                    onChange={handleUsernameChange}
                    onBlur={() => handleBlur('username')}
                    error={touched.username ? errors.username : ''}
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                  <Input 
                    ref={passwordRef}
                    id="login-password"
                    label="Password" 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="pl-10 pr-10" 
                    placeholder="••••••••" 
                    required 
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={() => handleBlur('password')}
                    error={touched.password ? errors.password : ''}
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
                
                <div className="flex items-center justify-between text-sm mt-4">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500/20" 
                    />
                    Remember Me
                  </label>
                  <Link to="/forgot-password" id="forgot-password-link" className="text-primary-400 hover:text-primary-300">Forgot Password?</Link>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full mt-6 h-12 text-lg flex items-center justify-center gap-2" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </form>
              
              <div className="text-center text-sm text-gray-400 mt-6 space-y-2">
                <p>
                  Don't have an account? <Link to="/register" className="text-primary-400 hover:text-primary-300">Create Organization Account</Link>
                </p>
                <p className="pt-2 border-t border-white/5 text-xs">
                  Are you a student or parent?{' '}
                  <Link to="/student/login" className="text-primary-400 hover:text-primary-300 font-medium">
                    Go to Student Portal →
                  </Link>
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
        
        {/* Right Side: Illustration (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md relative"
          >
            <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
            <div className="relative glass-card aspect-square rounded-full flex flex-col items-center justify-center border border-primary-500/30 p-8 text-center gap-4">
              <BrainCircuit className="h-16 w-16 text-primary-500" />
              <h3 className="text-xl font-bold">AI Brain Processing</h3>
              <p className="text-sm text-gray-400">Workflow • Database • REST API • Cloud Deployment</p>
            </div>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
