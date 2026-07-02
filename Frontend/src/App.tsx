import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { StudentPortal } from './pages/StudentPortal';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminAttendance } from './pages/AdminAttendance'; 
import { AdminReports } from './pages/AdminReports';
import { AllocationHistory } from './pages/AllocationHistory'; 
import { UserRole } from './types';
import { Signup } from './pages/Signup';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

function App() {
  // 1. Manage the global user role state
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || UserRole.GUEST;
  });

  // 2. This is the function the Login page was missing!
  const handleLogin = (role: UserRole) => {
    localStorage.setItem('userRole', role);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(UserRole.GUEST);
  };

  const isWardenOrAdmin = userRole === UserRole.ADMIN || userRole === UserRole.HOSTEL_WARDEN;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 font-sans">
        {userRole === UserRole.STUDENT && <Navbar role={userRole} onLogout={handleLogout} />}
        
        <main>
          <Routes>
            {/* PASSING THE handleLogin FUNCTION TO THE LOGIN COMPONENT HERE */}
            <Route 
              path="/" 
              element={
                userRole === UserRole.GUEST 
                  ? <Login onLogin={handleLogin} /> 
                  : <Navigate to={isWardenOrAdmin ? "/admin" : "/portal"} replace />
              } 
            />
            
            <Route path="/portal" element={userRole === UserRole.STUDENT ? <StudentPortal /> : <Navigate to="/" replace />} />
            
            <Route path="/admin" element={isWardenOrAdmin ? <AdminLayout /> : <Navigate to="/" replace />}>
                <Route index element={<Navigate to={userRole === UserRole.ADMIN ? "dashboard" : "occupancy"} replace />} />
                <Route path="dashboard" element={userRole === UserRole.ADMIN ? <AdminDashboard /> : <Navigate to="/admin/occupancy" replace />} />
                <Route path="history" element={userRole === UserRole.ADMIN ? <AllocationHistory /> : <Navigate to="/admin/occupancy" replace />} />
                <Route path="occupancy" element={<AdminAttendance />} />
                <Route path="reports" element={<AdminReports />} />
            </Route>

            <Route path="/signup" element={<Signup />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;