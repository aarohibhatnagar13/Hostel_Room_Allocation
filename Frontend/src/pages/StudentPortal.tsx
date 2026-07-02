// frontend/src/pages/StudentPortal.tsx

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const StudentPortal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const rollNo = localStorage.getItem('currentRollNo') || '';

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await api.checkStudentStatus(rollNo);
      if (res.exists && res.studentData) {
        setStudentData(res.studentData);
      }
    };
    fetchStatus();
  }, [rollNo]);

  const handleConfirmRoom = async () => {
    if (!studentData?.allocatedRoom) return;
    setLoading(true);
    // Optimistic Locking: sending current room version
    const res = await api.confirmRoomBooking(
      studentData.id, 
      studentData.allocatedRoom.id, 
      studentData.allocatedRoom.version
    );
    setLoading(false);

    if (res.success) {
      alert("Room confirmed successfully!");
      window.location.reload();
    } else if (res.conflict) {
      alert("⚠️ Concurrency Conflict: This bed was just claimed! Please refresh.");
      window.location.reload();
    }
  };

  if (!studentData) {
      return <div className="p-10 text-center font-bold text-gray-400 animate-pulse">Loading Portal...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-[2rem] p-10 shadow-xl border border-gray-100 relative overflow-hidden">
        
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <h1 className="text-3xl font-black uppercase text-indigo-700 mb-2 relative z-10">Student Dashboard</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 relative z-10">Welcome, {studentData.name}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Status Card */}
          <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Current Status</p>
            
            {studentData.allocationStatus === 'unallocated' && (
                <div className="text-amber-600">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">⏳</div>
                    <p className="text-xl font-black">Awaiting Allocation</p>
                    <p className="text-xs font-bold mt-2 opacity-70">The Admin has not run the algorithm yet. Please check back later.</p>
                </div>
            )}

            {studentData.allocationStatus === 'waitlisted' && (
                <div className="text-red-500">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">🛑</div>
                    <p className="text-xl font-black">Waitlisted</p>
                    <p className="text-xs font-bold mt-2 opacity-70">No eligible beds were available for your gender/year. You are on the waitlist.</p>
                </div>
            )}

            {(studentData.allocationStatus === 'allocated' || studentData.allocationStatus === 'confirmed') && (
                <div className="text-green-600">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">🎉</div>
                    <p className="text-2xl font-black tracking-tight">{studentData.allocatedRoom.hostel_name} - Room {studentData.allocatedRoom.room_number}</p>
                    <p className="text-xs font-bold mt-2 uppercase tracking-widest bg-green-100 text-green-700 inline-block px-3 py-1 rounded-md">{studentData.allocatedRoom.room_type} Room</p>
                    
                    {studentData.allocationStatus === 'allocated' && (
                        <button onClick={handleConfirmRoom} disabled={loading} className="mt-6 w-full bg-green-500 text-white px-6 py-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-green-200 hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? 'Securing Bed...' : 'Confirm Room Booking'}
                        </button>
                    )}
                    {studentData.allocationStatus === 'confirmed' && (
                        <div className="mt-6 w-full bg-gray-900 text-green-400 px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest text-center border border-gray-800">
                            ✓ Booking Confirmed
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* Details Card */}
          <div className="space-y-4">
             <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Your Merit Profile</p>
                <p className="text-lg font-black text-gray-800">Year: {studentData.year_of_study} <span className="text-gray-300 mx-2">|</span> CGPA: {studentData.cgpa}</p>
             </div>
             
             <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Your Preferences</p>
                <div className="space-y-2">
                    {studentData.preferences?.map((pref: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">{i+1}</span>
                            <span className="text-xs font-bold text-gray-600 uppercase">{pref.hostel} • {pref.type}</span>
                        </div>
                    ))}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};