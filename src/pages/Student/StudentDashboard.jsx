import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  User,
  BookOpen,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  LogOut,
  Edit3,
  X,
  Loader2,
  Save,
  AlertCircle,
  Building,
  Hash,
  Users
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    phone: '',
    address: '',
    parentPhone: '',
  });
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Active Tab: 'academic' | 'contact' | 'guardian'
  const [activeTab, setActiveTab] = useState('academic');

  // Guard: If not logged in or not student, redirect
  useEffect(() => {
    if (!user) {
      navigate('/student/login');
      return;
    }
    if (user.role !== 'student' && !user.student_id && !user.studentId) {
      // Non-student user navigating to student portal
      navigate('/access-denied');
      return;
    }
  }, [user, navigate]);

  // Fetch student profile strictly through Zero-IDOR /api/student/me
  const fetchStudentProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orgFetch('/api/student/me');
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        setEditFormData({
          phone: data.student.phone || '',
          address: data.student.address || '',
          parentPhone: data.student.parent_phone || '',
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to retrieve student profile.');
      }
    } catch (err) {
      console.error('Failed to fetch student profile:', err);
      setError('Network error loading student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStudentProfile();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await orgFetch('/api/student/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStudent(data.student);
        setShowEditModal(false);
        setToastMessage({ type: 'success', text: 'Contact details updated successfully!' });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({ type: 'error', text: data.error || 'Failed to update contact details.' });
      }
    } catch (err) {
      console.error('Update contact error:', err);
      setToastMessage({ type: 'error', text: 'Error saving profile updates.' });
    } finally {
      setSaving(false);
    }
  };

  const isVerified = student?.account_status === 'active' || user?.accountStatus === 'active';

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-white/10 glass sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight">Entera<span className="text-primary-500">.ai</span></span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-500/20 text-primary-300 uppercase tracking-wider border border-primary-500/30">
                Student Portal
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">{student?.name || user?.name}</span>
            <span className="text-[11px] text-gray-400 font-mono">{student?.admission_number || user?.admissionNumber || 'Student'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5"
          >
            <LogOut className="h-4 w-4 text-red-400" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-xl flex items-center justify-between shadow-xl border ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-4 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-sm">Loading your student records securely...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center border-red-500/30 bg-red-950/10">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Unable to Load Records</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">{error}</p>
            <Button onClick={fetchStudentProfile} className="bg-primary-600 hover:bg-primary-500">
              Try Again
            </Button>
          </Card>
        ) : (
          <>
            {/* Student Profile Hero Banner */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="relative rounded-2xl glass border border-white/10 p-6 sm:p-8 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5">
                    {/* Student Avatar */}
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/20 shrink-0 border border-white/20">
                      {student?.name
                        ? student.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'ST'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                          {student?.name || user?.name}
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {student?.status || 'Active'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5 text-primary-400" />
                          Adm: <strong className="text-white">{student?.admission_number || '—'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-primary-400" />
                          Class: <strong className="text-white">{student?.class_grade || 'Unassigned'}</strong>
                        </span>
                        {student?.section && (
                          <span className="flex items-center gap-1">
                            Section: <strong className="text-white">{student.section}</strong>
                          </span>
                        )}
                      </div>

                      {/* Verification Status Pill */}
                      <div className="pt-1">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <ShieldCheck className="h-4 w-4" /> Official Verified Academic Account
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <Clock className="h-4 w-4" /> Pending School Admin Verification
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setShowEditModal(true)}
                      className="bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-2 h-10 px-4 text-sm font-semibold shadow-md shadow-primary-500/20"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Update Contact Info</span>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 border-white/5">
                <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Admission Number</span>
                <span className="text-base sm:text-lg font-bold text-primary-400 font-mono">
                  {student?.admission_number || '—'}
                </span>
              </Card>

              <Card className="p-4 border-white/5">
                <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Class & Section</span>
                <span className="text-base sm:text-lg font-bold text-white">
                  {student?.class_grade || '—'} {student?.section ? `(${student.section})` : ''}
                </span>
              </Card>

              <Card className="p-4 border-white/5">
                <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Roll Number</span>
                <span className="text-base sm:text-lg font-bold text-white font-mono">
                  {student?.roll_number ? `#${student.roll_number}` : '—'}
                </span>
              </Card>

              <Card className="p-4 border-white/5">
                <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Verification</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Verified
                </span>
              </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setActiveTab('academic')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'academic'
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Academic Details
              </button>

              <button
                onClick={() => setActiveTab('contact')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'contact'
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="h-4 w-4" />
                Student Profile & Contact
              </button>

              <button
                onClick={() => setActiveTab('guardian')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'guardian'
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="h-4 w-4" />
                Guardian Details
              </button>
            </div>

            {/* Tab 1: Academic Details */}
            {activeTab === 'academic' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary-400" />
                    Official Academic Enrollment Record
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Class / Grade</span>
                      <span className="font-semibold text-white">{student?.class_grade || '—'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Section</span>
                      <span className="font-semibold text-white">{student?.section || '—'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Roll Number</span>
                      <span className="font-semibold text-white font-mono">{student?.roll_number || '—'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Admission Date</span>
                      <span className="font-semibold text-white">{student?.admission_date || '—'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Academic Status</span>
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {student?.status || 'Active'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">School ID / App Scoped</span>
                      <span className="font-semibold text-gray-300">Entera Academy (App #{student?.application_id || 5})</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Tab 2: Student Profile & Contact */}
            {activeTab === 'contact' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-400" />
                      Student Information & Contact
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
                      className="border-white/10 text-primary-400 hover:bg-white/5 text-xs flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Contact Details
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Full Student Name</span>
                      <span className="font-semibold text-white">{student?.name || '—'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Gender</span>
                      <span className="font-semibold text-white">{student?.gender || '—'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Date of Birth</span>
                      <span className="font-semibold text-white">{student?.dob || '—'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Registered Email</span>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {student?.email || user?.email || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Mobile Phone</span>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {student?.phone || 'Not provided'}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-xs text-gray-400 block mb-1">Residential Address</span>
                      <span className="font-semibold text-white flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                        {student?.address || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Tab 3: Guardian Details */}
            {activeTab === 'guardian' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary-400" />
                      Parent & Guardian Contact Information
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
                      className="border-white/10 text-primary-400 hover:bg-white/5 text-xs flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Guardian Contact
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Parent / Guardian Full Name</span>
                      <span className="font-semibold text-white">{student?.parent_name || 'Not provided'}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Parent Contact Phone</span>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {student?.parent_phone || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Self-Service Contact Update Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary-400" />
                  Update Contact Information
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-4">
                <div className="p-3 rounded-lg bg-white/5 text-xs text-gray-400">
                  <p className="font-medium text-gray-300 mb-0.5">Note on Profile Edits:</p>
                  Academic fields (Admission Number, Class, Section, DOB) are verified official records maintained by the school administration and cannot be modified self-service.
                </div>

                <Input
                  id="edit-phone"
                  label="Student Mobile Phone"
                  placeholder="9876543210"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />

                <Input
                  id="edit-parentPhone"
                  label="Parent / Guardian Contact Phone"
                  placeholder="9876500000"
                  value={editFormData.parentPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                />

                <div className="w-full">
                  <label htmlFor="edit-address" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Residential Address
                  </label>
                  <textarea
                    id="edit-address"
                    rows={3}
                    className="glass-input w-full p-3 text-sm rounded-lg"
                    placeholder="Enter current residential address..."
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="border-white/10 text-gray-300 hover:bg-white/5 h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-primary-600 hover:bg-primary-500 text-white h-10 px-5 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
