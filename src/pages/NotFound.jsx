import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'sys_admin':
        return '/admin/dashboard';
      case 'org_admin':
        return '/org-admin/dashboard';
      case 'lead_designer':
        return '/lead-designer/dashboard';
      case 'designer':
        return '/designer/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen bg-dark-500 text-white flex flex-col items-center justify-center p-6 font-sans antialiased">
      <div className="max-w-md w-full bg-dark-300/80 border border-white/10 rounded-2xl p-8 text-center space-y-5 shadow-2xl backdrop-blur-sm">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            HTTP 404
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white pt-1">
            Page Not Found
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            The page or route you requested does not exist or has been moved.
          </p>
        </div>

        <div className="pt-3 flex flex-col sm:flex-row justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2 text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>

          {user ? (
            <Button
              variant="primary"
              onClick={() => navigate(getDashboardPath())}
              className="gap-2 text-xs"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="gap-2 text-xs"
            >
              <Home className="h-4 w-4" /> Home
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
