import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Home } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export function AccessDenied() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    const role = (user.role || '').toLowerCase();
    if (role === 'sys_admin') return '/admin/dashboard';
    if (role === 'org_admin') return '/org-admin/dashboard';
    if (role === 'app_admin') return '/app-admin/dashboard';
    if (role === 'designer' || role === 'lead_designer') return '/designer/dashboard';
    if (role === 'user') return '/user/dashboard';
    return '/login';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleDisplay = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'UNKNOWN';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center border-red-500/30 bg-red-950/10 shadow-2xl space-y-6">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <ShieldAlert className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 tracking-wider uppercase">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Access Denied</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            You do not have permission to access this page with your current role{' '}
            <span className="text-primary-400 font-semibold font-mono">[{roleDisplay}]</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left text-xs text-gray-400 space-y-1">
          <p><span className="text-gray-300 font-medium">Logged in as:</span> {user?.username || user?.name || user?.email || 'Authenticated User'}</p>
          <p><span className="text-gray-300 font-medium">Assigned Role:</span> {roleDisplay}</p>
          <p><span className="text-gray-300 font-medium">Organization:</span> {user?.organizationName || user?.organization_name || 'Standard Tenant'}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => navigate(getDashboardPath())}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium h-11"
          >
            <Home className="h-4 w-4" />
            Return to Authorized Dashboard
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border-white/10 hover:bg-white/5 text-gray-300 h-11"
          >
            <LogOut className="h-4 w-4 text-red-400" />
            Sign in as Different User
          </Button>
        </div>
      </Card>
    </div>
  );
}
