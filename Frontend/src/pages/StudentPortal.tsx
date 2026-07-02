import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const StudentPortal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const rollNo = localStorage.getItem('currentRollNo') || '';

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.checkStudentStatus(rollNo);
        if (res.exists && res.studentData) {
          setStudentData(res.studentData);
        }
      } catch (err) {
        console.error("Failed to fetch student data:", err);
      } finally {
        // THIS IS THE LINE THAT WAS MISSING! 
        // It tells the screen to stop loading whether it succeeds or fails.
        setLoading(false); 
      }
    };
    init();
  }, [rollNo]);

  const handleConfirmRoom = async () => {
    if (!studentData?.allocatedRoom) return;
    setLoading(true);
    
    const res = await api.confirmRoomBooking(
      studentData.id, 
      studentData.allocatedRoom.id, 
      studentData.allocatedRoom.version
    );
    
    setLoading(false);

    if (res.success) {
      alert("Room confirmed successfully!");
      window.location.reload();
    } else {
      alert(res.message || "Failed to confirm room.");
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Loading Portal...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center mt-20">
        <h2 className="text-2xl font-black text-red-500 uppercase">Error Loading Profile</h2>
        <p className="text-gray-500 mt-2">Could not find your student record. Please try logging in again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100">
        
        {/* HEADER SECTION */}
        <div className="border-b border-gray-100 pb-8 mb-8">
            <h1 className="text-3xl font-black uppercase text-[#005a9c] tracking-tighter mb-2">
                Student Dashboard
            </h1>
            <div className="flex gap-4 items-center">
                <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {studentData.roll_number || studentData.rollNo}
                </span>
                <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    CGPA: {studentData.cgpa}
                </span>
            </div>
        </div>

        {/* ALLOCATION STATUS SECTION */}
        <div className="p-8 bg-[#005a9c]/5 rounded-3xl mb-8 border border-[#005a9c]/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#005a9c] mb-4">
              Current Allocation Status
          </p>
          
          {studentData.allocationStatus === 'allocated' && studentData.allocatedRoom ? (
            <div>
              <p className="text-3xl font-black text-gray-900 tracking-tight">
                {studentData.allocatedRoom.hostel_name} - Room {studentData.allocatedRoom.room_number}
              </p>
              <p className="text-sm font-bold text-gray-500 mt-2">
                Type: {studentData.allocatedRoom.room_type} | Floor: {studentData.allocatedRoom.floor}
              </p>
              <button 
                onClick={handleConfirmRoom} 
                disabled={loading} 
                className="mt-6 bg-[#005a9c] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all active:scale-95"
              >
                {loading ? 'Processing...' : 'Confirm Room Selection'}
              </button>
            </div>
          ) : studentData.allocationStatus === 'waitlisted' ? (
            <div>
              <p className="text-2xl font-black text-orange-500">Waitlisted</p>
              <p className="text-sm font-bold text-gray-500 mt-2">We could not match you with a room. Please contact the warden.</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-black text-gray-400">Awaiting Allocation Run...</p>
              <p className="text-xs font-bold text-gray-400 mt-2">The system administrator has not executed the algorithm yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};