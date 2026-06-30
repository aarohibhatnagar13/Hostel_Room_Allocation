import React, { useState, useEffect } from 'react';
import DatePicker from "react-datepicker";
import { CustomSelect } from "../components/CustomSelect";
import "react-datepicker/dist/react-datepicker.css";
import { api } from '../services/api';

// ─── Audit Info Popover (tap-friendly for mobile) ────────────────────────────
const AuditBadge: React.FC<{ label: string; color: 'red' | 'orange'; blacklistedBy: string | null; blacklistedAt: string | null; formatDate: (d: string | null) => string }> = ({ label, color, blacklistedBy, blacklistedAt, formatDate }) => {
    const [open, setOpen] = useState(false);
    const base = color === 'red'
        ? 'bg-red-50 text-red-600 border-red-200'
        : 'bg-orange-50 text-orange-600 border-orange-200';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className={`${base} px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${color === 'red' ? 'animate-pulse' : ''}`}
            >
                {label}
            </button>
            {open && blacklistedBy && (
                <>
                    {/* Backdrop to close on tap-outside */}
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 z-30 bg-gray-900 text-white text-[10px] font-bold rounded-xl px-3 py-2 shadow-xl min-w-[160px]">
                        <p>By: {blacklistedBy}</p>
                        <p className="text-gray-400 mt-0.5">{formatDate(blacklistedAt)}</p>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const AdminAttendance = () => {
    const [labs, setLabs] = useState<any[]>([]);
    const [selectedLabId, setSelectedLabId] = useState<string>('');
    const [labSearch, setLabSearch] = useState<string>('');
    // The India Timezone Trap
    // Gets the correct local date string (YYYY-MM-DD) relative to the user's actual timezone
    const getLocalDateString = () => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString);

    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const adminEmail = sessionStorage.getItem('adminEmail') || 'admin@lnmiit.ac.in';
    const [availableTerms, setAvailableTerms] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSem, setSelectedSem] = useState<string>('');
    const [currentSystemTerm, setCurrentSystemTerm] = useState({ year: '', sem: '' });
    useEffect(() => {
        api.getTerms().then(res => { if (res.success) setAvailableTerms(res.data); });
        api.getSettings().then(res => { 
            if(res) {
                setCurrentSystemTerm({ year: res.currentAcademicYear, sem: res.currentSemester });
            }
        });
    }, []);

    useEffect(() => {
        api.getLabs(1, 100, undefined, undefined, undefined, selectedYear, selectedSem).then(res => { 
            if (res.success) setLabs(res.data); 
        });
    }, [selectedYear, selectedSem]);

    useEffect(() => {
        if (!selectedLabId || !selectedDate) return;
        setIsLoading(true);
        api.getAttendance(selectedLabId, selectedDate, selectedYear, selectedSem)
            .then(res => { if (res.success) setAttendanceData(res.data); else alert("Failed to fetch attendance."); })
            .catch(() => alert("Network error fetching attendance."))
            .finally(() => setIsLoading(false));
    }, [selectedLabId, selectedDate, selectedYear, selectedSem]);


    const handleStatusToggle = (studentId: string, status: 'Present' | 'Absent') => {
        setAttendanceData(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
    };


    const handleSaveAttendance = async () => {
        if (!selectedLabId || !selectedDate) return;
        const valid = attendanceData.filter(r => r.status !== null);
        if (!valid.length) return alert("Nothing to save.");
        setIsSaving(true);
        try {
            const res = await api.saveAttendance(selectedLabId, selectedDate, valid);
            alert(res.success ? "Attendance Saved!" : "Failed: " + res.message);
        } catch { alert("Network error while saving."); }
        finally { setIsSaving(false); }
    };

    const handleExportCSV = async () => {
        if (!selectedLabId) return alert("Please select a lab first.");
        setIsLoading(true);
        try {
            const targetYear = selectedYear || currentSystemTerm.year;
            const targetSem = selectedSem || currentSystemTerm.sem;

            const res = await api.exportLabAttendance(selectedLabId, targetYear, targetSem);
            
            // 1. Strictly verify response
            if (!res || !res.success) {
                throw new Error(res?.message || "Invalid response from server.");
            }

            // 2. Guarantee arrays exist (Bypasses the "length" crash)
            const dataArray = Array.isArray(res.data) ? res.data : [];
            const datesArray = Array.isArray(res.uniqueDates) ? res.uniqueDates : [];

            if (dataArray.length === 0) {
                return alert("No TAs allocated to this lab.");
            }

            // 3. Build CSV using safe, strict for-loops instead of .forEach()
            let header = "Roll Number,Student Name";
            for (let i = 0; i < datesArray.length; i++) {
                header += `,${datesArray[i]}`;
            }
            let csv = header + "\n";

            for (let i = 0; i < dataArray.length; i++) {
                const row = dataArray[i] || {};
                const roll = row.rollNo || 'N/A';
                const name = row.studentName || 'Unknown';
                csv += `"${roll}","${name}"`;
                
                for (let j = 0; j < datesArray.length; j++) {
                    const d = datesArray[j];
                    const status = row[d] || 'Absent';
                    csv += `,${status}`;
                }
                csv += "\n";
            }

            // 4. Trigger download safely
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TA_Attendance_${selectedLabId}_${targetSem}_${targetYear}.csv`;
            document.body.appendChild(a); // Required for Firefox compatibility
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (e: any) { 
            console.error("CSV Export Error:", e);
            alert("Error exporting CSV: " + (e.message || "An unexpected error occurred.")); 
        }
        finally { setIsLoading(false); }
    };

    const formatAuditDate = (dt: string | null) => {
        if (!dt) return '';
        return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    };

    return (
        <>
            <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-10">

                {/* Page Header */}
                <div className="relative z-50">
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-[#005a9c] tracking-tighter uppercase mb-1.5 drop-shadow-sm leading-tight">
                        Attendance <span className="text-gray-900">Tracker</span>
                    </h1>
                    <p className="text-[#005a9c]/70 font-bold uppercase tracking-widest text-[10px] border-l-4 border-[#005a9c] pl-3 ml-0.5 py-0.5">Record Teaching Assistant Availability</p>
                    <div className="flex items-center gap-3 mt-4">
                        {(selectedYear && (selectedYear !== currentSystemTerm.year || selectedSem !== currentSystemTerm.sem)) && 
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-200">Read-Only History</span>
                        }
                        <CustomSelect 
                            value={`${selectedYear || currentSystemTerm.year}|${selectedSem || currentSystemTerm.sem}`}
                            onChange={(val) => {
                                const [y, s] = val.split('|');
                                setSelectedYear(y); setSelectedSem(s);
                                setSelectedLabId(''); 
                            }}
                            className="bg-white border-2 border-gray-200 text-[#005a9c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2 hover:border-[#005a9c] shadow-sm min-w-[200px]"
                            options={[
                                { value: `${currentSystemTerm.year}|${currentSystemTerm.sem}`, label: `ACTIVE: ${currentSystemTerm.sem} ${currentSystemTerm.year}` },
                                ...availableTerms.map(t => ({ value: `${t.academicYear}|${t.semester}`, label: `HISTORY: ${t.semester} ${t.academicYear}` }))
                            ]}
                        />
                    </div>
                </div>

                {/* Config Area */}
                <div className="bg-gradient-to-br from-white to-blue-50/30 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[3rem] border-4 border-[#005a9c]/10 shadow-[0_20px_40px_-15px_rgba(0,90,156,0.1)] space-y-5 relative">
                    <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-[3rem] pointer-events-none">
                        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-[#005a9c]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                        {/* Lab Dropdown */}
                        <div className="space-y-2 sm:space-y-4 relative z-20">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#005a9c]/60">Target Lab Slot</label>
                            <div className="relative group/dropdown">
                                <input
                                    type="text"
                                    placeholder="Search & Select Lab Slot..."
                                    className="w-full bg-white p-4 sm:p-6 text-sm font-bold text-gray-800 rounded-xl sm:rounded-2xl border-2 border-gray-100 focus:border-[#005a9c] outline-none transition-all shadow-sm pr-10"
                                    value={labSearch}
                                    onChange={(e) => { setLabSearch(e.target.value); if (selectedLabId) setSelectedLabId(''); }}
                                    onFocus={(e) => e.target.select()}
                                />
                                <svg className="w-4 h-4 text-[#005a9c]/40 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                                <div className="absolute left-0 right-0 top-[105%] bg-white border-2 border-gray-100 rounded-xl sm:rounded-2xl shadow-2xl max-h-60 overflow-y-auto hidden group-focus-within/dropdown:block custom-scrollbar z-50">
                                    {(() => {
                                        const filtered = selectedLabId ? labs : labs.filter(l => `${l.id} | ${l.subject} | ${l.venue || 'TBD'} | ${l.day} ${l.startTime}`.toLowerCase().includes(labSearch.toLowerCase()));
                                        if (!filtered.length) return <div className="p-5 text-center text-sm font-bold text-gray-400">No matching labs.</div>;
                                        return filtered.map(lab => (
                                            <button key={lab.id} type="button"
                                                className={`w-full text-left p-4 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex flex-col ${selectedLabId === lab.id.toString() ? 'bg-blue-50/50' : ''}`}
                                                onMouseDown={(e) => { e.preventDefault(); setSelectedLabId(lab.id.toString()); setLabSearch(`${lab.subject} | ${lab.venue || 'TBD'} | ${lab.day} ${lab.startTime}`); (document.activeElement as HTMLElement)?.blur(); }}
                                            >
                                                <span className={`font-black text-sm ${selectedLabId === lab.id.toString() ? 'text-[#005a9c]' : 'text-gray-800'}`}>{lab.subject} | <span className="text-blue-600">{lab.venue || 'TBD'}</span></span>
                                                <span className="text-xs text-gray-400 font-mono mt-0.5">{lab.day} {lab.startTime}</span>
                                            </button>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Date Picker -> Session Dropdown */}
                        <div className="space-y-2 sm:space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#005a9c]/60">Session Date</label>
                            <div className="relative">
                                <DatePicker
                                    selected={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
                                    onChange={(date: Date | null) => {
                                        if (date) {
                                            const y = date.getFullYear();
                                            const m = String(date.getMonth() + 1).padStart(2, '0');
                                            const d = String(date.getDate()).padStart(2, '0');
                                            setSelectedDate(`${y}-${m}-${d}`);
                                        }
                                    }}
                                    dateFormat="MMMM d, yyyy"
                                    maxDate={new Date(new Date().setHours(23, 59, 59, 999))}
                                    placeholderText="Select Date"
                                    className="w-full bg-white p-4 sm:p-6 text-sm font-bold text-gray-800 rounded-xl sm:rounded-2xl border-2 border-gray-100 focus:border-[#005a9c] outline-none transition-all shadow-sm cursor-pointer"
                                    fixedHeight
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="scroll"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {selectedLabId && selectedDate ? (
                    <div className="bg-white rounded-2xl sm:rounded-[2rem] border-4 border-[#005a9c]/5 shadow-xl overflow-hidden">
                        {isLoading ? (
                            <div className="py-20 text-center font-black uppercase text-[#005a9c]/40 tracking-widest animate-pulse flex flex-col items-center justify-center gap-4">
                                <div className="w-8 h-8 border-4 border-[#005a9c]/20 border-t-[#005a9c] rounded-full animate-spin" />
                                Syncing Registry...
                            </div>
                        ) : attendanceData.length === 0 ? (
                            <div className="py-16 px-6 text-center font-black uppercase text-gray-300 tracking-widest m-4 sm:m-8 rounded-xl bg-gray-50/50 border-2 border-dashed border-gray-100">
                                No TAs Allotted to this Slot.
                            </div>
                        ) : (
                            <>
                                {/* ── Desktop Table (hidden on small screens) ── */}
                                <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#005a9c] text-white">
                                                <th className="p-5 text-[10px] font-black tracking-widest uppercase w-1/2">Student / TA Name</th>
                                                <th className="p-5 text-[10px] font-black tracking-widest uppercase text-center w-1/2">Mark Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceData.map((record, idx) => (
                                                <tr key={record.studentId} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-black text-gray-900">{record.studentName}</span>
                                                            {record.isBlacklisted && (
                                                                <AuditBadge label="Blacklisted (All)" color="red" blacklistedBy={record.blacklistedBy} blacklistedAt={record.blacklistedAt} formatDate={formatAuditDate} />
                                                            )}
                                                            {!record.isBlacklisted && record.isLabBlacklisted && (
                                                                <AuditBadge label="Lab Blacklisted" color="orange" blacklistedBy={record.blacklistedBy} blacklistedAt={record.blacklistedAt} formatDate={formatAuditDate} />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <span className="text-sm text-[#005a9c] font-mono font-bold">{record.rollNo}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex justify-center gap-3">
                                                            <button 
                                                                onClick={() => handleStatusToggle(record.studentId, 'Present')}
                                                                disabled={record.isBlacklisted || record.isLabBlacklisted}
                                                                className={`flex-1 max-w-[110px] py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                                                                    (record.isBlacklisted || record.isLabBlacklisted)
                                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                                                                        : record.status === 'Present' 
                                                                            ? 'bg-green-500 text-white shadow-green-500/30 shadow-md' 
                                                                            : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                                                                }`}
                                                            >
                                                                Present
                                                            </button>
                                                            <button 
                                                                onClick={() => handleStatusToggle(record.studentId, 'Absent')}
                                                                disabled={record.isBlacklisted || record.isLabBlacklisted}
                                                                className={`flex-1 max-w-[110px] py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                                                                    (record.isBlacklisted || record.isLabBlacklisted)
                                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                                                                        : record.status === 'Absent' 
                                                                            ? 'bg-red-500 text-white shadow-red-500/30 shadow-md' 
                                                                            : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600'
                                                                }`}
                                                            >
                                                                Absent
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── Mobile Card List (shown only on small screens) ── */}
                                <div className="sm:hidden divide-y divide-gray-50">
                                    {attendanceData.map((record, idx) => (
                                        <div key={record.studentId} className={`p-4 space-y-3 ${idx % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                                            {/* Student info row */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-black text-gray-900 text-base leading-tight truncate">{record.studentName}</div>
                                                    <div className="text-xs text-[#005a9c] font-mono font-bold mt-0.5">{record.rollNo}</div>
                                                    {/* Badges */}
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {record.isBlacklisted && (
                                                            <AuditBadge label="All Labs" color="red" blacklistedBy={record.blacklistedBy} blacklistedAt={record.blacklistedAt} formatDate={formatAuditDate} />
                                                        )}
                                                        {!record.isBlacklisted && record.isLabBlacklisted && (
                                                            <AuditBadge label="This Lab" color="orange" blacklistedBy={record.blacklistedBy} blacklistedAt={record.blacklistedAt} formatDate={formatAuditDate} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Present / Absent buttons — full width on mobile */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => handleStatusToggle(record.studentId, 'Present')}
                                                    disabled={record.isBlacklisted || record.isLabBlacklisted}
                                                    className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                                                        (record.isBlacklisted || record.isLabBlacklisted)
                                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                                                            : record.status === 'Present' 
                                                                ? 'bg-green-500 text-white shadow-green-500/20 shadow-md' 
                                                                : 'bg-gray-100 text-gray-400'
                                                    }`}
                                                >
                                                    Present
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusToggle(record.studentId, 'Absent')}
                                                    disabled={record.isBlacklisted || record.isLabBlacklisted}
                                                    className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                                                        (record.isBlacklisted || record.isLabBlacklisted)
                                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                                                            : record.status === 'Absent' 
                                                                ? 'bg-red-500 text-white shadow-red-500/20 shadow-md' 
                                                                : 'bg-gray-100 text-gray-400'
                                                    }`}
                                                >
                                                    Absent
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Export & Save Buttons */}
                                <div className="p-4 sm:p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-4">
                                    <button
                                        onClick={handleExportCSV}
                                        disabled={isLoading}
                                        className="w-full sm:w-auto bg-[#10b981] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#059669] transition-all shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        Download CSV
                                    </button>

                                    <button
                                        onClick={handleSaveAttendance}
                                        disabled={isSaving || (selectedYear !== '' && (selectedYear !== currentSystemTerm.year || selectedSem !== currentSystemTerm.sem))}
                                        className="w-full sm:w-auto bg-[#005a9c] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-[0_10px_20px_-10px_rgba(0,90,156,0.5)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isSaving ? (
                                            <><span>Saving</span><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /></>
                                        ) : <>Save Registry</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="py-16 px-6 text-center font-black uppercase text-[#005a9c]/20 tracking-[0.3em] sm:tracking-[0.5em] border-4 border-dashed border-[#005a9c]/10 rounded-2xl sm:rounded-[3rem] text-sm sm:text-base">
                        Select a target lab & session above
                    </div>
                )}
            </div>
        </>
    );
};
