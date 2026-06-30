import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

// --- TYPES ---
interface Lab {
  id: string;
  subject: string;
  day: string;
  startTime: number;
  endTime: number;
  venue?: string;
}

interface GradePref {
  subject: string;
  grade: string;
}

interface Exp {
  academicYear: string;
  semester: string;
  subject: string;
}

interface StudentData {
  id: number;
  name: string;
  rollNo: string;
  cgpa: number;
  isBlacklisted: boolean;
  student_grades: { subject: string; grade: string }[];
  student_availabilities: { id: number; labId?: string; day: string; startTime: number; endTime: number }[];
  student_experiences: Exp[];
  yearOfStudy?: string;
  allocations: { labId: string; round: number }[];
  lab_blacklists?: { labId: string }[];
}

// --- MODAL TYPE DEFINITION ---
type ModalConfig = {
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    onConfirm?: () => void;
};

export const StudentPortal: React.FC = () => {
  const storedRollNo = localStorage.getItem('currentRollNo') || '';

  // STATE
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'FORM' | 'CLOSED'>('FORM');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [portalMsg, setPortalMsg] = useState('');
  const [isSystemConfirmed, setIsSystemConfirmed] = useState(false);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  
  // FORM INPUTS
  const [name, setName] = useState('');
  const [rollNo] = useState(storedRollNo);
  const [cgpa, setCgpa] = useState<string>('');
  const [yearOfStudy, setYearOfStudy] = useState<string>('');
  const [grades, setGrades] = useState<GradePref[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [activeDay, setActiveDay] = useState<string>('Mon');
  const [experiences, setExperiences] = useState<Exp[]>([]);
  
  // MODAL STATE
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const closeModal = () => setModal(null);

  // SEARCH STATES
  const [searchGradeQuery, setSearchGradeQuery] = useState('');
  const [searchAvailabilityQuery, setSearchAvailabilityQuery] = useState('');
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [showAllLabs, setShowAllLabs] = useState(false);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  // Dynamically generate the last 4 academic years based on the current active system year
  const generateDynamicYears = () => {
    const baseYear = academicYear ? parseInt(academicYear.split('-')[0]) : new Date().getFullYear();
    return [
        `${baseYear - 1}-${baseYear}`,
        `${baseYear - 2}-${baseYear - 1}`,
        `${baseYear - 3}-${baseYear - 2}`,
        `${baseYear - 4}-${baseYear - 3}`
    ];
  };
  const dynamicYears = generateDynamicYears();

  const daysLabs = labs.filter(l => l.day.toLowerCase().startsWith(activeDay.substring(0, 3).toLowerCase()));
  const subjectsForDay = Array.from(new Set(daysLabs.map(l => l.subject))) as string[];

  useEffect(() => {
    const init = async () => {
      setInitializing(true);
      try {
        const labsRes = await api.getLabs(1, 1000);

        if (labsRes.success && labsRes.data) {
          setLabs(labsRes.data);
          setUniqueSubjects(Array.from(new Set(labsRes.data.map((l: Lab) => l.subject))) as string[]);
        }

        const windowStatus = labsRes.isWindowOpen !== undefined
          ? labsRes.isWindowOpen
          : (labsRes.success && labsRes.data && labsRes.data.length > 0);
          
        setIsWindowOpen(windowStatus);

        if (!windowStatus) {
          setPortalMsg("The TA Application Window is currently closed.");
        }

        const status = await api.checkStudentStatus(rollNo);
        if (status.exists && status.studentData) {
          const s = status.studentData;
          setStudentData(s);
          setName(s.name);
          setCgpa(s.cgpa.toString());
          setYearOfStudy(s.yearOfStudy || '');

         if (status.systemStatus) {
            setIsSystemConfirmed(status.systemStatus.isConfirmed);
            setAcademicYear(status.systemStatus.academicYear);
            setSemester(status.systemStatus.semester);
            setIsWithdrawOpen(status.systemStatus.isWithdrawOpen);
          }

          if (status.hasSubmitted) {
            setIsReturningUser(true);
            setViewMode('DASHBOARD');
          } else {
            setIsReturningUser(false);
            setViewMode(windowStatus ? 'FORM' : 'CLOSED');
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, [rollNo]);

  const handleEditClick = () => {
    if (!studentData) return;
    setGrades(studentData.student_grades.map((g: any) => ({ subject: g.subject, grade: g.grade })));
    setExperiences(studentData.student_experiences || []);

    const existingSlots: string[] = [];
    studentData.student_availabilities.forEach((avail: any) => {
    if (avail.labId) {
        existingSlots.push(avail.labId);
    } else {
        const matches = labs.filter(l => l.day === avail.day && l.startTime === avail.startTime && l.endTime === avail.endTime);
        matches.forEach(m => existingSlots.push(m.id));
    }
    });
    setSelectedSlots([...new Set(existingSlots)]); // Prevents duplicates
    setViewMode('FORM');
  };

  const addExperience = () => setExperiences([...experiences, { academicYear: dynamicYears[0], semester: 'ODD', subject: '' }]);    
  const removeExperience = (idx: number) => setExperiences(experiences.filter((_, i) => i !== idx));
  const updateExperience = (idx: number, field: keyof Exp, val: string) => {
    const newExp = [...experiences];
    newExp[idx] = { ...newExp[idx], [field]: val };
    setExperiences(newExp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !rollNo || !cgpa || !yearOfStudy) {
        return setModal({ isOpen: true, type: 'alert', title: 'Missing Info', message: 'Please fill all required fields.' });
    }
    const parsedCgpa = parseFloat(cgpa);
    if (parsedCgpa < 0 || parsedCgpa > 10) {
        return setModal({ isOpen: true, type: 'alert', title: 'Invalid CGPA', message: 'CGPA must be between 0 and 10.' });
    }
    if (selectedSlots.length === 0) {
        return setModal({ isOpen: true, type: 'alert', title: 'No Labs Selected', message: 'You must select at least one lab slot.' });
    }

    const missingGrades = selectedSlots
      .map(sid => labs.find(lab => lab.id === sid))
      .filter(Boolean)
      .filter(lab => !grades.find(g => g.subject === lab!.subject && g.grade));

    if (missingGrades.length > 0) {
      const missingSubjects = [...new Set(missingGrades.map(l => l!.subject))].join(", ");
      return setModal({ isOpen: true, type: 'alert', title: 'Missing Grades', message: `You must submit a grade for: ${missingSubjects} before applying for its slots.` });
    }

    const validExp = experiences.filter(e => e.subject.trim() !== "");

    setLoading(true);
    const availPayload = selectedSlots.map(sid => {
        const l = labs.find(lab => lab.id === sid);
        return l ? { labId: l.id, day: l.day, startTime: l.startTime, endTime: l.endTime } : null;
    }).filter(Boolean);

    const res = await api.submitStudentData({
      name, rollNo, cgpa: parsedCgpa, yearOfStudy, grades,
      availability: availPayload,
      experiences: validExp
    });
    setLoading(false);

    if (res.success) {
      setModal({
          isOpen: true, type: 'alert', title: 'Success!', message: 'Application Saved Successfully!', 
          onConfirm: () => window.location.reload() 
      });
    } else {
      setModal({ isOpen: true, type: 'alert', title: 'Submission Failed', message: res.message || "Failed to submit application." });
    }
  };

  const handleWithdrawSlot = (slotId: number) => {
      setModal({
          isOpen: true, type: 'confirm', title: 'Remove Request', message: 'Remove this specific lab slot request?',
          onConfirm: async () => {
              const res = await api.withdrawApplication({ rollNo, availabilityId: slotId });
              if (res.success) {
                  window.location.reload();
              } else {
                  setModal({ isOpen: true, type: 'alert', title: 'Error', message: res.message || "Could not remove slot." });
              }
          }
      });
  };

  const handleWithdrawFull = () => {
      setModal({
          isOpen: true, type: 'confirm', title: 'Withdraw Application', 
          message: 'DANGER: Withdraw ENTIRE Application? This cannot be undone and you will lose all requested slots.',
          onConfirm: async () => {
              const res = await api.withdrawApplication({ rollNo });
              if (res.success) window.location.reload();
          }
      });
  };

  const fmt = (t: number) => { const s = t.toString().padStart(4, '0'); return `${s.slice(0, 2)}:${s.slice(2)}`; };
  
  // Auto-clears orphaned grades if a student unchecks the lab
  const toggleSlot = (id: string) => {
      setSelectedSlots(prev => {
          if (prev.includes(id)) {
              const newSlots = prev.filter(x => x !== id);
              const removedLab = labs.find(l => l.id === id);
              if (removedLab) {
                  const hasOtherSlotsForSubject = newSlots.some(slotId => {
                      const otherLab = labs.find(l => l.id === slotId);
                      return otherLab && otherLab.subject === removedLab.subject;
                  });
                  // If no other slots for this subject are selected, wipe the grade to keep UI clean
                  if (!hasOtherSlotsForSubject) {
                      setGrades(gPrev => gPrev.filter(g => g.subject !== removedLab.subject));
                  }
              }
              return newSlots;
          } else {
              return [...prev, id];
          }
      });
  };

  const handleGrade = (sub: string, g: string) => setGrades(p => { const f = p.filter(x => x.subject !== sub); return g ? [...f, { subject: sub, grade: g }] : f; });

  if (initializing) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">Securely loading your profile...</div>;

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-12 px-4 font-sans text-gray-900 relative">
        
        {/* --- GLOBAL TAILWIND MODAL --- */}
        {modal && modal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95">
                    <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${modal.title.includes('DANGER') || modal.title.includes('Error') ? 'text-red-600' : 'text-gray-900'}`}>
                        {modal.title}
                    </h3>
                    <p className="text-sm font-bold text-gray-500 mb-6 leading-relaxed">{modal.message}</p>

                    <div className="flex gap-3 justify-end">
                        {modal.type === 'confirm' && (
                            <button onClick={closeModal} className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
                                Cancel
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if (modal.onConfirm) modal.onConfirm();
                                closeModal();
                            }}
                            className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${modal.title.includes('DANGER') ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-[#005a9c] hover:bg-blue-800 shadow-blue-900/30'}`}
                        >
                            {modal.type === 'alert' ? 'Okay' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        )}

      {viewMode === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-[#005a9c] p-5 sm:p-8 mb-6 sm:mb-10 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-2xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">My Dashboard</h1>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                {studentData?.name} • APPLYING FOR: {semester} SEMESTER {academicYear}
                </p>
            </div>
            <div className="flex gap-3 flex-wrap">
                {isWindowOpen && !isSystemConfirmed && labs.length > 0 && (
                <button onClick={handleEditClick} className="flex-1 sm:flex-none bg-white text-[#005a9c] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-gray-100 transition-all text-center">
                    Update Application
                </button>
                )}
                {!isSystemConfirmed && isWithdrawOpen && (
                <button onClick={handleWithdrawFull} className="flex-1 sm:flex-none bg-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-red-700 transition-all text-center">
                    Withdraw All
                </button>
                )}
            </div>
            </div>

            {studentData?.isBlacklisted && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 p-5 rounded-2xl mb-6 shadow-sm flex items-center gap-4">
                    <svg className="w-8 h-8 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                        <span className="block font-black text-sm uppercase tracking-widest mb-0.5">Account Restricted</span>
                        <span className="text-xs font-bold opacity-80">You have been globally restricted from TA allocations. Please contact administration.</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-200">
                <h3 className="font-black text-gray-800 mb-4 text-sm uppercase tracking-widest">Experience & Grades</h3>
                <div className="space-y-6">
                <div>
                    <span className="text-xs font-bold text-gray-400 block mb-2">GRADES</span>
                    <div className="flex flex-wrap gap-2">
                    {studentData?.student_grades.map((g, i) => (
                        <span key={i} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold uppercase text-gray-700">
                        {g.subject}: <span className="text-blue-600">{g.grade}</span>
                        </span>
                    ))}
                    </div>
                </div>
                <div>
                    <span className="text-xs font-bold text-gray-400 block mb-2">PREVIOUS TA EXP</span>
                    <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {studentData?.student_experiences?.length ? studentData.student_experiences.map((e, i) => (
                        <div key={i} className="text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-blue-700 font-black">{e.subject}</span>
                        <div className="text-xs text-gray-400 font-normal mt-1">{e.academicYear} ({e.semester})</div>
                        </div>
                    )) : <span className="text-sm italic text-gray-400 bg-gray-50 px-3 py-2 rounded-lg block">None</span>}
                    </div>
                </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-200">
                <h3 className="font-black text-gray-800 mb-6 text-sm uppercase tracking-widest">Requested Slots</h3>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {studentData?.student_availabilities.map((a: any, i) => {
                    // Find the exact lab by ID first! Fallback to time-matching only for older legacy data.
                    const labInfo = labs.find(l => 
                        a.labId ? l.id === a.labId : (l.day === a.day && Number(l.startTime) === Number(a.startTime) && Number(l.endTime) === Number(a.endTime)));

                    const isAllocated = studentData.allocations?.some((alloc: any) =>
                    (labInfo && alloc.labId === labInfo.id)
                    );

                    const showBadge = isAllocated && isSystemConfirmed;

                    return (
                    <div key={i} className={`p-4 sm:p-5 rounded-2xl border transition-all group relative ${isAllocated ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-blue-200'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                            <div className={`font-black text-xl sm:text-2xl tracking-tight ${showBadge ? 'text-green-800' : 'text-blue-900'}`}>
                                {labInfo ? labInfo.subject : "Custom / Removed"}
                                
                                {/* Student sees Local Ban Badge */}
                                {!studentData.isBlacklisted && studentData.lab_blacklists?.some((b: any) => labInfo && b.labId === labInfo.id) && (
                                    <span className="ml-3 align-middle bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
                                        Restricted
                                    </span>
                                )}
                            </div>
                            {showBadge && (
                                <span className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider shadow-sm animate-pulse">
                                ✓ Confirmed
                                </span>
                            )}
                            </div>
                            <div className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 inline-block px-3 py-1 rounded-lg border border-blue-100 mt-2 shadow-sm flex items-center gap-1 w-max">
                              {labInfo?.venue || "TBD"}
                            </div>
                        </div>
                        {!showBadge && !isSystemConfirmed && isWithdrawOpen && (
                            <button
                            onClick={() => handleWithdrawSlot(a.id)}
                            className="flex-shrink-0 bg-white text-gray-300 p-2.5 sm:p-3 rounded-xl border border-transparent hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm"
                            title="Remove request"
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        )}
                        </div>
                        <div className="mt-3 sm:text-right">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">{a.day}</div>
                        <div className="text-lg sm:text-xl font-black font-mono text-gray-800">{fmt(a.startTime)} - {fmt(a.endTime)}</div>
                        </div>
                    </div>
                    );
                })}

                {studentData?.student_availabilities.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8 italic border-2 border-dashed border-gray-100 rounded-xl">No slots selected.</div>
                )}
                </div>
            </div>
            </div>
          </div>
      )}

      {viewMode === 'CLOSED' && (
        <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100 text-center max-w-lg w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter mb-2">Portal Closed</h1>
                <p className="text-gray-500 text-sm font-bold leading-relaxed">{portalMsg}</p>
            </div>
        </div>
      )}

      {viewMode === 'FORM' && (
          <div className="space-y-10">
            <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-[#005a9c] p-5 sm:p-8 text-white flex justify-between items-center gap-4 shadow-2xl">
            <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{isReturningUser ? 'Update' : 'New'} Application</h1>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mt-1 truncate">
                    {rollNo} • APPLYING FOR: {semester} SEMESTER {academicYear}
                </p>
            </div>
            {isReturningUser && <button onClick={() => setViewMode('DASHBOARD')} className="flex-shrink-0 text-xs font-bold underline hover:text-gray-200">Cancel</button>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
            {/* PERSONAL DETAILS */}
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Name</label>
                <input className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm font-bold" value={name} readOnly />
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Roll No</label>
                <input className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm font-bold" value={rollNo} readOnly />
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">CGPA</label>
                <input 
                    type="number" min="0" max="10" step="0.01" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={cgpa} onChange={e => setCgpa(e.target.value)} required 
                />
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Year of Study</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)} required>
                    <option value="" disabled>Select Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year / Dual Degree">5th Year / Dual Degree</option>
                </select>
                </div>
            </div>

            {/* EXPERIENCE */}
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Previous TA Experience</h3>
                <button type="button" onClick={addExperience} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-[10px] font-black hover:bg-green-200 transition-colors">+ ADD ROW</button>
                </div>
                <div className="space-y-3">
                {experiences.map((exp, idx) => (
                    <div key={idx} className="grid grid-cols-2 sm:flex gap-2 sm:gap-4 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <select className="bg-white border rounded-lg px-2 sm:px-3 py-2 text-xs font-bold outline-none" value={exp.academicYear} onChange={e => updateExperience(idx, 'academicYear', e.target.value)}>
                        {dynamicYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <select className="bg-white border rounded-lg px-2 sm:px-3 py-2 text-xs font-bold outline-none" value={exp.semester} onChange={e => updateExperience(idx, 'semester', e.target.value)}>
                        <option>ODD</option><option>EVEN</option>
                    </select>
                    <input className="col-span-2 sm:flex-1 bg-white border rounded-lg px-3 py-2 text-xs font-bold uppercase outline-none" placeholder="Subject (e.g. CS101)" value={exp.subject} onChange={e => updateExperience(idx, 'subject', e.target.value)} />
                    <button type="button" onClick={() => removeExperience(idx)} className="col-span-2 sm:col-auto text-red-400 font-bold hover:text-red-600 px-2 text-lg text-right sm:text-left">×</button>
                    </div>
                ))}
                {experiences.length === 0 && <div className="text-center text-xs text-gray-400 italic py-4">No previous experience added.</div>}
                </div>
            </div>

            {/* SUBJECT GRADES */}
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Subject Grades</h3>
                <div className="relative">
                    <input
                    type="text"
                    placeholder="Search Subjects..."
                    value={searchGradeQuery}
                    onChange={(e) => setSearchGradeQuery(e.target.value)}
                    className="w-full sm:w-64 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none pl-10 transition-all"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                    const filtered = uniqueSubjects.filter(sub => sub.toLowerCase().includes(searchGradeQuery.toLowerCase()));
                    const displayed = (showAllSubjects || searchGradeQuery) ? filtered : filtered.slice(0, 6);

                    if (filtered.length === 0) {
                    return <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center text-xs text-gray-400 py-10 italic">No matching subjects found.</div>;
                    }

                    return (
                    <>
                        {displayed.map(sub => {
                        const currentGrade = grades.find(g => g.subject === sub)?.grade || "";
                        return (
                            <div key={sub} className="p-5 border border-gray-100 rounded-[1.5rem] bg-gray-50 hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                            <div className="font-black text-sm mb-4 uppercase text-gray-800 tracking-wide">{sub}</div>
                            <div className="flex flex-wrap gap-2">
                                {['A', 'AB', 'B'].map(g => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => handleGrade(sub, currentGrade === g ? "" : g)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${currentGrade === g ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}
                                >
                                    {g}
                                </button>
                                ))}
                            </div>
                            </div>
                        );
                        })}
                        {!searchGradeQuery && filtered.length > 6 && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-center mt-2">
                            <button type="button" onClick={() => setShowAllSubjects(!showAllSubjects)} className="bg-blue-50 text-blue-600 font-bold text-xs uppercase px-6 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                            {showAllSubjects ? "Show Less" : `+ Show ${filtered.length - 6} More Subjects`}
                            </button>
                        </div>
                        )}
                    </>
                    );
                })()}
                </div>
            </div>

            {/* AVAILABILITY */}
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between mb-8 lg:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest min-w-max">Duty Availability</h3>
                    <div className="relative">
                    <input
                        type="text"
                        placeholder="Filter Subjects..."
                        value={searchAvailabilityQuery}
                        onChange={(e) => setSearchAvailabilityQuery(e.target.value)}
                        className="w-full sm:w-48 lg:w-64 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none pl-10 transition-all"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                    </div>
                </div>

                <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner overflow-x-auto custom-scrollbar">
                    {days.map(d => (
                    <button key={d} type="button" onClick={() => setActiveDay(d)} className={`px-5 py-2 text-[11px] font-black rounded-xl transition-all uppercase tracking-widest whitespace-nowrap ${activeDay === d ? 'bg-white shadow-md text-blue-900 border border-gray-200' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>{d}</button>
                    ))}
                </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                    const filtered = subjectsForDay.filter(sub => sub.toLowerCase().includes(searchAvailabilityQuery.toLowerCase()));
                    const displayed = (showAllLabs || searchAvailabilityQuery) ? filtered : filtered.slice(0, 6);

                    if (filtered.length === 0) {
                    return (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center text-xs text-gray-400 py-10 italic">
                        {subjectsForDay.length === 0 ? `No labs available on ${activeDay}.` : "No matching labs found."}
                        </div>
                    );
                    }

                    return (
                    <>
                        {displayed.map(sub => (
                        <div key={sub} className="border border-gray-100 p-5 rounded-3xl bg-gray-50/50">
                            <div className="font-black text-xs mb-4 text-blue-900 bg-blue-50 inline-block px-3 py-1.5 rounded-lg border border-blue-100">{sub}</div>
                            <div className="space-y-3">
                            {daysLabs.filter(l => l.subject === sub).map(s => (
                                <button key={s.id} type="button" onClick={() => toggleSlot(s.id)} className={`w-full text-left p-4 rounded-2xl text-xs font-bold border transition-all duration-200 group flex justify-between items-center ${selectedSlots.includes(s.id) ? 'bg-[#005a9c] text-white border-[#005a9c] shadow-lg transform scale-[1.02]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#005a9c] hover:shadow-md'}`}>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] uppercase tracking-widest mb-1 font-black ${selectedSlots.includes(s.id) ? 'text-blue-200' : 'text-gray-400 group-hover:text-blue-400'}`}>Time</span>
                                    <span className="text-sm tracking-tight">{fmt(s.startTime)} - {fmt(s.endTime)}</span>
                                </div>
                                <div className={`p-2 rounded-full transition-all ${selectedSlots.includes(s.id) ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-blue-50'}`}>
                                    {selectedSlots.includes(s.id) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 group-hover:text-blue-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                    )}
                                </div>
                                </button>
                            ))}
                            </div>
                        </div>
                        ))}
                        {!searchAvailabilityQuery && filtered.length > 6 && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex justify-center mt-4">
                            <button type="button" onClick={() => setShowAllLabs(!showAllLabs)} className="bg-blue-50 text-blue-600 font-bold text-xs uppercase px-6 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                            {showAllLabs ? "Show Less" : `+ Show ${filtered.length - 6} More Labs`}
                            </button>
                        </div>
                        )}
                    </>
                    );
                })()}
                </div>
            </div>

            <div className="flex flex-col sm:items-end gap-3">
                <button type="submit" disabled={loading} className="w-full sm:w-auto bg-[#e35205] text-white px-10 sm:px-12 py-4 rounded-[2rem] font-black shadow-xl text-xs uppercase hover:bg-[#c94600] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> Processing...</>
                ) : (isReturningUser ? 'Update Application' : 'Submit Application')}
                </button>
            </div>
            </form>
          </div>
      )}
    </div>
  );
};

export default StudentPortal;