import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Room } from '../types';

export const StudentPortal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'FORM'>('FORM');
  const rollNo = localStorage.getItem('currentRollNo') || '';

  useEffect(() => {
    const init = async () => {
      const res = await api.checkStudentStatus(rollNo);
      if (res.exists && res.studentData) {
        setStudentData(res.studentData);
        if (res.hasSubmitted) setViewMode('DASHBOARD');
      }
    };
    init();
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
      alert("⚠️ This room was just taken! Please refresh and select another.");
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {viewMode === 'DASHBOARD' ? (
        <div className="bg-white rounded-[2rem] p-10 shadow-xl border border-gray-100">
          <h1 className="text-3xl font-black uppercase italic text-indigo-700 mb-6">Student Dashboard</h1>
          <div className="p-6 bg-indigo-50 rounded-2xl mb-6">
            <p className="text-xs font-black uppercase text-indigo-400 mb-2">Current Allocation Status</p>
            {studentData?.allocationStatus === 'allocated' ? (
              <div>
                <p className="text-2xl font-black text-gray-800">Room {studentData.allocatedRoom.roomNumber} Assigned</p>
                <button onClick={handleConfirmRoom} disabled={loading} className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg">
                  {loading ? 'Processing...' : 'Confirm Room Selection'}
                </button>
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-400">Awaiting Greedy Allocation Run...</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] p-10 shadow-xl">
           <h2 className="text-2xl font-black uppercase mb-6">Select Preferences</h2>
           <p className="text-gray-500 mb-8 font-bold">Please ensure your CGPA and block preferences are correct for the priority algorithm.</p>
           {/* Simple preference form logic here */}
           <button onClick={() => setViewMode('DASHBOARD')} className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-black uppercase text-xs">View My Status</button>
        </div>
      )}
    </div>
  );
};