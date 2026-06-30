import React from 'react';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  role: UserRole;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ role, onLogout }) => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    // 1. Trigger state cleanup in App.tsx
    onLogout();
    // 2. Clear specific browser items just in case
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentRollNo');
    localStorage.removeItem('studentStatus');
    // 3. Jump back to login route
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        
        {/* --- LEFT SIDE: LOGO & TITLE --- */}
        <div className="flex items-center gap-4">
          <img 
            src="https://lnmiit.ac.in/wp-content/uploads/2023/07/cropped-LNMIIT-Logo-Transperant-Background-e1699342125845.png" 
            alt="LNMIIT" 
            className="h-10 w-auto object-contain" 
          />
          {/* Vertical Separator */}
          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
          <span className="font-black text-gray-800 uppercase tracking-tighter text-sm hidden sm:block">
            TA Allocation Portal
          </span>
        </div>

        {/* --- RIGHT SIDE: ACTIONS --- */}
        <div className="flex items-center gap-4">
          

          
          {/* Role Badge */}
          <span className="hidden md:inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-gray-100 rounded-full text-gray-500 border border-gray-200">
            {role === UserRole.ADMIN ? 'Administrator' : 'Student Access'}
          </span>
          
          {/* LOGOUT BUTTON (High Visibility Version) */}
          <button 
            onClick={handleSignOut} 
            className="
              flex items-center gap-2
              bg-red-50 text-red-600 
              border border-red-200 
              hover:bg-red-600 hover:text-white hover:border-red-600
              transition-all duration-200
              px-4 py-2 rounded-lg 
              text-xs font-black uppercase tracking-wider
              cursor-pointer
            "
          >
            {/* Simple Logout Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            Sign Out
          </button>

        </div>
      </div>
    </nav>
  );
};