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

        if (response.role === UserRole.ADMIN || response.role === UserRole.LAB_MANAGER) {
            navigate('/admin');
        } else {
            navigate('/portal');
        }
      } else {
        setError(response.message || 'Invalid Credentials or Server Error.');
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError('Network Error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        
        {/* LOGO */}
        <div className="text-center">
            <img 
              src="https://lnmiit.ac.in/wp-content/uploads/2023/07/cropped-LNMIIT-Logo-Transperant-Background-e1699342125845.png" 
              alt="LNMIIT Logo" 
              className="h-20 mx-auto mb-6 object-contain"
            />
            <h2 className="text-3xl font-black text-[#005a9c] uppercase tracking-tighter">Sign In to Portal</h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">
              Teaching Assistant Allocation System
            </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 block mb-2">Institutional Email</label>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-5 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005a9c] focus:border-[#005a9c] focus:bg-white bg-gray-50 font-bold text-sm transition-all"
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
                  className="appearance-none relative block w-full px-5 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#005a9c] focus:border-[#005a9c] focus:bg-white bg-gray-50 font-bold text-sm transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-[#005a9c] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Secure Sign In'}
            </button>
          </div>
          
        </form>
        {/* FORGOT PASSWORD LINK */}
        <div className="text-center pt-2">
            <Link to="/forgot-password" className="text-xs font-bold text-[#e35205] hover:text-orange-700 uppercase tracking-widest">Forgot Password?</Link>
        </div>

        {/* SIGN UP LINK */}
        <div className="text-center pt-2">
          <p className="text-xs font-bold text-gray-500">
            New Student? <Link to="/signup" className="text-[#005a9c] hover:underline uppercase tracking-wider font-black ml-1">Create Account</Link>
          </p>
        </div>

        <div className="mt-8 text-center">
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                © The LNMIIT Institute of Technology
            </p>
        </div>
      </div>
    </div>
  );
};