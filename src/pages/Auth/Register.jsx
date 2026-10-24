import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, Building, Mail, User, Phone, MapPin, 
  Lock, Briefcase, Globe, Eye, EyeOff, Check, X, Loader2 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Country, State, City } from 'country-state-city';
import { districtsByState } from '../../data/districts';
import { citiesByDistrict } from '../../data/citiesByDistrict';
import { buildApiUrl, apiFetch } from '../../utils/api';

export function Register() {
  const [registered, setRegistered] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Values State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    adminName: '',
    phone: '',
    industry: '',
    industrySpecific: '',
    website: '',
    address: '',
    county: '',
    state: '',
    district: '',
    city: '',
    pincode: '',
    password: '',
    confirmPassword: ''
  });

  // Validation & Touched State
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Field Refs for auto-focusing the first invalid field
  const refs = {
    name: useRef(null),
    email: useRef(null),
    adminName: useRef(null),
    phone: useRef(null),
    industry: useRef(null),
    industrySpecific: useRef(null),
    website: useRef(null),
    address: useRef(null),
    county: useRef(null),
    state: useRef(null),
    district: useRef(null),
    city: useRef(null),
    pincode: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null)
  };

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;

  // Password rules evaluation
  const password = formData.password || '';
  const passwordRules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  const satisfiedRulesCount = Object.values(passwordRules).filter(Boolean).length;
  const isPasswordValid = satisfiedRulesCount === 5;

  const validateField = (field, value, allData = formData) => {
    switch (field) {
      case 'name': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Organization name is required.';
        if (trimmed.length < 2 || trimmed.length > 100) {
          return 'Organization name must contain between 2 and 100 characters.';
        }
        return '';
      }
      case 'email': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Email address is required.';
        if (!emailRegex.test(trimmed)) {
          return 'Please enter a valid email address.';
        }
        return '';
      }
      case 'adminName': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Full name is required.';
        if (trimmed.length < 2 || trimmed.length > 100) {
          return 'Full name must contain between 2 and 100 characters.';
        }
        return '';
      }
      case 'phone': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Phone number is required.';
        const digits = trimmed.replace(/[\s\-\(\)\+]/g, '');
        if (digits.length < 7 || digits.length > 15) {
          return 'Please enter a valid phone number.';
        }
        return '';
      }
      case 'industry': {
        if (!value) return 'Please select an industry.';
        return '';
      }
      case 'industrySpecific': {
        if (allData.industry === 'other') {
          const trimmed = (value || '').trim();
          if (!trimmed || trimmed.length < 2) {
            return 'Please specify your industry (at least 2 characters).';
          }
        }
        return '';
      }
      case 'website': {
        const trimmed = (value || '').trim();
        if (trimmed && !urlRegex.test(trimmed)) {
          return 'Please enter a valid website URL.';
        }
        return '';
      }
      case 'address': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Organization address is required.';
        if (trimmed.length < 3) return 'Address must be at least 3 characters.';
        return '';
      }
      case 'county': {
        if (!value) return 'Please select a country.';
        return '';
      }
      case 'state': {
        if (!value) return 'Please select a state.';
        return '';
      }
      case 'district': {
        if (!value) return 'Please select a district.';
        return '';
      }
      case 'city': {
        if (!value) return 'Please select or enter a city.';
        return '';
      }
      case 'pincode': {
        const trimmed = (value || '').trim();
        if (!trimmed) return 'Pincode is required.';
        if (trimmed.length < 3 || trimmed.length > 12) {
          return 'Please enter a valid pincode.';
        }
        return '';
      }
      case 'password': {
        if (!value) return 'Password is required.';
        if (!isPasswordValid) {
          return 'Password must meet all the required security rules.';
        }
        return '';
      }
      case 'confirmPassword': {
        if (!value) return 'Please confirm your password.';
        if (value !== allData.password) {
          return 'Passwords do not match.';
        }
        return '';
      }
      default:
        return '';
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, value, updated) }));
    }

    // Special case: if password changes, revalidate confirmPassword if already touched
    if (field === 'password' && touched.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: validateField('confirmPassword', formData.confirmPassword, updated)
      }));
    }
  };

  const validateAll = () => {
    const newErrors = {};
    const fields = [
      'name', 'email', 'adminName', 'phone', 'industry',
      ...(formData.industry === 'other' ? ['industrySpecific'] : []),
      'website', 'address', 'county', 'state', 'district', 'city', 'pincode',
      'password', 'confirmPassword'
    ];

    let firstInvalid = null;

    for (const f of fields) {
      const err = validateField(f, formData[f]);
      if (err) {
        newErrors[f] = err;
        if (!firstInvalid) firstInvalid = f;
      }
    }

    setErrors(newErrors);
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));

    return { isValid: Object.keys(newErrors).length === 0, firstInvalid };
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    setErrorMsg('');

    const { isValid, firstInvalid } = validateAll();
    if (!isValid) {
      if (firstInvalid && refs[firstInvalid]?.current) {
        refs[firstInvalid].current.focus();
      }
      return;
    }

    setLoading(true);

    // Prepare normalized payload (safe trim on all text fields except password)
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      adminName: formData.adminName.trim(),
      fullName: formData.adminName.trim(),
      phone: formData.phone.trim(),
      industry: formData.industry,
      industrySpecific: formData.industry === 'other' ? formData.industrySpecific.trim() : null,
      website: formData.website.trim() || null,
      address: formData.address.trim(),
      county: formData.county,
      state: formData.state,
      district: formData.district,
      city: formData.city,
      pincode: formData.pincode.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword
    };

    try {
      const response = await apiFetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setRegistered(true);
      } else {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          setErrorMsg('The cloud server is currently waking up from sleep. Please wait a few seconds and try again.');
          return;
        }
        const errorText = data.error || 'Registration failed. Please check your information.';
        setErrorMsg(errorText);

        // Highlight email specifically if it's already registered
        if (errorText.toLowerCase().includes('email') || errorText.toLowerCase().includes('already exists')) {
          setErrors(prev => ({ ...prev, email: errorText }));
          refs.email.current?.focus();
        }
      }
    } catch (error) {
      console.error('Registration request error:', error);
      setErrorMsg('Failed to connect to backend server. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  let isSysAdmin = false;
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.role === 'sys_admin') isSysAdmin = true;
  } catch {}

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            {isSysAdmin ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Organization Registered!</h2>
                <p className="text-gray-400 mb-8">Organization and administrator account have been created successfully in PostgreSQL.</p>
                <Link to="/admin/dashboard/orgs">
                  <Button className="w-full">Return to Organizations</Button>
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4">Registration Successful!</h2>
                <p className="text-gray-400 mb-8">Organization registered successfully. Please login with your administrator credentials to continue.</p>
                <Link to="/login">
                  <Button className="w-full">Proceed to Login</Button>
                </Link>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col items-center">
      {isSysAdmin && (
        <div className="w-full max-w-2xl mb-4 flex justify-start">
          <Link to="/admin/dashboard/orgs" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
            ← Back to Organizations
          </Link>
        </div>
      )}
      <div className="flex items-center gap-2 mb-8">
        <BrainCircuit className="h-8 w-8 text-primary-500" />
        <Link to="/" className="text-2xl font-bold text-white tracking-tight">
          Entera<span className="text-primary-500">.ai</span>
        </Link>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Register Organization</h2>
            <p className="text-gray-400 mt-2">Create a new organization to start building enterprise apps.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm flex items-center gap-2" role="alert">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <form onSubmit={handleRegister} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Organization Name */}
            <div className="relative">
              <Building className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input 
                ref={refs.name}
                id="reg-name"
                label="Organization Name" 
                name="name" 
                required 
                className="pl-10" 
                placeholder="Acme Corp"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                error={touched.name ? errors.name : ''}
              />
            </div>

            {/* Organization Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input 
                ref={refs.email}
                id="reg-email"
                label="Organization Email" 
                name="email" 
                type="email" 
                required 
                className="pl-10" 
                placeholder="admin@company.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                error={touched.email ? errors.email : ''}
              />
            </div>
            
            {/* Administrator Full Name */}
            <div className="relative">
              <User className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input 
                ref={refs.adminName}
                id="reg-adminName"
                label="Administrator Full Name" 
                name="adminName" 
                required 
                className="pl-10" 
                placeholder="Jane Doe"
                value={formData.adminName}
                onChange={(e) => handleChange('adminName', e.target.value)}
                onBlur={() => handleBlur('adminName')}
                error={touched.adminName ? errors.adminName : ''}
              />
            </div>

            {/* Phone Number */}
            <div className="relative">
              <Phone className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input 
                ref={refs.phone}
                id="reg-phone"
                label="Phone Number" 
                name="phone" 
                required 
                className="pl-10" 
                placeholder="+1 555-0199"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                error={touched.phone ? errors.phone : ''}
              />
            </div>
            
            {/* Industry */}
            <div className="relative md:col-span-2">
              <Briefcase className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10 pointer-events-none" />
              <Select 
                ref={refs.industry}
                id="reg-industry"
                label="Industry" 
                name="industry"
                required 
                className="pl-10"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                onBlur={() => handleBlur('industry')}
                error={touched.industry ? errors.industry : ''}
              >
                <option value="" className="bg-gray-900 text-white">Select Industry</option>
                <option value="technology" className="bg-gray-900 text-white">Technology</option>
                <option value="healthcare" className="bg-gray-900 text-white">Healthcare</option>
                <option value="finance" className="bg-gray-900 text-white">Finance</option>
                <option value="retail" className="bg-gray-900 text-white">Retail</option>
                <option value="manufacturing" className="bg-gray-900 text-white">Manufacturing</option>
                <option value="education" className="bg-gray-900 text-white">Education</option>
                <option value="other" className="bg-gray-900 text-white">Other</option>
              </Select>
            </div>
            
            {/* Specific Industry if Other */}
            {formData.industry === 'other' && (
              <div className="relative md:col-span-2">
                <Briefcase className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <Input 
                  ref={refs.industrySpecific}
                  id="reg-industrySpecific"
                  label="Specify Industry" 
                  name="industrySpecific" 
                  required 
                  className="pl-10" 
                  placeholder="Enter your industry" 
                  value={formData.industrySpecific}
                  onChange={(e) => handleChange('industrySpecific', e.target.value)}
                  onBlur={() => handleBlur('industrySpecific')}
                  error={touched.industrySpecific ? errors.industrySpecific : ''}
                />
              </div>
            )}
            
            {/* Website (Optional) */}
            <div className="relative md:col-span-2">
              <Globe className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input 
                ref={refs.website}
                id="reg-website"
                label="Website (Optional)" 
                name="website" 
                type="url" 
                className="pl-10" 
                placeholder="https://example.com" 
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                onBlur={() => handleBlur('website')}
                error={touched.website ? errors.website : ''}
              />
            </div>
            
            {/* Organization Address */}
            <div className="relative md:col-span-2">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input 
                ref={refs.address}
                id="reg-address"
                label="Organization Address" 
                name="address" 
                required 
                className="pl-10" 
                placeholder="123 Enterprise Blvd, Suite 400"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                onBlur={() => handleBlur('address')}
                error={touched.address ? errors.address : ''}
              />
            </div>
            
            {/* Country */}
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10 pointer-events-none" />
              <Select 
                ref={refs.county}
                id="reg-country"
                label="Country" 
                name="county"
                required 
                className="pl-10"
                value={formData.county}
                onChange={(e) => {
                  handleChange('county', e.target.value);
                  handleChange('state', '');
                  handleChange('district', '');
                  handleChange('city', '');
                }}
                onBlur={() => handleBlur('county')}
                error={touched.county ? errors.county : ''}
              >
                <option value="" className="bg-gray-900 text-white">Select Country</option>
                {Country.getAllCountries().map(c => (
                  <option key={c.isoCode} value={c.isoCode} className="bg-gray-900 text-white">
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            
            {/* State */}
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10 pointer-events-none" />
              <Select 
                ref={refs.state}
                id="reg-state"
                label="State" 
                name="state"
                required 
                className="pl-10"
                value={formData.state}
                onChange={(e) => {
                  handleChange('state', e.target.value);
                  handleChange('district', '');
                  handleChange('city', '');
                }}
                onBlur={() => handleBlur('state')}
                error={touched.state ? errors.state : ''}
                disabled={!formData.county}
              >
                <option value="" className="bg-gray-900 text-white">Select State</option>
                {formData.county && State.getStatesOfCountry(formData.county).map(s => (
                  <option key={s.isoCode} value={s.isoCode} className="bg-gray-900 text-white">
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            
            {/* District */}
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10 pointer-events-none" />
              <Select 
                ref={refs.district}
                id="reg-district"
                label="District" 
                name="district"
                required 
                className="pl-10"
                value={formData.district}
                onChange={(e) => {
                  handleChange('district', e.target.value);
                  handleChange('city', '');
                }}
                onBlur={() => handleBlur('district')}
                error={touched.district ? errors.district : ''}
                disabled={!formData.state}
              >
                <option value="" className="bg-gray-900 text-white">Select District</option>
                {formData.state && (districtsByState[formData.state] || []).map(d => (
                  <option key={d} value={d} className="bg-gray-900 text-white">{d}</option>
                ))}
                {/* Fallback option if no preset districts */}
                {formData.state && (!districtsByState[formData.state] || districtsByState[formData.state].length === 0) && (
                  <option value={formData.state} className="bg-gray-900 text-white">{formData.state} Central</option>
                )}
              </Select>
            </div>

            {/* City */}
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10 pointer-events-none" />
              <Select 
                ref={refs.city}
                id="reg-city"
                label="City" 
                name="city"
                required 
                className="pl-10"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                error={touched.city ? errors.city : ''}
                disabled={!formData.state}
              >
                <option value="" className="bg-gray-900 text-white">Select City</option>
                {formData.district && citiesByDistrict[formData.state]?.[formData.district]
                  ? citiesByDistrict[formData.state][formData.district].map(c => (
                      <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                    ))
                  : formData.state && City.getCitiesOfState(formData.county, formData.state).map(c => (
                      <option key={c.name} value={c.name} className="bg-gray-900 text-white">{c.name}</option>
                    ))
                }
                {/* Default fallback city if none listed */}
                {formData.district && (
                  <option value={formData.district} className="bg-gray-900 text-white">{formData.district} City</option>
                )}
              </Select>
            </div>

            {/* Pincode */}
            <div className="relative md:col-span-2">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
              <Input 
                ref={refs.pincode}
                id="reg-pincode"
                label="Pincode" 
                name="pincode" 
                required 
                className="pl-10" 
                placeholder="560001"
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                onBlur={() => handleBlur('pincode')}
                error={touched.pincode ? errors.pincode : ''}
              />
            </div>
            
            {/* Password */}
            <div className="relative md:col-span-2">
              <div className="relative">
                <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <Input 
                  ref={refs.password}
                  id="reg-password"
                  label="Password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="pl-10 pr-10" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  error={touched.password ? errors.password : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none z-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Meter & Live Security Rule Checklist */}
              <div className="mt-2.5 p-3 rounded-lg bg-black/30 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Password Security Requirements</span>
                  <span className={`font-semibold ${
                    satisfiedRulesCount <= 2 ? 'text-red-400' :
                    satisfiedRulesCount <= 4 ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {satisfiedRulesCount === 5 ? 'Strong' :
                     satisfiedRulesCount >= 3 ? 'Fair' : 'Weak'} ({satisfiedRulesCount}/5)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div 
                      key={lvl}
                      className={`h-full flex-1 transition-all duration-300 ${
                        lvl <= satisfiedRulesCount 
                          ? (satisfiedRulesCount === 5 ? 'bg-emerald-500' : satisfiedRulesCount >= 3 ? 'bg-yellow-500' : 'bg-red-500')
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                {/* Checklist rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs pt-1">
                  <div className={`flex items-center gap-1.5 ${passwordRules.minLength ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {passwordRules.minLength ? <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-500 ml-1 mr-1" />}
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRules.hasUpper ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {passwordRules.hasUpper ? <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-500 ml-1 mr-1" />}
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRules.hasLower ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {passwordRules.hasLower ? <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-500 ml-1 mr-1" />}
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRules.hasNumber ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {passwordRules.hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-500 ml-1 mr-1" />}
                    <span>At least one number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 sm:col-span-2 ${passwordRules.hasSpecial ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {passwordRules.hasSpecial ? <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-500 ml-1 mr-1" />}
                    <span>At least one special character (!@#$%^&* etc.)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="relative md:col-span-2">
              <div className="relative">
                <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <Input 
                  ref={refs.confirmPassword}
                  id="reg-confirmPassword"
                  label="Confirm Password" 
                  name="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  className="pl-10 pr-10" 
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  error={touched.confirmPassword ? errors.confirmPassword : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none z-10"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="md:col-span-2 mt-6">
              <Button 
                type="submit" 
                className="w-full h-12 text-lg flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Registering Organization...</span>
                  </>
                ) : (
                  'Register Organization'
                )}
              </Button>
            </div>
          </form>
          
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300">Login</Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
