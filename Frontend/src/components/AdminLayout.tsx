import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { UserRole } from '../types';

export const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const userRole = (localStorage.getItem('userRole') as UserRole) || UserRole.GUEST;

    const navClass = ({ isActive }: { isActive: boolean }) => 
        `flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            isActive ? 'bg-indigo-600 text-white shadow-lg translate-x-2' : 'text-gray-500 hover:bg-gray-50'
        }`;

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r-4 border-gray-100 shadow-2xl transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-8 border-b-4 border-gray-100">
                    <h2 className="text-2xl font-black uppercase italic text-indigo-700">Hostel Admin</h2>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mt-1">
                        {userRole === UserRole.HOSTEL_WARDEN ? 'Hostel Warden' : 'Super Admin'}
                    </span>
                </div>
                <nav className="p-6 space-y-3">
                    {userRole === UserRole.ADMIN && (
                        <>
                            <NavLink to="/admin/dashboard" className={navClass}>Dashboard</NavLink>
                            <NavLink to="/admin/history" className={navClass}>Algorithm History</NavLink>
                        </>
                    )}
                    <NavLink to="/admin/occupancy" className={navClass}>Room Occupancy</NavLink>
                    <NavLink to="/admin/reports" className={navClass}>Reports</NavLink>
                </nav>
            </aside>
            <main className="flex-grow lg:pl-72 flex flex-col h-screen overflow-hidden">
                <div className="lg:hidden p-4 bg-white border-b flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg font-bold">MENU</button>
                    <span className="font-black text-xs uppercase">Management Portal</span>
                </div>
                <div className="flex-grow overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};