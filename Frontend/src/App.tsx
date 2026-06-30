import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { StudentPortal } from './pages/StudentPortal';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminAttendance } from './pages/AdminAttendance';
import { AdminReports } from './pages/AdminReports';
import { UserRole } from './types';
import { Signup } from './pages/Signup';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';


function App() {
  // --- 1. SESSION PERSISTENCE ---
  // Initialize state from localStorage so the session stays active on refresh
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || UserRole.GUEST;
  });

  // --- 2. AUTH HANDLERS ---
  const handleLogin = (role: UserRole) => {
    localStorage.setItem('userRole', role);
    setUserRole(role);
  };

  const handleLogout = () => {
    // Clear everything from browser memory on logout
    localStorage.clear();
    setUserRole(UserRole.GUEST);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden">
        
        {/* --- GLOBAL NAVBAR --- */}
        {/* Only show for Students. Admins have their own sidebar layout. */}
        {userRole === UserRole.STUDENT && (
          <Navbar role={userRole} onLogout={handleLogout} />
        )}
        
        <main>
          <Routes>
            {/* 
               ROUTE: LOGIN (/) 
               If already logged in, automatically redirect to the correct dashboard
            */}
            <Route path="/" element={
              userRole === UserRole.GUEST ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to={(userRole === UserRole.ADMIN || userRole === UserRole.LAB_MANAGER) ? "/admin" : "/portal"} replace />
              )
            } />

            {/* 
               ROUTE: STUDENT PORTAL (/portal)
               Guard: If a non-student tries to access this URL, kick them to Login
            */}
            <Route path="/portal" element={
              userRole === UserRole.STUDENT ? (
                <StudentPortal />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            {/* 
               ROUTE: ADMIN AREA (/admin/*)
               Guard: If a student tries to access /admin, kick them to Login
            */}
            <Route path="/admin" element={
              (userRole === UserRole.ADMIN || userRole === UserRole.LAB_MANAGER) ? (
                <AdminLayout />
              ) : (
                <Navigate to="/" replace />
              )
            }>
                {/* Default redirect: Dashboard for Admin, Attendance for Lab Manager */}
                <Route index element={
                  <Navigate to={userRole === UserRole.ADMIN ? "dashboard" : "attendance"} replace />
                } />
                
                {/* Protect Dashboard from Lab Managers */}
                <Route path="dashboard" element={
                  userRole === UserRole.ADMIN ? <AdminDashboard /> : <Navigate to="/admin/attendance" replace />
                } />
                
                {/* Both Admin and Lab Manager can access Attendance */}
                <Route path="attendance" element={<AdminAttendance />} />
                
                {/* Both Admin and Lab Manager can access Reports */}
                <Route path="reports" element={<AdminReports />} />
            </Route>
            <Route path="/signup" element={
              userRole === UserRole.GUEST ? (
                <Signup />
              ) : (
                <Navigate to={(userRole === UserRole.ADMIN || userRole === UserRole.LAB_MANAGER) ? "/admin" : "/portal"} replace />
              )
            } />

            {/* ROUTE: VERIFY EMAIL */}
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* 
               FALLBACK ROUTE
               Redirect any invalid URLs back to the Home/Login page
            */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;