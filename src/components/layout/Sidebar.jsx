import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BrainCircuit, 
  LayoutDashboard, 
  FolderKanban, 
  Settings, 
  LogOut,
  Database,
  Network,
  Users
} from 'lucide-react';
import { cn } from '../ui/Button';

export function Sidebar({ role = 'designer' }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Basic logout handling
    navigate('/login');
  };

  const getLinksByRole = () => {
    if (role === 'designer') {
      return [
        { name: 'Dashboard', path: '/dashboard/designer', icon: LayoutDashboard },
        { name: 'My Applications', path: '/dashboard/designer/apps', icon: FolderKanban },
        { name: 'Database Schemas', path: '/dashboard/designer/schemas', icon: Database },
        { name: 'REST APIs', path: '/dashboard/designer/apis', icon: Network },
      ];
    }
    if (role === 'org_admin') {
      return [
        { name: 'Dashboard', path: '/dashboard/org-admin', icon: LayoutDashboard },
        { name: 'Applications', path: '/dashboard/org-admin/apps', icon: FolderKanban },
        { name: 'Designers', path: '/dashboard/org-admin/designers', icon: Users },
      ];
    }
    if (role === 'sys_admin') {
      return [
        { name: 'Overview', path: '/dashboard/sys-admin', icon: LayoutDashboard },
        { name: 'Organizations', path: '/dashboard/sys-admin/orgs', icon: Users },
        { name: 'Platform Users', path: '/dashboard/sys-admin/users', icon: Users },
      ];
    }
    return [];
  };

  const links = getLinksByRole();

  return (
    <aside className="w-64 glass border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <BrainCircuit className="h-6 w-6 text-primary-500 mr-2" />
        <span className="text-lg font-bold text-white tracking-tight">Entera.ai</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) => cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive 
                    ? 'bg-primary-500/10 text-primary-400' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {link.name}
              </NavLink>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-white/10 space-y-1">
        <NavLink 
          to="/settings"
          className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </NavLink>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
