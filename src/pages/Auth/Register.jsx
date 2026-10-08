import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Building, Mail, User, Phone, MapPin, Lock, Briefcase, Globe, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Country, State, City } from 'country-state-city';
import { districtsByState } from '../../data/districts';
import { citiesByDistrict } from '../../data/citiesByDistrict';
import { buildApiUrl } from '../../utils/api';

export function Register() {
  const [registered, setRegistered] = useState(false);
  const [industry, setIndustry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (data.password !== data.confirmPassword) {
      setErrorMsg("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setRegistered(true);
      } else {
        const err = await response.json();
        setErrorMsg(err.error || 'Registration failed');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to connect to backend server');
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
            <div className="mx-auto w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
              <BrainCircuit className="h-8 w-8" />
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
                <p className="text-gray-400 mb-8">Organization registered successfully. Please login to continue.</p>
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
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}
          
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Building className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Organization Name" name="name" required className="pl-10" />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Organization Email" name="email" type="email" required className="pl-10" />
            </div>
            
            <div className="relative">
              <User className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Administrator Name" name="adminName" required className="pl-10" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Phone Number" name="phone" required className="pl-10" />
            </div>
            
            <div className="relative md:col-span-2">
              <Briefcase className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10" />
              <Select 
                label="Industry" 
                name="industry"
                required 
                className="pl-10"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
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
            
            {industry === 'other' && (
              <div className="relative md:col-span-2">
                <Briefcase className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
                <Input label="Specify Industry" name="industrySpecific" required className="pl-10" placeholder="Enter your industry" />
              </div>
            )}
            
            <div className="relative md:col-span-2">
              <Globe className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Website (Optional)" name="website" type="url" className="pl-10" placeholder="https://example.com" />
            </div>
            
            <div className="relative md:col-span-2">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Organization Address" name="address" required className="pl-10" />
            </div>
            
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10" />
              <Select 
                label="Country" 
                name="county"
                required 
                className="pl-10"
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setStateCode('');
                  setDistrict('');
                  setCity('');
                }}
              >
                <option value="" className="bg-gray-900 text-white">Select Country</option>
                {Country.getAllCountries().map(country => (
                  <option key={country.isoCode} value={country.isoCode} className="bg-gray-900 text-white">
                    {country.name}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10" />
              <Select 
                label="State" 
                name="state"
                required 
                className="pl-10"
                value={stateCode}
                onChange={(e) => {
                  setStateCode(e.target.value);
                  setDistrict('');
                  setCity('');
                }}
                disabled={!countryCode}
              >
                <option value="" className="bg-gray-900 text-white">Select State</option>
                {countryCode && State.getStatesOfCountry(countryCode).map(state => (
                  <option key={state.isoCode} value={state.isoCode} className="bg-gray-900 text-white">
                    {state.name}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10" />
              <Select 
                label="District" 
                name="district"
                required 
                className="pl-10"
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setCity('');
                }}
                disabled={!stateCode}
              >
                <option value="" className="bg-gray-900 text-white">Select District</option>
                {stateCode && (districtsByState[stateCode] || []).map(d => (
                  <option key={d} value={d} className="bg-gray-900 text-white">{d}</option>
                ))}
              </Select>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500 z-10" />
              <Select 
                label="City" 
                name="city"
                required 
                className="pl-10"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!district && !stateCode}
              >
                <option value="" className="bg-gray-900 text-white">Select City</option>
                {district && citiesByDistrict[stateCode]?.[district]
                  ? citiesByDistrict[stateCode][district].map(c => (
                      <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                    ))
                  : stateCode && City.getCitiesOfState(countryCode, stateCode).map(c => (
                      <option key={c.name} value={c.name} className="bg-gray-900 text-white">{c.name}</option>
                    ))
                }
              </Select>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Pincode" name="pincode" required className="pl-10" />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Password" name="password" type={showPassword ? "text" : "password"} required className="pl-10 pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-500" />
              <Input label="Confirm Password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required className="pl-10 pr-10" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-300 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="md:col-span-2 mt-6">
              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? 'Registering Organization...' : 'Register Organization'}
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
