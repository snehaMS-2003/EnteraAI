import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  ArrowUpRight, 
  RefreshCw, 
  Plus, 
  FileSpreadsheet, 
  Search, 
  AlertCircle, 
  ChevronRight, 
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  School
} from 'lucide-react';
import { Button } from '../ui/Button';
import { orgFetch } from '../../hooks/useAuth';

export function StudentDashboardView({ appId = 5, onNavigatePage }) {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisWeek: 0
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await orgFetch('/api/students/stats', {
        headers: {
          'X-App-Id': String(appId)
        }
      });

      if (!res.ok) {
        // Fallback: query /api/students?paginated=true&limit=5
        const resFallback = await orgFetch('/api/students?paginated=true&limit=5&sort_by=created_at&sort_dir=desc', {
          headers: { 'X-App-Id': String(appId) }
        });
        if (!resFallback.ok) {
          throw new Error('Failed to load dashboard metrics from PostgreSQL');
        }
        const dataFallback = await resFallback.json();
        setStats({
          total: dataFallback.stats?.total || dataFallback.total || 0,
          active: dataFallback.stats?.active || 0,
          inactive: dataFallback.stats?.inactive || 0,
          newThisWeek: dataFallback.stats?.newThisWeek || 0
        });
        setRecentStudents(dataFallback.records || []);
        return;
      }

      const data = await res.json();
      setStats(data.metrics || { total: 0, active: 0, inactive: 0, newThisWeek: 0 });
      setRecentStudents(data.recentRegistrations || []);
    } catch (err) {
      console.error('Student dashboard fetch error:', err);
      setError(err.message || 'Error fetching live student metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const cards = [
    {
      id: 'total',
      label: 'Total Registered Students',
      value: stats.total,
      subtitle: 'Enrolled in database',
      icon: Users,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30'
    },
    {
      id: 'active',
      label: 'Active Students',
      value: stats.active,
      subtitle: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of total` : 'Currently active',
      icon: UserCheck,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'inactive',
      label: 'Inactive Students',
      value: stats.inactive,
      subtitle: stats.total > 0 ? `${Math.round((stats.inactive / stats.total) * 100)}% of total` : 'On leave / archived',
      icon: UserX,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30'
    },
    {
      id: 'new_this_week',
      label: 'New Registrations (This Week)',
      value: stats.newThisWeek,
      subtitle: 'Enrolled in last 7 days',
      icon: TrendingUp,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
            <School className="h-4 w-4" />
            <span>PostgreSQL Live Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Student Management Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Real-time enrollment statistics and recent registrations.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="gap-2 text-xs h-9 bg-dark-300/60 border-white/10 text-gray-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-primary-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigatePage && onNavigatePage('student-list')}
            className="gap-1.5 text-xs h-9 border-white/10 text-gray-300 hover:text-white"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Student Records</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigatePage && onNavigatePage('students-registration')}
            className="gap-1.5 text-xs h-9 bg-primary-600 hover:bg-primary-500"
          >
            <Plus className="h-4 w-4" />
            <span>Register Student</span>
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchDashboardData()} className="text-xs h-8">
            Retry
          </Button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              className="p-5 rounded-2xl border border-white/10 bg-dark-300/40 backdrop-blur-sm relative overflow-hidden transition-all duration-200 hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400">{c.label}</p>
                  {loading ? (
                    <div className="h-8 w-20 bg-white/10 rounded animate-pulse my-2" />
                  ) : (
                    <p className="text-3xl font-extrabold text-white tracking-tight mt-1.5 font-mono">
                      {c.value.toLocaleString()}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <span>{c.subtitle}</span>
                  </p>
                </div>

                <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Registrations Table Card */}
      <div className="rounded-2xl border border-white/10 bg-dark-300/40 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Recent Registrations</h2>
              <p className="text-xs text-gray-400">Live student admissions stored in PostgreSQL database.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigatePage && onNavigatePage('student-list')}
            className="flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
          >
            <span>View All in Student Records</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Table / Empty State / Loading State */}
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentStudents.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 text-gray-400 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-white">No students registered yet</h3>
              <p className="text-xs text-gray-400 mt-1">
                Begin enrolling students or import records via Excel to see live metrics and recent registrations.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigatePage && onNavigatePage('students-registration')}
              className="gap-2 text-xs"
            >
              <Plus className="h-4 w-4" /> Register First Student
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class / Grade</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 font-mono font-medium text-primary-300">
                      {st.admission_number || `STU-${String(st.id).padStart(4, '0')}`}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {st.name}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {st.class_grade || 'General'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 truncate max-w-[200px]">
                      {st.email || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono">
                      {st.registration_date || st.admission_date || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        (st.status || 'Active').toLowerCase() === 'active'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        {st.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigatePage && onNavigatePage('student-list')}
                        className="text-xs text-gray-400 group-hover:text-primary-400 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
