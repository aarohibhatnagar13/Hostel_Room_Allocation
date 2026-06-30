import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    const res = await api.forgotPassword(email);
    
    if (res.success) {
      setStatus('success');
      setMessage(res.message || "Reset link sent to your email.");
    } else {
      setStatus('error');
      setMessage(res.message || "Failed to send reset link.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center">
            <h2 className="text-3xl font-black text-[#e35205] uppercase tracking-tighter">Reset Password</h2>
            <p className="mt-2 text-xs font-bold text-gray-400">Enter your college email to receive a reset link.</p>
        </div>

        {status === 'success' ? (
            <div className="text-center animate-in zoom-in">
                <div className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-2xl text-xs font-black uppercase tracking-wider mb-6">
                    {message}
                </div>
                <Link to="/" className="w-full inline-block bg-gray-100 text-gray-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                    Return to Login
                </Link>
            </div>
        ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-2">Registered Email</label>
                    <input
                        type="email"
                        required
                        className="w-full px-5 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#e35205] bg-gray-50 focus:bg-white font-bold text-sm transition-all"
                        placeholder="you@lnmiit.ac.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                {status === 'error' && (
                    <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center">
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full flex justify-center py-4 px-4 text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-[#e35205] hover:bg-orange-700 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="text-center pt-2">
                    <Link to="/" className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Back to Login</Link>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};