import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { loginUser } from '../services/auth'; 

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginUser(email, password);

      if (response.success && response.role) {
        localStorage.setItem('userRole', response.role);
        if (response.rollNo) {
            localStorage.setItem('currentRollNo', response.rollNo);
        }

        onLogin(response.role as UserRole);

        if (response.role === 'ADMIN' || response.role === 'HOSTEL_WARDEN') {
            navigate('/admin');
        } else {
            navigate('/portal');
        }
      } else {
        setError(response.message || 'Invalid Credentials.');
      }
    } catch (err: any) {
      console.error("Login Crash:", err);
      setError(`Crash: ${err.message || err.toString()}`); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        
        <div className="text-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/LNMIIT_logo.png/220px-LNMIIT_logo.png" 
              alt="University Logo" 
              className="h-20 mx-auto mb-6 object-contain"
            />
            <h2 className="text-3xl font-black text-[#005a9c] uppercase tracking-tighter">Portal Access</h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
              Hostel Allocation System
            </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-2">Institutional Email</label>
              <input
                type="email"
                required
                className="w-full px-5 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005a9c] focus:bg-white bg-gray-50 font-bold text-sm transition-all"
                placeholder="rollno@lnmiit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-2">Portal Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-5 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005a9c] focus:bg-white bg-gray-50 font-bold text-sm transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#005a9c] text-xs font-black uppercase">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-[#005a9c] hover:bg-blue-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Secure Sign In'}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
            <Link to="/forgot-password" className="text-xs font-bold text-[#e35205] hover:text-orange-700 uppercase tracking-widest">Forgot Password?</Link>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs font-bold text-gray-500">
            New Student? <Link to="/signup" className="text-[#005a9c] hover:text-blue-800 uppercase tracking-wider font-black ml-1">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};