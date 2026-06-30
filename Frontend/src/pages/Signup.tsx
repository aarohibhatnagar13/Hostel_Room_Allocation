import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState({ 
    name: '', rollNo: '', email: '', password: '', confirmPassword: '',
    cgpa: '', yearOfStudy: '1', preferredBlock: 'A', preferredType: 'Non-AC',
    floorPref1: '1', floorPref2: '2', floorPref3: '3'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const priorityScore = useMemo(() => {
    const cgpaNum = parseFloat(formData.cgpa) || 0;
    const yearNum = parseInt(formData.yearOfStudy) || 0;
    return ((cgpaNum * 7) + (yearNum * 3)).toFixed(2);
  }, [formData.cgpa, formData.yearOfStudy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.email.includes('@')) return setError('Use a valid university email.');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');
    
    setLoading(true);
    const response = await api.signup({
      ...formData,
      rollNo: formData.rollNo.toUpperCase(),
      priorityScore: parseFloat(priorityScore)
    });
    setLoading(false);
    if (response.success) setSuccess(true);
    else setError(response.message || 'Signup failed.');
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Registration Successful</h2>
          <p className="text-sm font-bold text-gray-500 mb-8">Please check your email to verify your account.</p>
          <button onClick={() => navigate('/')} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">Return to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-black text-indigo-700 uppercase tracking-tighter">Student Registration</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Housing Allocation Portal</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" />
            <input type="text" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm uppercase outline-none"
              value={formData.rollNo} onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} placeholder="Roll No" />
            <input type="number" step="0.01" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.cgpa} onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })} placeholder="CGPA (e.g. 9.5)" />
            <select className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.yearOfStudy} onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}>
              <option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option>
            </select>
          </div>

          <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100">
            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-3">Room Preferences</label>
            <div className="grid grid-cols-2 gap-4">
               <select className="px-4 py-3 border border-gray-200 rounded-xl bg-white font-bold text-xs" value={formData.preferredBlock} onChange={(e) => setFormData({...formData, preferredBlock: e.target.value})}>
                  <option value="A">Block A</option><option value="B">Block B</option><option value="C">Block C</option>
               </select>
               <select className="px-4 py-3 border border-gray-200 rounded-xl bg-white font-bold text-xs" value={formData.preferredType} onChange={(e) => setFormData({...formData, preferredType: e.target.value})}>
                  <option value="Non-AC">Non-AC</option><option value="AC">AC Room</option>
               </select>
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-[2rem] text-center">
             <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Priority Score Preview</p>
             <p className="text-4xl font-black text-white">{priorityScore}</p>
          </div>

          <div className="space-y-4">
            <input type="email" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email Address" />
            <div className="grid grid-cols-2 gap-4">
              <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Password" />
              <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
                value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Confirm" />
            </div>
          </div>

          {error && <div className="text-red-500 text-[10px] font-black uppercase text-center">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl transition-all">
            {loading ? 'Processing...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
};