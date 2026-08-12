import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FolderKanban, Filter, Eye, Pencil, Archive,
  AlertTriangle, X, ChevronDown, RefreshCw, Calendar, User,
  Layers, Tag, Server,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:    { label: 'Draft',    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  building: { label: 'Building', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  ready:    { label: 'Ready',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  deployed: { label: 'Deployed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  archived: { label: 'Archived', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
      {meta.label}
    </span>
  );
}

// ─── Confirmation dialog ─────────────────────────────────────────────────────
function ConfirmDialog({ app, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative glass-card p-6 max-w-md w-full z-10"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Archive Application?</h3>
            <p className="text-gray-400 text-sm">
              Are you sure you want to archive{' '}
              <span className="text-white font-medium">{app.app_name}</span>?
              The application will be hidden but its data will be preserved.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-500 border-orange-500/50 shadow-none"
            onClick={onConfirm}
          >
            Archive
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Format date ─────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Industry display ────────────────────────────────────────────────────────
function cap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Main component ───────────────────────────────────────────────────────────
export function OrgApplications() {
  const navigate = useNavigate();
  const user = useAuth();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  // archive dialog
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // ── Redirect if not authenticated ──────────────────────────────────────────
  useEffect(() => {
    if (!user || !user.organizationId) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ── Fetch applications ─────────────────────────────────────────────────────
  const fetchApps = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search)        params.set('search', search);
      if (statusFilter !== 'all')   params.set('status', statusFilter);
      if (industryFilter !== 'all') params.set('industry', industryFilter);

      const res = await orgFetch(`/api/org/applications?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load applications');
      }
      const data = await res.json();
      setApps(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, search, statusFilter, industryFilter]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // ── Archive handler ────────────────────────────────────────────────────────
  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const res = await orgFetch(`/api/org/applications/${archiveTarget.id}/archive`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to archive application');
      }
      setArchiveTarget(null);
      fetchApps();
    } catch (err) {
      setError(err.message);
    } finally {
      setArchiving(false);
    }
  };

  // ── Derived unique industries for filter ───────────────────────────────────
  const industries = ['all', ...new Set(apps.map(a => a.industry).filter(Boolean))];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary-400" />
            Applications
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Manage and configure your organization's applications.
          </p>
        </div>
        <Button
          className="gap-2 self-start sm:self-auto"
          onClick={() => navigate('/dashboard/org-admin/apps/create')}
        >
          <Plus className="h-4 w-4" />
          Create Application
        </Button>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button className="ml-auto" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            className="pl-10"
            placeholder="Search applications..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="glass-input pl-9 pr-8 h-10 text-sm appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Industry filter */}
        <div className="relative">
          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <select
            value={industryFilter}
            onChange={e => setIndustryFilter(e.target.value)}
            className="glass-input pl-9 pr-8 h-10 text-sm appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="all">All Industries</option>
            {industries.filter(i => i !== 'all').map(i => (
              <option key={i} value={i}>{cap(i)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Refresh */}
        <Button
          variant="secondary"
          size="icon"
          onClick={fetchApps}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* ── Applications content ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-400" />
            <p className="text-sm">Loading applications…</p>
          </div>
        </div>
      ) : apps.length === 0 ? (
        /* ── Empty state ── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-2xl bg-primary-500/10 text-primary-400 mb-4">
              <FolderKanban className="h-12 w-12" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No applications yet</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              {search || statusFilter !== 'all' || industryFilter !== 'all'
                ? 'No applications match your current filters. Try adjusting your search or filters.'
                : 'Create your first enterprise application to get started.'}
            </p>
            {!search && statusFilter === 'all' && industryFilter === 'all' && (
              <Button
                className="gap-2"
                onClick={() => navigate('/dashboard/org-admin/apps/create')}
              >
                <Plus className="h-4 w-4" />
                Create Application
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        /* ── Applications table ── */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Application</th>
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Industry</th>
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Template</th>
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Created By</th>
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Updated</th>
                    <th className="px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {apps.map((app, idx) => (
                      <motion.tr
                        key={app.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                      >
                        {/* Name + description */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 shrink-0">
                              <Server className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{app.app_name}</p>
                              {app.app_description && (
                                <p className="text-gray-500 text-xs mt-0.5 line-clamp-1 max-w-[200px]">
                                  {app.app_description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Industry */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <Layers className="h-3.5 w-3.5 text-gray-500" />
                            {cap(app.industry)}
                          </div>
                        </td>

                        {/* Template */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Tag className="h-3.5 w-3.5 text-gray-500" />
                            {app.industry_template || '—'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge status={app.status} />
                        </td>

                        {/* Created by */}
                        <td className="px-5 py-4 hidden xl:table-cell">
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <User className="h-3.5 w-3.5 text-gray-500" />
                            <span className="truncate max-w-[120px]">{app.created_by || '—'}</span>
                          </div>
                        </td>

                        {/* Created date */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            {fmt(app.created_at)}
                          </div>
                        </td>

                        {/* Updated date */}
                        <td className="px-5 py-4 hidden xl:table-cell">
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            {fmt(app.updated_at)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              title="View"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                              onClick={() => navigate(`/dashboard/org-admin/apps/${app.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                              onClick={() => navigate(`/dashboard/org-admin/apps/${app.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Archive"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                              onClick={() => setArchiveTarget(app)}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Row count footer */}
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
              <span>{apps.length} application{apps.length !== 1 ? 's' : ''}</span>
              <span>Org ID: {user?.organizationId}</span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Archive confirmation dialog ──────────────────────────────────── */}
      <AnimatePresence>
        {archiveTarget && (
          <ConfirmDialog
            app={archiveTarget}
            onConfirm={handleArchive}
            onCancel={() => setArchiveTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
