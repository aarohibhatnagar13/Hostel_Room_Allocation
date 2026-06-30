import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Pagination } from "../components/Pagination";
import { CustomSelect } from "../components/CustomSelect";

// Prevents CSV Injection by adding an apostrophe before malicious starting characters
const sanitizeCSV = (str: string | number) => {
    if (!str) return 'N/A';
    const s = String(str);
    if (/^[=+\-@\t\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`; // Escapes dangerous starting characters
    }
    // Escape standard quotes for safe CSV formatting
    return `"${s.replace(/"/g, '""')}"`; 
};

export const AdminReports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10; // Items per page

    // Filter State
    const [filterSubject, setFilterSubject] = useState('ALL');
    const [filterDay, setFilterDay] = useState('ALL');
    const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);

    // Term State
    const [availableTerms, setAvailableTerms] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSem, setSelectedSem] = useState<string>('');
    const [currentSystemTerm, setCurrentSystemTerm] = useState({ year: '', sem: '' });

    // Fetch Term Data
    useEffect(() => {
        api.getTerms().then(res => { if (res.success) setAvailableTerms(res.data); });
        api.getSettings().then(res => { 
            if(res) {
                setCurrentSystemTerm({ year: res.currentAcademicYear, sem: res.currentSemester });
            }
        });
    }, []);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch paginated results based on current filters
                const res = await api.getAllocationResults(currentPage, limit, 'ALL', filterDay, filterSubject, selectedYear, selectedSem);
                if (res.success) {
                    setResults(res.data);
                    setTotalPages(res.lastPage);
                    setTotalItems(res.total);
                }

                // Fetch Labs to populate the Subject dropdown
                const labsRes = await api.getLabs(1, 1000, undefined, undefined, undefined, selectedYear, selectedSem);
                if (labsRes.success) {
                    const subjects = Array.from(new Set(labsRes.data.map((l: any) => l.subject))) as string[];
                    setUniqueSubjects(subjects);
                }
            } catch (err) {
                console.error("Error fetching reports:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentPage, filterSubject, filterDay, selectedYear, selectedSem]);

    // Handle Filters (Reset to page 1 when filter changes)
    const handleSubjectChange = (val: string) => {
        setFilterSubject(val);
        setCurrentPage(1);
    }

    const handleDayChange = (val: string) => {
        setFilterDay(val);
        setCurrentPage(1);
    }

    const formatTime12h = (timeInt: number) => {
        if (!timeInt) return "00:00";
        const str = timeInt.toString().padStart(4, '0');
        let hours = parseInt(str.slice(0, 2));
        const minutes = str.slice(2);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours < 10 ? `0${hours}` : hours}:${minutes} ${ampm}`;
    };

   const handleExportCSV = async () => {
        try {
            // Fetch ALL records regardless of pagination for the CSV export
            const res = await api.getAllocationResults('all' as any, limit, 'ALL', filterDay, filterSubject, selectedYear, selectedSem);
            if (!res.success || res.data.length === 0) return alert("No data available to export.");

            let csv = "Round,Student Name,Roll Number,CGPA,Grade,Lab ID,Subject,Venue,Day,Timings\n";
            
            res.data.forEach((r: any) => {
                // Find the specific grade the student got for this allocated subject
                const grades = r.student.student_grades || [];
                const record = grades.find((g: any) => g.subject === r.lab.subject);
                const actualGrade = record ? record.grade : 'N/A';

                // Safely build the CSV row using sanitizeCSV
                csv += `${r.round},${sanitizeCSV(r.student.name)},${sanitizeCSV(r.student.rollNo)},${r.student.cgpa},${sanitizeCSV(actualGrade)},${sanitizeCSV(r.lab.id)},${sanitizeCSV(r.lab.subject)},${sanitizeCSV(r.lab.venue || 'TBD')},${sanitizeCSV(r.lab.day)},${formatTime12h(r.lab.startTime)}-${formatTime12h(r.lab.endTime)}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Sanitize the subject string to prevent OS Directory Crashes (e.g. C/C++ -> C_C++)
            const safeSubject = (filterSubject === 'ALL' ? 'All_Subjects' : filterSubject).replace(/[\/\\]/g, '_');
            const safeDay = filterDay === 'ALL' ? 'All_Days' : filterDay;
            
            a.download = `TA_Report_${safeSubject}_${safeDay}.csv`;
            a.click();
        } catch (e) {
            alert("Export failed.");
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 font-sans text-gray-900 bg-gray-50/20 min-h-screen">
            
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6 relative z-50">
                <div>
                    <h1 className="text-4xl font-black text-[#005a9c] tracking-tighter uppercase">TA Reports</h1>
                    <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-500 inline-block"></span> Allocation Matrix & Data Export
                    </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-4 w-full sm:w-auto">
                    {/* TERM SELECTOR */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {selectedYear && selectedYear !== currentSystemTerm.year && (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-200">Read-Only History</span>
                        )}
                        <CustomSelect
                            value={`${selectedYear || currentSystemTerm.year}|${selectedSem || currentSystemTerm.sem}`}
                            onChange={(val) => {
                                const [y, s] = val.split('|');
                                setSelectedYear(y); setSelectedSem(s);
                            }}
                            className="bg-white border-2 border-gray-200 text-[#005a9c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2 hover:border-[#005a9c] transition-all shadow-sm w-full sm:w-auto min-w-[200px]"
                            options={[
                                { value: `${currentSystemTerm.year}|${currentSystemTerm.sem}`, label: `ACTIVE: ${currentSystemTerm.sem} ${currentSystemTerm.year}` },
                                ...availableTerms.map(t => ({ value: `${t.academicYear}|${t.semester}`, label: `HISTORY: ${t.semester} ${t.academicYear}` }))
                            ]}
                        />
                    </div>
                    
                    <button 
                        onClick={handleExportCSV}
                        className="bg-[#005a9c] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-3 active:scale-95 w-full sm:w-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        Download CSV
                    </button>
                </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-blue-50 mb-8 flex flex-col sm:flex-row gap-8 items-center">
                <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3 ml-2">Subject Array</label>
                    <CustomSelect 
                        value={filterSubject} 
                        onChange={handleSubjectChange} 
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl px-5 py-4 text-sm font-bold text-gray-700 outline-none transition-all cursor-pointer"
                        options={[
                            { value: 'ALL', label: 'All Subjects' },
                            ...uniqueSubjects.map(s => ({ value: s, label: s }))
                        ]}
                    />
                </div>
                
                <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3 ml-2">Day Array</label>
                    <CustomSelect 
                        value={filterDay} 
                        onChange={handleDayChange} 
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl px-5 py-4 text-sm font-bold text-gray-700 outline-none transition-all cursor-pointer"
                        options={[
                            { value: 'ALL', label: 'All Days' },
                            ...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => ({ value: d, label: d }))
                        ]}
                    />
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-2 bg-gray-50 p-6 border-b border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">TA Information</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Lab Assignment</div>
                </div>

                <div className="divide-y divide-gray-50">
                    {loading ? (
                        <div className="p-12 text-center text-sm font-bold text-blue-400 animate-pulse">Scanning ledgers...</div>
                    ) : results.length === 0 ? (
                        <div className="p-16 text-center text-sm font-black text-gray-300 uppercase tracking-widest">No Records Found</div>
                    ) : (
                        results.map((r, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-2 p-6 hover:bg-blue-50/30 transition-colors items-center gap-6 md:gap-0">
                                {/* Left Col: Student Info */}
                                <div className="pl-4">
                                    <div className="font-black text-gray-900 text-lg tracking-tight mb-1">{r.student.name}</div>
                                    <div className="text-xs text-blue-500 font-mono font-bold">{r.student.rollNo}</div>
                                </div>

                                {/* Right Col: Lab Info */}
                                <div className="pl-4 md:border-l border-gray-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-black text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs uppercase tracking-widest border border-green-100">{r.lab.subject}</span>
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">{r.lab.day}</span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">
                                        {formatTime12h(r.lab.startTime)} - {formatTime12h(r.lab.endTime)} <span className="text-gray-300 mx-2">•</span> {r.lab.id}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* PAGINATION COMPONENT */}
                {!loading && totalItems > 0 && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center">
                        <Pagination 
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={limit}
                            onPageChange={(newPage) => setCurrentPage(newPage)}
                        />
                    </div>
                )}
            </div>
            
        </div>
    );
};