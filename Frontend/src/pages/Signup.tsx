import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', rollNo: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email.endsWith('@lnmiit.ac.in')) {
      return setError('You must use an @lnmiit.ac.in email address.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters long.');
    }
    if (!/[0-9]/.test(formData.password)) {
      return setError('Password must contain at least 1 numeric character.');
    }
    if (!/[a-z]/.test(formData.password)) {
      return setError('Password must contain at least 1 lowercase letter.');
    }
    if (!/[A-Z]/.test(formData.password)) {
      return setError('Password must contain at least 1 uppercase letter.');
    }
    if (!/[^a-zA-Z0-9]/.test(formData.password)) {
      return setError('Password must contain at least 1 symbol.');
    }

    setLoading(true);
    const response = await api.signup({
      name: formData.name,
      rollNo: formData.rollNo.toUpperCase(),
      email: formData.email.toLowerCase(),
      password: formData.password
    });
    setLoading(false);

    if (response.success) {
      setSuccess(true);
    } else {
      setError(response.message || 'Signup failed.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Check Your Email</h2>
          <p className="text-sm font-bold text-gray-500 mb-8">
            We've sent a verification link to <span className="text-[#005a9c]">{formData.email}</span>. Please click the link to activate your account.
          </p>
          <button onClick={() => navigate('/')} className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center">
          <img src="https://lnmiit.ac.in/wp-content/uploads/2023/07/cropped-LNMIIT-Logo-Transperant-Background-e1699342125845.png" alt="LNMIIT Logo" className="h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-3xl font-black text-[#005a9c] uppercase tracking-tighter">Create Account</h2>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-1">Full Name</label>
              <input type="text" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#005a9c] bg-gray-50 focus:bg-white font-bold text-sm transition-all outline-none"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-1">Roll No</label>
              <input type="text" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#005a9c] bg-gray-50 focus:bg-white font-bold text-sm uppercase transition-all outline-none"
                value={formData.rollNo} onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} placeholder="22UCS123" />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-1">College Email</label>
            <input type="email" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#005a9c] bg-gray-50 focus:bg-white font-bold text-sm transition-all outline-none"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="rollno@lnmiit.ac.in" />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-1">Password</label>
            <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#005a9c] bg-gray-50 focus:bg-white font-bold text-sm transition-all outline-none"
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
            {formData.password.length > 0 && (
              <div className="mt-2 ml-2 text-[10px] font-bold">
                {formData.password.length < 8 && <p className="text-red-500">• Use at least 8 characters</p>}
                {!/[0-9]/.test(formData.password) && <p className="text-red-500">• Should have at least 1 numeric</p>}
                {!/[a-z]/.test(formData.password) && <p className="text-red-500">• At least 1 lowercase letter</p>}
                {!/[A-Z]/.test(formData.password) && <p className="text-red-500">• At least 1 uppercase letter</p>}
                {!/[^a-zA-Z0-9]/.test(formData.password) && <p className="text-red-500">• At least 1 symbol</p>}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-1">Confirm Password</label>
            <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#005a9c] bg-gray-50 focus:bg-white font-bold text-sm transition-all outline-none"
              value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" />
          </div>

          {error && <div className="bg-red-50 border border-red-100 text-red-500 p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 px-4 text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-[#005a9c] hover:bg-blue-800 transition-all shadow-xl active:scale-95 disabled:opacity-50 mt-4">
            {loading ? 'Processing...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs font-bold text-gray-500">
            Already have an account? <Link to="/" className="text-[#005a9c] hover:underline uppercase tracking-wider font-black ml-1">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};