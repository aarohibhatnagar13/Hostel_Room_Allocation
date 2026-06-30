import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { UserRole } from '../types';

export const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const userRole = (localStorage.getItem('userRole') as UserRole) || UserRole.GUEST;

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            {/* MOBILE OVERLAY */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside 
                className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r-4 border-gray-100 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-8 border-b-4 border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className={`text-3xl font-black tracking-tighter uppercase italic text-[#005a9c]`}>TA Allocation</h2>
                        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-400">
                            {userRole === UserRole.LAB_MANAGER ? 'Lab Manager' : 'Admin Panel'}
                        </span>
                    </div>
                    {/* Close Button */}
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 cursor-pointer lg:hidden">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                <nav className="flex-grow p-6 space-y-3">
                    {userRole === UserRole.ADMIN && (
                        <NavLink
                            to="/admin/dashboard"
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => 
                                `flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                    isActive 
                                        ? 'bg-[#005a9c] text-white shadow-xl shadow-blue-900/20 translate-x-2' 
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`
                            }
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                            Dashboard
                        </NavLink>
                    )}

                    <NavLink
                        to="/admin/attendance"
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) => 
                            `flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                isActive 
                                    ? 'bg-[#005a9c] text-white shadow-xl shadow-blue-900/20 translate-x-2' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                        Attendance
                    </NavLink>

                    <NavLink
                        to="/admin/reports"
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) => 
                            `flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                isActive 
                                    ? 'bg-[#005a9c] text-white shadow-xl shadow-blue-900/20 translate-x-2' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        TA Reports
                    </NavLink>
                </nav>

                <div className="p-8 border-t-4 border-gray-100 bg-gray-50/50">
                    <button 
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = '/';
                        }}
                        className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className={`flex-grow flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'lg:pl-72' : 'pl-0'}`}>
                {/* HEADER BAR FOR TOGGLE */}
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b-2 border-gray-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className={`p-2 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-colors ${isSidebarOpen ? 'hidden lg:hidden' : 'block cursor-pointer'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                        </button>
                        
                        {/* --- ONLY LOGO HERE NOW --- */}
                        <div className="flex items-center gap-3">
                            <img 
                                src="https://lnmiit.ac.in/wp-content/uploads/2023/07/cropped-LNMIIT-Logo-Transperant-Background-e1699342125845.png" 
                                alt="LNMIIT Logo" 
                                className="h-8 w-auto object-contain" 
                            />
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE ROUTE CONTENT */}
                <div className="flex-grow overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};