import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Layers, 
  ExternalLink, 
  ArrowLeft, 
  Eye, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Table as TableIcon,
  ChevronRight,
  FileText,
  Home,
  CheckCircle2,
  Users,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function AppRuntime({ 
  previewMode: propPreviewMode, 
  directRouteSlug, 
  initialActivePageSlug, 
  onExitPreview, 
  propAppId 
}) {
  const { appIdentifier, pageSlug, subSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appData, setAppData] = useState(null);
  
  // Runtime data state (for database-driven tables)
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals for CRUD operations
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEditRecord, setCurrentEditRecord] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    course: 'Computer Science',
    status: 'Active'
  });
  const [formSaving, setFormSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const isPreview = Boolean(propPreviewMode || location.pathname.startsWith('/preview'));

  // Resolve application identifier and page slug
  const effectiveAppIdentifier = propAppId || appIdentifier || (directRouteSlug ? 'students' : (localStorage.getItem('lastSelectedAppId') || '5'));
  const effectivePageSlug = pageSlug || (directRouteSlug === 'student-list' ? 'student-list' : (subSlug === 'list' ? 'student-list' : initialActivePageSlug));

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch application structure from PostgreSQL
  const fetchAppRuntime = useCallback(async () => {
    if (!effectiveAppIdentifier) return;
    setLoading(true);
    setError(null);

    try {
      const res = await orgFetch(`/api/runtime/${effectiveAppIdentifier}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 404) {
          throw new Error('Application not found. Please verify the application link.');
        } else if (res.status === 403) {
          throw new Error(errJson.error || 'Access denied. You do not have permission to view this application.');
        } else {
          throw new Error(errJson.error || 'Failed to load application runtime.');
        }
      }

      const data = await res.json();
      setAppData(data);
    } catch (err) {
      console.error('App runtime load error:', err);
      setError(err.message || 'Error connecting to application service.');
    } finally {
      setLoading(false);
    }
  }, [effectiveAppIdentifier]);

  useEffect(() => {
    fetchAppRuntime();
  }, [fetchAppRuntime]);

  // Determine current active page
  const pages = appData?.pages || [];
  const homePage = pages.find(p => p.is_home) || pages[0] || null;
  const activePage = effectivePageSlug
    ? (pages.find(p => p.slug === effectivePageSlug || p.slug.toLowerCase() === effectivePageSlug.toLowerCase()) 
       || (effectivePageSlug.includes('student') ? pages.find(p => p.slug.includes('student') || p.name.toLowerCase().includes('student')) : null)
       || null)
    : (pages.find(p => p.slug.includes('student')) || homePage || null);
  const activePageSlug = activePage?.slug || effectivePageSlug || '';

  // Fetch runtime table data for pages bound to tables (e.g. students)
  const fetchTableRecords = useCallback(async () => {
    if (!appData?.application?.id) return;
    
    // Check if active page is related to students or contains a table component
    const hasStudentTable = !activePage || (
      activePage.slug.includes('student') || 
      activePage.name.toLowerCase().includes('student') ||
      activePage.components?.some(c => c.type === 'table' && (c.tableConfig?.tableName === 'students' || !c.tableConfig?.tableName))
    );

    if (hasStudentTable) {
      setTableLoading(true);
      try {
        const res = await orgFetch('/api/students', {
          headers: {
            'X-App-Id': String(appData.application.id)
          }
        });
        if (res.ok) {
          const records = await res.json();
          setTableData(records);
        } else {
          // Fallback to runtime scoped endpoint
          const res2 = await orgFetch(`/api/runtime/${appData.application.id}/data/students`);
          if (res2.ok) {
            const records2 = await res2.json();
            setTableData(records2);
          }
        }
      } catch (err) {
        console.error('Fetch table records error:', err);
      } finally {
        setTableLoading(false);
      }
    }
  }, [appData?.application?.id, activePage]);

  useEffect(() => {
    if (appData?.application?.id) {
      fetchTableRecords();
    }
  }, [appData?.application?.id, activePage, fetchTableRecords]);

  // Create Record (POST)
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Student name is required', 'error');
      return;
    }

    setFormSaving(true);
    try {
      const res = await orgFetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': String(appData.application.id)
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create student');
      }

      const created = await res.json();
      setTableData(prev => [created, ...prev]);
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', course: 'Computer Science', status: 'Active' });
      showToast(`Student "${created.name}" created successfully!`);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setFormSaving(false);
    }
  };

  // Edit Record (PUT)
  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!currentEditRecord?.id) return;

    setFormSaving(true);
    try {
      const res = await orgFetch(`/api/students/${currentEditRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': String(appData.application.id)
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update student');
      }

      const updated = await res.json();
      setTableData(prev => prev.map(item => item.id === updated.id ? updated : item));
      setShowEditModal(false);
      setCurrentEditRecord(null);
      showToast(`Student "${updated.name}" updated successfully!`);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Record (DELETE)
  const handleDeleteRecord = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await orgFetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: {
          'X-App-Id': String(appData.application.id)
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete student');
      }

      setTableData(prev => prev.filter(item => item.id !== id));
      showToast(`Student "${name}" deleted.`);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-500 text-white gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm font-medium">Launching Application Runtime...</p>
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-500 text-white p-6">
        <div className="max-w-md w-full bg-dark-300 border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Application Error</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{error || 'Could not load application'}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
            <Button variant="primary" onClick={fetchAppRuntime} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { application, navigation, modules = [] } = appData;
  const brandName = navigation?.settings?.brandName || application.name;
  
  const basePath = directRouteSlug
    ? '/students'
    : (isPreview ? `/preview/${effectiveAppIdentifier}` : `/app/${effectiveAppIdentifier}`);

  // Filtered table rows
  const filteredData = tableData.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.course?.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-dark-500 text-white flex flex-col font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm animate-in fade-in slide-in-from-bottom-3 ${
          toastMessage.type === 'error'
            ? 'bg-red-950/90 border-red-500/40 text-red-200'
            : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isPreview && (
        <div className="bg-primary-950/90 border-b border-primary-500/20 px-6 py-2.5 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Preview Mode
            </span>
            <span className="text-xs text-gray-400">
              — Live draft runtime execution ({application.name})
            </span>
          </div>
          <div className="flex items-center gap-3">
            {onExitPreview ? (
              <button
                type="button"
                onClick={onExitPreview}
                className="text-xs text-primary-300 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Exit Preview
              </button>
            ) : (
              user?.role && ['designer', 'lead_designer', 'org_admin'].includes(user.role) && (
                <Link
                  to={`/${user.role === 'org_admin' ? 'org-admin' : user.role === 'lead_designer' ? 'lead-designer' : 'designer'}/dashboard/apps/${application.id}/builder`}
                  className="text-xs text-primary-300 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Designer
                </Link>
              )
            )}
            <button
              type="button"
              onClick={() => window.open(`/preview/${application.id}/${activePage?.slug || ''}`, '_blank')}
              className="text-xs text-emerald-300 hover:text-white px-3 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors flex items-center gap-1.5"
              title="Open standalone preview window"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Standalone Window
            </button>
          </div>
        </div>
      )}

      {/* Main Application Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Application Navigation Sidebar */}
        <aside className="w-64 bg-dark-300 border-r border-white/10 flex flex-col shrink-0">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-lg font-bold text-white tracking-tight truncate" title={brandName}>
              {brandName}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {application.organization_name || 'Application Portal'}
            </p>
          </div>

          <nav className="p-3 space-y-4 flex-1 overflow-y-auto">
            {/* Configured Modules Section */}
            {modules.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1 flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-primary-400" />
                  Configured Modules
                </div>
                {modules.map((m) => (
                  <div
                    key={m.module_id}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-gray-300 bg-white/[0.03] border border-white/5 flex items-center justify-between"
                  >
                    <span className="truncate">{m.name || m.module_id}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Configured Pages Section */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                Application Pages
              </div>

              {pages.map((p) => {
                const isActive = p.slug === activePageSlug;
                return (
                  <button
                    key={p.id || p.slug}
                    type="button"
                    onClick={() => {
                      if (directRouteSlug) {
                        navigate(p.slug.includes('student') ? '/students/list' : `/app/${effectiveAppIdentifier}/${p.slug}`);
                      } else {
                        navigate(`${basePath}/${p.slug}`);
                      }
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30 shadow-sm font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {p.slug.includes('dashboard') ? (
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                      ) : p.slug.includes('student') || p.slug.includes('user') ? (
                        <Users className="h-4 w-4 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{p.name}</span>
                    </div>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-white/10 text-center">
            <span className="text-[11px] text-gray-400">
              Powered by Entera AI Runtime
            </span>
          </div>
        </aside>

        {/* Application Page Viewport */}
        <main className="flex-1 overflow-y-auto bg-dark-400/30 p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* If Page Not Found */}
            {!activePage ? (
              <div className="py-20 text-center border border-white/10 rounded-2xl bg-dark-200/50 p-8 space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-white">404 — Page Not Found</h2>
                <p className="text-sm text-gray-400">
                  The requested route &ldquo;/{effectivePageSlug}&rdquo; does not exist in this application.
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (directRouteSlug) {
                        navigate('/students/list');
                      } else {
                        navigate(`${basePath}/${homePage?.slug || ''}`);
                      }
                    }}
                    className="gap-2"
                  >
                    <Home className="h-4 w-4" /> Return to Home
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Active Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-white/10 gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      {activePage.title || activePage.name}
                    </h1>
                    {activePage.description && (
                      <p className="text-sm text-gray-400 mt-1">{activePage.description}</p>
                    )}
                  </div>

                  {/* Actions for database-driven pages */}
                  {(activePage.slug.includes('student') || activePage.name.toLowerCase().includes('student')) && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        onClick={() => {
                          setFormData({ name: '', email: '', phone: '', course: 'Computer Science', status: 'Active' });
                          setShowAddModal(true);
                        }}
                        className="gap-2 shadow-lg"
                      >
                        <Plus className="h-4 w-4" /> Add Student
                      </Button>
                    </div>
                  )}
                </div>

                {/* Database-Driven Table Section (Students Table) */}
                {(activePage.slug.includes('student') || activePage.name.toLowerCase().includes('student')) && (
                  <div className="bg-dark-200/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary-400" />
                        <h2 className="text-base font-bold text-white">Students Directory (PostgreSQL)</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
                          {filteredData.length} records
                        </span>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search students..."
                          className="w-full h-9 pl-9 pr-3 rounded-lg border border-white/15 bg-dark-100 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="p-3.5 font-semibold text-gray-300 uppercase tracking-wider text-[11px]">ID</th>
                            <th className="p-3.5 font-semibold text-gray-300 uppercase tracking-wider text-[11px]">Name</th>
                            <th className="p-3.5 font-semibold text-gray-300 uppercase tracking-wider text-[11px]">Email</th>
                            <th className="p-3.5 font-semibold text-gray-300 uppercase tracking-wider text-[11px]">Phone</th>
                            <th className="p-3.5 font-semibold text-gray-300 uppercase tracking-wider text-[11px]">Course</th>
                            <th className="p-3.5 font-semibold text-gray-300 uppercase tracking-wider text-[11px]">Status</th>
                            <th className="p-3.5 font-semibold text-gray-300 uppercase tracking-wider text-[11px] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {tableLoading ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-gray-400">
                                <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2" />
                                <span>Loading records from PostgreSQL database...</span>
                              </td>
                            </tr>
                          ) : filteredData.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-gray-400">
                                <Users className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                                <p className="font-medium text-gray-300">No student records found</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Click &ldquo;Add Student&rdquo; to insert a real record into PostgreSQL.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredData.map((item) => (
                              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-3.5 font-mono text-gray-400">{item.id}</td>
                                <td className="p-3.5 font-semibold text-white">{item.name}</td>
                                <td className="p-3.5 text-gray-300">{item.email || '—'}</td>
                                <td className="p-3.5 font-mono text-gray-300">{item.phone || '—'}</td>
                                <td className="p-3.5 text-primary-300 font-medium">{item.course || '—'}</td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                                    item.status?.toLowerCase() === 'active'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                  }`}>
                                    {item.status || 'Active'}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentEditRecord(item);
                                      setFormData({
                                        name: item.name || '',
                                        email: item.email || '',
                                        phone: item.phone || '',
                                        course: item.course || 'Computer Science',
                                        status: item.status || 'Active'
                                      });
                                      setShowEditModal(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                                    title="Edit student"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRecord(item.id, item.name)}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                    title="Delete student"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Render any configured components on page */}
                {activePage.components && activePage.components.length > 0 && (
                  <div className="grid grid-cols-12 gap-5 pt-4">
                    {activePage.components.map((comp) => (
                      <div key={comp.id} className="col-span-12">
                        {renderRuntimeComponent(comp, tableData, () => setShowAddModal(true))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-dark-200 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary-400" />
                Add Student
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="rahul@example.com"
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="9876543210"
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Course</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="Computer Science"
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={formSaving}>
                  {formSaving ? 'Saving...' : 'Save Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-dark-200 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary-400" />
                Edit Student #{currentEditRecord?.id}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Course</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-white/15 bg-dark-100 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={formSaving}>
                  {formSaving ? 'Updating...' : 'Update Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function renderRuntimeComponent(comp, tableData = [], onAddStudent) {
  switch (comp.type) {
    case 'heading':
      if (comp.level === 'h1') return <h1 className="text-2xl font-bold text-white">{comp.text}</h1>;
      if (comp.level === 'h3') return <h3 className="text-lg font-bold text-white">{comp.text}</h3>;
      return <h2 className="text-xl font-bold text-white">{comp.text}</h2>;
    case 'text':
      return <p className="text-sm text-gray-300 leading-relaxed">{comp.text}</p>;
    case 'card':
      return (
        <div className="p-5 rounded-2xl border border-white/10 bg-dark-200/50 space-y-1.5">
          <h3 className="text-base font-bold text-white">{comp.label}</h3>
          {comp.subtitle && <p className="text-xs text-gray-400">{comp.subtitle}</p>}
        </div>
      );
    case 'metric':
      return (
        <div className="p-5 rounded-2xl border border-white/10 bg-dark-200/50 space-y-1">
          <p className="text-xs font-medium text-gray-400">{comp.label}</p>
          <p className="text-2xl font-bold text-white tracking-tight">{comp.value || '0'}</p>
          {comp.subtitle && <p className="text-xs text-emerald-400">{comp.subtitle}</p>}
        </div>
      );
    case 'button':
      return (
        <div className="pt-2">
          <Button
            type="button"
            variant={comp.styling?.variant || 'primary'}
            size={comp.styling?.size || 'default'}
            onClick={() => {
              if (comp.buttonConfig?.actionType === 'add' || comp.name?.includes('add') || comp.label?.includes('Add')) {
                if (onAddStudent) onAddStudent();
              }
            }}
          >
            {comp.label || 'Action'}
          </Button>
        </div>
      );
    default:
      return null;
  }
}
