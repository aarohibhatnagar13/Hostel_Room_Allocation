import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState({ 
    name: '', rollNo: '', email: '', password: '', confirmPassword: '',
    cgpa: '', yearOfStudy: '1', gender: 'Male', roommateIds: ''
  });
  
  // Dynamic array for multiple room preferences
  const [preferences, setPreferences] = useState([
      { hostel: 'BH-1', type: 'Single' }
  ]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Strict Seniority Priority Preview (Year first, then CGPA)
  const priorityScore = useMemo(() => {
    const cgpaNum = parseFloat(formData.cgpa) || 0;
    const yearNum = parseInt(formData.yearOfStudy) || 1;
    // Just a visual representation for the student
    return ((yearNum * 100) + cgpaNum).toFixed(2);
  }, [formData.cgpa, formData.yearOfStudy]);

  const addPreference = () => {
      if (preferences.length < 3) {
          setPreferences([...preferences, { hostel: 'BH-1', type: 'Double' }]);
      }
  };

  const updatePreference = (index: number, field: string, value: string) => {
      const newPrefs = [...preferences];
      newPrefs[index] = { ...newPrefs[index], [field]: value };
      setPreferences(newPrefs);
  };

  const removePreference = (index: number) => {
      setPreferences(preferences.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
        return setError('Passwords do not match.');
    }
    
    setLoading(true);
    
    // Prepare data for the backend API
    const payload = {
      ...formData,
      rollNo: formData.rollNo.toUpperCase(),
      preferences: preferences, // Send the array of objects!
      // Convert comma-separated string to array, if any
      roommate_ids: formData.roommateIds ? formData.roommateIds.split(',').map(id => id.trim().toUpperCase()) : []
    };

    const response = await api.signup(payload);
    
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
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Registration Successful</h2>
          <p className="text-sm font-bold text-gray-500 mb-8">Your account and preferences have been securely saved.</p>
          <button onClick={() => navigate('/')} className="w-full bg-[#005a9c] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all">Proceed to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-black text-[#005a9c] uppercase tracking-tighter">Student Registration</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Housing Allocation Portal</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* PERSONAL DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" />
            
            <input type="text" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm uppercase outline-none"
              value={formData.rollNo} onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} placeholder="Roll No (e.g. 2024UEC123)" />
            
            <input type="number" step="0.01" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.cgpa} onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })} placeholder="CGPA (e.g. 8.5)" />
            
            <select className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.yearOfStudy} onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}>
              <option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option>
            </select>

            <select className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
              <option value="Male">Male</option><option value="Female">Female</option>
            </select>

            <input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm uppercase outline-none"
              value={formData.roommateIds} onChange={(e) => setFormData({ ...formData, roommateIds: e.target.value })} placeholder="Roommate Roll No (Optional)" />
          </div>

          {/* DYNAMIC PREFERENCES */}
          <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100">
            <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#005a9c]">Room Preferences (In Order)</label>
                {preferences.length < 3 && (
                    <button type="button" onClick={addPreference} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800">
                        + Add Choice
                    </button>
                )}
            </div>
            
            <div className="space-y-3">
                {preferences.map((pref, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <span className="text-xs font-black text-blue-300">#{index + 1}</span>
                        <select className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white font-bold text-xs" 
                            value={pref.hostel} onChange={(e) => updatePreference(index, 'hostel', e.target.value)}>
                            <option value="BH-1">BH-1</option><option value="BH-2">BH-2</option><option value="GH-1">GH-1</option>
                        </select>
                        <select className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white font-bold text-xs" 
                            value={pref.type} onChange={(e) => updatePreference(index, 'type', e.target.value)}>
                            <option value="Single">Single Room</option><option value="Double">Double Room</option><option value="Triple">Triple Room</option>
                        </select>
                        {index > 0 && (
                            <button type="button" onClick={() => removePreference(index)} className="p-3 text-red-400 hover:text-red-600">
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>
          </div>

          <div className="space-y-4">
            <input type="email" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email Address" />
            <div className="grid grid-cols-2 gap-4">
              <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Password" />
              <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 font-bold text-sm outline-none"
                value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Confirm Password" />
            </div>
          </div>

          {error && <div className="text-red-500 text-[10px] font-black uppercase text-center">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-[#005a9c] hover:bg-blue-800 shadow-xl transition-all">
            {loading ? 'Processing...' : 'Submit Request'}
          </button>
          
          <div className="text-center pt-2">
            <Link to="/" className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};