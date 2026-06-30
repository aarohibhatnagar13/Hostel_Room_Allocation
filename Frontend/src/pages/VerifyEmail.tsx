import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Starts in 'idle' state waiting for HUMAN click
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleVerifyClick = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    setStatus('loading');
    const res = await api.verifyEmailToken(token);
    
    if (res.success) {
      setStatus('success');
      setMessage(res.message || 'Email verified successfully!');
    } else {
      setStatus('error');
      setMessage(res.message || 'Verification failed. Link may be expired.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
        
        {/* IDLE STATE: Blocks bots by requiring a physical click */}
        {status === 'idle' && (
          <div className="flex flex-col items-center animate-in fade-in">
            <div className="w-16 h-16 bg-blue-100 text-[#005a9c] rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Confirm Email</h2>
            <p className="text-sm font-bold text-gray-500 mb-8">Click the button below to securely verify your TA Portal account.</p>
            <button onClick={handleVerifyClick} className="w-full bg-[#005a9c] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl active:scale-95">
              Verify My Account
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-[#005a9c] rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Verifying...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Verified!</h2>
            <p className="text-sm font-bold text-gray-500 mb-8">{message}</p>
            <button onClick={() => navigate('/')} className="w-full bg-[#005a9c] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl active:scale-95">
              Proceed to Login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Verification Alert</h2>
            <p className="text-sm font-bold text-gray-500 mb-8">{message}</p>
            <div className="w-full space-y-3">
                <button onClick={() => navigate('/')} className="w-full bg-[#005a9c] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl active:scale-95">
                    Try Logging In
                </button>
                <Link to="/signup" className="w-full inline-block bg-gray-100 text-gray-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                    Sign Up Again
                </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};