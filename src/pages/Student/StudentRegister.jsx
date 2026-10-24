import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  User,
  Hash,
  Calendar,
  BookOpen,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { buildApiUrl, apiFetch } from '../../utils/api';

export function StudentRegister() {
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    apiFetch('/api/public/organizations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrganizations(data);
          // If organizations exist, preselect the first or default
          if (data.length > 0) {
            setFormData(prev => ({
              ...prev,
              organizationId: prev.organizationId || String(data[0].id),
              organizationCode: prev.organizationCode || data[0].org_code || ''
            }));
          }
        }
      })
      .catch((err) => console.warn('Could not fetch organizations for student register:', err));
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    organizationId: '',
    organizationCode: '',
    fullName: '',
    admissionNumber: '',
    dob: '',
    classGrade: '',
    section: '',
    email: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultState, setResultState] = useState(null); // { verified: boolean, message: string }

  // Validation errors
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Password rules validation
  const passwordChecks = {
    minLen: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const validate = () => {
    const errs = {};
    if (!formData.organizationId && !formData.organizationCode) {
      errs.organization = 'Please select your School / Organization.';
    }

    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required.';
    else if (formData.fullName.trim().length < 2) errs.fullName = 'Full Name must be at least 2 characters.';

    if (!formData.admissionNumber.trim()) errs.admissionNumber = 'Admission Number is required.';

    if (!formData.dob) {
      errs.dob = 'Date of Birth is required for verification.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dob)) {
      errs.dob = 'Please enter a valid date in YYYY-MM-DD format.';
    }

    if (!formData.classGrade.trim()) errs.classGrade = 'Class or Grade is required.';

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (!isPasswordValid) {
      errs.password = 'Password does not meet all security requirements.';
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
    if (touched[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({
      organization: true,
      fullName: true,
      admissionNumber: true,
      dob: true,
      classGrade: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          setErrorMsg('The cloud server is currently waking up from sleep. Please wait a few seconds and try again.');
          return;
        }
        setErrorMsg(data.error || 'Failed to complete registration. Please check your information.');
        return;
      }

      setResultState({
        verified: data.verified,
        message: data.message,
      });
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg('Network error. Unable to contact registration service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="h-11 w-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Entera<span className="text-primary-500">.ai</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            Student & Parent Registration Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Create Your Student Account
          </h1>
          <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
            Link your official school academic record using your Admission Number and Date of Birth.
          </p>
        </div>

        {/* Verification Success View */}
        {resultState ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-8 text-center border-primary-500/30">
              <div
                className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${
                  resultState.verified
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}
              >
                {resultState.verified ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <Clock className="h-8 w-8" />
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {resultState.verified ? 'Account Verified & Linked!' : 'Registration Submitted (Pending Verification)'}
              </h2>

              <p className="text-gray-300 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
                {resultState.message}
              </p>

              {resultState.verified ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-left text-xs text-gray-300 max-w-md mx-auto mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Admission Number:</span>
                    <span className="font-semibold text-emerald-400">{formData.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Registered Email:</span>
                    <span className="font-medium text-white">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="font-semibold text-emerald-400">Active & Ready to Sign In</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-left text-xs text-gray-300 max-w-md mx-auto mb-6 space-y-2">
                  <p className="text-amber-300 font-medium">What happens next?</p>
                  <p className="text-gray-400 leading-relaxed">
                    School administrators verify admissions records to protect student privacy. You will receive access once your school administrator reviews and activates your account.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate('/student/login')}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-medium h-11 px-6 flex items-center justify-center gap-2"
                >
                  Go to Student Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResultState(null);
                    setFormData({
                      fullName: '',
                      admissionNumber: '',
                      dob: '',
                      classGrade: '',
                      section: '',
                      email: '',
                      phone: '',
                      parentName: '',
                      parentPhone: '',
                      password: '',
                      confirmPassword: '',
                    });
                  }}
                  className="border-white/10 text-gray-300 hover:bg-white/5 h-11"
                >
                  Register Another Student
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <Card className="p-6 sm:p-8">
            {/* Informational Verification Banner */}
            <div className="mb-6 p-4 rounded-xl bg-primary-950/30 border border-primary-500/30 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 space-y-1">
                <p className="font-semibold text-white">Record Verification Policy</p>
                <p className="text-gray-400 leading-relaxed">
                  To protect student records, your <strong>Admission Number</strong> and <strong>Date of Birth</strong> must match the school records. If details do not automatically verify, your registration will be safely submitted for administrator review.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3" role="alert">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Academic & Verification Section */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  1. Student Verification Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Organization / School Selector */}
                  <div className="md:col-span-2">
                    <Select
                      id="reg-organization"
                      name="organizationId"
                      label="School / Organization"
                      required
                      value={formData.organizationId}
                      onChange={(e) => {
                        const orgId = e.target.value;
                        const foundOrg = organizations.find(o => String(o.id) === String(orgId));
                        setFormData(prev => ({
                          ...prev,
                          organizationId: orgId,
                          organizationCode: foundOrg?.org_code || ''
                        }));
                      }}
                      error={touched.organization ? errors.organization : ''}
                      helperText={
                        formData.organizationCode
                          ? `Selected School Code: ${formData.organizationCode}`
                          : 'Select the school where the student record is registered'
                      }
                    >
                      <option value="">-- Select Your School / Organization --</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.org_code || `ORG-${org.id}`})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Input
                      id="reg-fullName"
                      name="fullName"
                      label="Full Student Name"
                      placeholder="e.g. Rahul Kumar"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={() => handleBlur('fullName')}
                      error={touched.fullName ? errors.fullName : ''}
                    />
                  </div>

                  <div>
                    <Input
                      id="reg-admissionNumber"
                      name="admissionNumber"
                      label="Admission Number"
                      placeholder="e.g. ADM-0114"
                      required
                      value={formData.admissionNumber}
                      onChange={handleChange}
                      onBlur={() => handleBlur('admissionNumber')}
                      error={touched.admissionNumber ? errors.admissionNumber : ''}
                      helperText="From your school ID card or receipt"
                    />
                  </div>

                  <div>
                    <Input
                      id="reg-dob"
                      name="dob"
                      type="date"
                      label="Date of Birth (DOB)"
                      required
                      value={formData.dob}
                      onChange={handleChange}
                      onBlur={() => handleBlur('dob')}
                      error={touched.dob ? errors.dob : ''}
                      helperText="Used as trusted identifier verification"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      id="reg-classGrade"
                      name="classGrade"
                      label="Class / Grade"
                      placeholder="e.g. Grade 10"
                      required
                      value={formData.classGrade}
                      onChange={handleChange}
                      onBlur={() => handleBlur('classGrade')}
                      error={touched.classGrade ? errors.classGrade : ''}
                    />
                    <Input
                      id="reg-section"
                      name="section"
                      label="Section"
                      placeholder="e.g. A"
                      value={formData.section}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  2. Account & Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      label="Email Address"
                      placeholder="student@school.edu"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur('email')}
                      error={touched.email ? errors.email : ''}
                      helperText="Used for login and notifications"
                    />
                  </div>

                  <div>
                    <Input
                      id="reg-phone"
                      name="phone"
                      type="tel"
                      label="Mobile Number (Optional)"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Input
                      id="reg-parentName"
                      name="parentName"
                      label="Parent / Guardian Name (Optional)"
                      placeholder="e.g. Anil Kumar"
                      value={formData.parentName}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Input
                      id="reg-parentPhone"
                      name="parentPhone"
                      type="tel"
                      label="Parent Phone (Optional)"
                      placeholder="9876500000"
                      value={formData.parentPhone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Security & Password */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  3. Security Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      label="Password"
                      placeholder="••••••••"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={() => handleBlur('password')}
                      error={touched.password ? errors.password : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      id="reg-confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      label="Confirm Password"
                      placeholder="••••••••"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={() => handleBlur('confirmPassword')}
                      error={touched.confirmPassword ? errors.confirmPassword : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/5 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <span className={`flex items-center gap-1.5 ${passwordChecks.minLen ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> 8+ Characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.upper ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Uppercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.lower ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Lowercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.number ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Number (0-9)
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordChecks.special ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Special character
                  </span>
                  <span className={`flex items-center gap-1.5 ${formData.confirmPassword && formData.password === formData.confirmPassword ? 'text-emerald-400' : 'text-gray-500'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold bg-primary-600 hover:bg-primary-500 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Verifying & Registering Student...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Navigation Links */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 border-t border-white/5">
                <Link to="/student/login" className="text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Already registered? Go to Student Login
                </Link>
                <Link to="/login" className="text-gray-400 hover:text-gray-300">
                  Are you a School Administrator? Entera Platform Login →
                </Link>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
