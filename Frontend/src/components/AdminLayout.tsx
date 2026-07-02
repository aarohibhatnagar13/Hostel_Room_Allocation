import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

export const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const userRole = (localStorage.getItem('userRole') as UserRole) || UserRole.GUEST;

    const navClass = ({ isActive }: { isActive: boolean }) => 
        `flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            isActive ? 'bg-[#005a9c] text-white shadow-lg translate-x-2' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'
        }`;

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/'; // Forces a hard reload to clear the app state and go to login
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r-4 border-gray-100 shadow-2xl transition-transform lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-8 border-b-4 border-gray-100">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-[#005a9c]">Hostel Admin</h2>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mt-1">
                        {userRole === UserRole.HOSTEL_WARDEN ? 'Hostel Warden' : 'Super Admin'}
                    </span>
                </div>
                
                <nav className="p-6 space-y-3 flex-grow">
                    {userRole === UserRole.ADMIN && (
                        <>
                            <NavLink to="/admin/dashboard" className={navClass}>Dashboard</NavLink>
                            <NavLink to="/admin/history" className={navClass}>Algorithm Engine</NavLink>
                        </>
                    )}
                    <NavLink to="/admin/occupancy" className={navClass}>Room Occupancy</NavLink>
                    <NavLink to="/admin/reports" className={navClass}>Reports</NavLink>
                </nav>

                {/* SIGN OUT BUTTON */}
                <div className="p-6 border-t-4 border-gray-100">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-grow lg:pl-72 flex flex-col h-screen overflow-hidden">
                <div className="lg:hidden p-4 bg-white border-b flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg font-bold">MENU</button>
                    <span className="font-black text-xs uppercase text-[#005a9c]">Management Portal</span>
                </div>
                <div className="flex-grow overflow-y-auto">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
};