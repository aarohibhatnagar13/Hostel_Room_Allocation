import React from 'react';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  role: UserRole;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ role, onLogout }) => {
  const navigate = useNavigate();
  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        
        {/* LOGO AND TAGLINE SECTION */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/portal')}>
          {/* Change this src to your actual logo URL or a local file like "/logo.png" */}
          
          <div className="flex flex-col">
            <span className="font-black text-gray-800 uppercase tracking-tighter text-sm leading-none">
              Hostel Allocation
            </span>
            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
              Smart Management Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-[10px] font-black uppercase px-3 py-1 bg-gray-100 rounded-full text-gray-500">
            {role === UserRole.STUDENT ? 'Student Access' : 'Admin Access'}
          </span>
          <button 
            onClick={() => { onLogout(); navigate('/'); }} 
            className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};