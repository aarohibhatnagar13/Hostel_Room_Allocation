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
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 w-8 h-8 rounded flex items-center justify-center text-white font-black">H</div>
          <span className="font-black text-gray-800 uppercase tracking-tighter text-sm">Hostel Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-[10px] font-black uppercase px-3 py-1 bg-gray-100 rounded-full text-gray-500">Student Access</span>
          <button onClick={() => { onLogout(); navigate('/'); }} className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-all">Sign Out</button>
        </div>
      </div>
    </nav>
  );
};