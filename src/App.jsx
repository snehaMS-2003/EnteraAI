import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { AcceptInvite } from './pages/Auth/AcceptInvite';

// Dashboards
import { AppDesigner } from './pages/Dashboards/AppDesigner';
import { OrgAdmin } from './pages/Dashboards/OrgAdmin';
import { OrgApplications } from './pages/Dashboards/OrgApplications';
import { OrgCreateApplication } from './pages/Dashboards/OrgCreateApplication';
import { OrgApplicationDetails } from './pages/Dashboards/OrgApplicationDetails';
import { OrgUsers } from './pages/Dashboards/OrgUsers';
import { OrgProfile } from './pages/Dashboards/OrgProfile';
import { UserProfile } from './pages/Dashboards/UserProfile';
import { SystemAdmin } from './pages/Dashboards/SystemAdmin';
import { SysAdminOrganizations } from './pages/Dashboards/SysAdminOrganizations';
import { SysAdminOrganizationDetails } from './pages/Dashboards/SysAdminOrganizationDetails';
import { SysAdminUsers } from './pages/Dashboards/SysAdminUsers';
import { CreateApplication } from './pages/Dashboards/CreateApplication';
import { ConfigureApplication } from './pages/Dashboards/ConfigureApplication';
import { DesignerApplications } from './pages/Dashboards/DesignerApplications';
import { ApplicationWorkflow } from './pages/Dashboards/Workflow/ApplicationWorkflow';
import { DatabaseSchemasStandalone } from './pages/Dashboards/DatabaseSchemasStandalone';
import { RestApisStandalone } from './pages/Dashboards/RestApisStandalone';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
        </Route>
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        
        {/* App Designer Dashboard */}
        <Route path="/designer/dashboard" element={<DashboardLayout role="designer" />}>
          <Route index element={<AppDesigner />} />
          <Route path="apps" element={<DesignerApplications />} />
          <Route path="apps/:id/workflow/*" element={<ApplicationWorkflow />} />
          <Route path="database-schemas" element={<DatabaseSchemasStandalone />} />
          <Route path="apis" element={<RestApisStandalone />} />
          <Route path="settings" element={<UserProfile />} />
        </Route>
        
        {/* Lead Designer Dashboard */}
        <Route path="/lead-designer/dashboard" element={<DashboardLayout role="lead_designer" />}>
          <Route index element={<AppDesigner />} />
          <Route path="apps" element={<DesignerApplications />} />
          <Route path="apps/:id/workflow/*" element={<ApplicationWorkflow />} />
          <Route path="database-schemas" element={<DatabaseSchemasStandalone />} />
          <Route path="apis" element={<RestApisStandalone />} />
          <Route path="settings" element={<UserProfile />} />
        </Route>
        
        {/* Org Admin Dashboard */}
        <Route path="/org-admin/dashboard" element={<DashboardLayout role="org_admin" />}>
          <Route index element={<OrgAdmin />} />
          <Route path="apps" element={<OrgApplications />} />
          <Route path="apps/create" element={<OrgCreateApplication />} />
          <Route path="apps/:id" element={<OrgApplicationDetails />} />
          <Route path="database-schemas" element={<DatabaseSchemasStandalone />} />
          <Route path="apis" element={<RestApisStandalone />} />
          <Route path="users" element={<OrgUsers />} />
          <Route path="profile" element={<OrgProfile />} />
          <Route path="settings" element={<UserProfile />} />
        </Route>
        
        {/* System Admin Dashboard */}
        <Route path="/admin/dashboard" element={<DashboardLayout role="sys_admin" />}>
          <Route index element={<SystemAdmin />} />
          <Route path="orgs" element={<SysAdminOrganizations />} />
          <Route path="orgs/:id" element={<SysAdminOrganizationDetails />} />
          <Route path="users" element={<SysAdminUsers />} />
          <Route path="settings" element={<UserProfile />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
