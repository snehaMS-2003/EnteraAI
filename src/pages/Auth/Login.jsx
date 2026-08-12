import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        const role = data.user?.role;
        if (role === 'sys_admin' || email.includes('admin')) {
          navigate('/dashboard/sys-admin');
        } else if (role === 'org_admin' || email.includes('org')) {
          navigate('/dashboard/org-admin');
        } else {
          navigate('/dashboard/org-admin');
        }
      } else {
        setErrorMsg(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Failed to connect to server');
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
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-sm">
                  {errorMsg}
                </div>
              )}
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
                  <Input 
                    label="Email Address" 
                    type="email" 
                    name="email"
                    className="pl-10" 
                    placeholder="you@company.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
                  <Input 
                    label="Password" 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="pl-10 pr-10" 
                    placeholder="••••••••" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-sm mt-4">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500/20" />
                    Remember Me
                  </label>
                  <a href="#" className="text-primary-400 hover:text-primary-300">Forgot Password?</a>
                </div>
                
                <Button type="submit" className="w-full mt-6 h-12 text-lg" disabled={loading}>
                  {loading ? 'Signing in...' : 'Login'}
                </Button>
              </form>
              
              <p className="text-center text-sm text-gray-400 mt-6">
                Don't have an account? <Link to="/register" className="text-primary-400 hover:text-primary-300">Create Organization Account</Link>
              </p>
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
