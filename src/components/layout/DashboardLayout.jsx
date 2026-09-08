import React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';

export function DashboardLayout({ role = 'designer' }) {
  const user = useAuth();
  const navigate = useNavigate();

  // Authentication Guard
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based Authorization Guard
  if (role === 'sys_admin' && user.role !== 'sys_admin') {
    return <Navigate to="/org-admin/dashboard" replace />;
  }
  
  if (role === 'org_admin' && user.role !== 'org_admin' && user.role !== 'sys_admin') {
    return <Navigate to="/lead-designer/dashboard" replace />;
  }

  if (role === 'lead_designer' && user.role !== 'lead_designer' && user.role !== 'org_admin' && user.role !== 'sys_admin') {
    return <Navigate to="/designer/dashboard" replace />;
  }

  // If role is designer, redirect higher roles to their proper dashboards so they don't get stuck.
  if (role === 'designer') {
    if (user.role === 'sys_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'org_admin') {
      return <Navigate to="/org-admin/dashboard" replace />;
    } else if (user.role === 'lead_designer') {
      return <Navigate to="/lead-designer/dashboard" replace />;
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar role={role} />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10 h-9" placeholder="Search applications..." />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-500/20 border border-primary-500 flex items-center justify-center text-primary-400">
              <User className="h-4 w-4" />
            </div>
            <button 
              onClick={handleLogout}
              className="ml-2 flex items-center gap-2 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
