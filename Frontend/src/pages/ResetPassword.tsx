import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        setStatus('error');
        setMessage('Invalid or missing reset token.');
        return;
    }
    if (password.length < 8) {
        setStatus('error');
        setMessage('Password must be at least 8 characters.');
        return;
    }
    if (!/[0-9]/.test(password)) {
        setStatus('error');
        setMessage('Password must contain at least 1 numeric character.');
        return;
    }
    if (!/[a-z]/.test(password)) {
        setStatus('error');
        setMessage('Password must contain at least 1 lowercase letter.');
        return;
    }
    if (!/[A-Z]/.test(password)) {
        setStatus('error');
        setMessage('Password must contain at least 1 uppercase letter.');
        return;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        setStatus('error');
        setMessage('Password must contain at least 1 symbol.');
        return;
    }
    if (password !== confirmPassword) {
        setStatus('error');
        setMessage('Passwords do not match.');
        return;
    }

    setStatus('loading');
    const res = await api.resetPassword(token, password);
    
    if (res.success) {
      setStatus('success');
      setMessage(res.message || 'Password successfully updated.');
    } else {
      setStatus('error');
      setMessage(res.message || 'Failed to update password.');
    }
  };

  if (status === 'success') {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
              <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Password Updated</h2>
                  <p className="text-sm font-bold text-gray-500 mb-8">{message}</p>
                  <button onClick={() => navigate('/')} className="w-full bg-[#005a9c] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl">
                      Proceed to Login
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        
        <div className="text-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/LNMIIT_logo.png/220px-LNMIIT_logo.png" 
              alt="University Logo" 
              className="h-16 mx-auto mb-6 object-contain"
            />
            <h2 className="text-3xl font-black text-[#005a9c] uppercase tracking-tighter">New Password</h2>
            <p className="mt-2 text-xs font-bold text-gray-400">Create a new secure password for your account.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-2">New Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full px-5 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005a9c] bg-gray-50 focus:bg-white font-bold text-sm transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#005a9c] text-xs font-bold uppercase tracking-wider">
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                    {password.length > 0 && (
                        <div className="mt-3 ml-2 text-[10px] font-bold space-y-1">
                            {password.length < 8 && <p className="text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span> At least 8 characters</p>}
                            {!/[0-9]/.test(password) && <p className="text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span> At least 1 number</p>}
                            {!/[a-z]/.test(password) && <p className="text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span> At least 1 lowercase</p>}
                            {!/[A-Z]/.test(password) && <p className="text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span> At least 1 uppercase</p>}
                            {!/[^a-zA-Z0-9]/.test(password) && <p className="text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span> At least 1 symbol</p>}
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-2">Confirm Password</label>
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full px-5 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005a9c] bg-gray-50 focus:bg-white font-bold text-sm transition-all"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
            </div>

            {status === 'error' && (
                <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center">
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center py-4 px-4 text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-[#005a9c] hover:bg-blue-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
                {status === 'loading' ? 'Updating...' : 'Update Password'}
            </button>
            
            <div className="text-center pt-2">
                <button type="button" onClick={() => navigate('/')} className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel & Return</button>
            </div>
        </form>
      </div>
    </div>
  );
};