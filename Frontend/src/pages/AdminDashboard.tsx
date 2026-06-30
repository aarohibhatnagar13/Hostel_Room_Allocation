import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import { TimePicker } from '../components/TimePicker';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CustomSelect } from '../components/CustomSelect';
import { useSearchParams } from 'react-router-dom';

// 1. SECURITY: Prevents CSV Injection
const sanitizeCSV = (str: string | number) => {
    if (!str) return 'N/A';
    const s = String(str);
    if (/^[=+\-@\t\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`; 
    }
    return `"${s.replace(/"/g, '""')}"`; 
};

// 2. SECURITY: Safely parses weird Excel fractional times into strict integers (e.g., 1030)
const parseExcelTime = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number' && val > 0 && val < 1) {
        const totalMinutes = Math.round(val * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return (hours * 100) + minutes;
    }
    if (typeof val === 'string' && val.includes(':')) {
        const match = val.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const ampm = match[3]?.toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return (h * 100) + m;
        }
    }
    const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
};

// --- MODAL TYPE DEFINITION ---
type ModalConfig = {
    isOpen: boolean;
    type: 'confirm' | 'prompt';
    title: string;
    message: string;
    expectedInput?: string;
    onConfirm: () => void;
};

export const AdminDashboard: React.FC = () => {
    // FIX 1: URL TAB SYNCING
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as 'allocate' | 'manage' | 'settings' | 'danger' | 'access') || 'allocate';
    const [blacklistScope, setBlacklistScope] = useState<'all' | 'lab'>('all');
    const [blacklistLabId, setBlacklistLabId] = useState('');

    const handleTabChange = (tab: string) => {
        setSearchParams({ tab });
    };

    // FIX 2: TAILWIND MODAL STATE
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [promptInput, setPromptInput] = useState('');
    const closeModal = () => { setModal(null); setPromptInput(''); };
    const [editLabForm, setEditLabForm] = useState<any>(null);

    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [globalSubjects, setGlobalSubjects] = useState<string[]>([]);

    const [settings, setSettings] = useState({
        acceptDataStart: 0, acceptDataEnd: 0, withdrawalStart: 0, withdrawalEnd: 0,
        isConfirmed: false, currentRound: 1, currentAcademicYear: '', currentSemester: ''
    });

    const [availableTerms, setAvailableTerms] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSem, setSelectedSem] = useState<string>('');
    
    const isPastTerm = Boolean(
        selectedYear && selectedSem && 
        (selectedYear !== settings.currentAcademicYear || selectedSem !== settings.currentSemester)
    );

    const [editingLabId, setEditingLabId] = useState<string | null>(null);
    const [filterDay, setFilterDay] = useState<string>('ALL');
    const [filterSubject, setFilterSubject] = useState<string>('ALL');
    const [viewRound, setViewRound] = useState<'ALL' | number>('ALL');

    const [results, setResults] = useState<any[]>([]);
    const [resultsPage, setResultsPage] = useState(1);
    const [resultsTotal, setResultsTotal] = useState(0);
    const [resultsLastPage, setResultsLastPage] = useState(1);

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [studentsPage, setStudentsPage] = useState(1);
    const [studentsTotal, setStudentsTotal] = useState(0);
    const [studentsLastPage, setStudentsLastPage] = useState(1);

    const [allLabs, setAllLabs] = useState<any[]>([]);
    const [labsPage, setLabsPage] = useState(1);
    const [labsTotal, setLabsTotal] = useState(0);
    const [labsLastPage, setLabsLastPage] = useState(1);

    const [unfulfilledLabs, setUnfulfilledLabs] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [editTimes, setEditTimes] = useState<Record<string, { start: number; end: number }>>({});
    const hasPendingAllocations = results.some(r => r.isPending === true);
    
    const [newLab, setNewLab] = useState({ subject: '', day: 'Mon', startTime: 900, endTime: 1200, capacity: 3, venue: '' });
    const [manualSelect, setManualSelect] = useState({ studentId: '', labId: '' });
    const [studentSearch, setStudentSearch] = useState('');
    const [isSearchingStudents, setIsSearchingStudents] = useState(false);

    const [blacklistSelect, setBlacklistSelect] = useState({ studentId: '' });
    const [blacklistSearch, setBlacklistSearch] = useState('');
    const [isSearchingBlacklist, setIsSearchingBlacklist] = useState(false);
    const [searchedBlacklistStudents, setSearchedBlacklistStudents] = useState<any[]>([]);

    const [searchedLabs, setSearchedLabs] = useState<any[]>([]);
    const [labSearch, setLabSearch] = useState('');
    const [isSearchingLabs, setIsSearchingLabs] = useState(false);
    
    const [vacanciesSearchQuery, setVacanciesSearchQuery] = useState('');
    const [vacanciesPage, setVacanciesPage] = useState(1);
    const [newManagerEmail, setNewManagerEmail] = useState('');
    const [isManagersLoading, setIsManagersLoading] = useState(false);

    const handleStudentSearch = (val: string) => setStudentSearch(val);
    const handleBlacklistSearch = (val: string) => setBlacklistSearch(val);
    const handleLabSearch = (val: string) => setLabSearch(val);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (studentSearch.length >= 2) {
                setIsSearchingStudents(true);
                const res = await api.getStudents(1, 50, studentSearch);
                if (res.success) { setAllStudents(res.data); setStudentsLastPage(1); }
                setIsSearchingStudents(false);
            } else if (studentSearch === '') {
                refreshData('students');
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [studentSearch]);
    useEffect(() => {
        // Fetch all labs once just to populate the filter dropdowns properly
        api.getLabs(1, 1000).then(res => {
            if (res.success && res.data) {
                const subjects = Array.from(new Set(res.data.map((l: any) => l.subject))) as string[];
                setGlobalSubjects(subjects);
            }
        });
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (blacklistSearch.length >= 2) {
                setIsSearchingBlacklist(true);
                const res = await api.getStudents(1, 50, blacklistSearch);
                if (res.success) setSearchedBlacklistStudents(res.data);
                setIsSearchingBlacklist(false);
            } else if (blacklistSearch === '') {
                setSearchedBlacklistStudents([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [blacklistSearch]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (labSearch.length >= 2) {
                setIsSearchingLabs(true);
                const res = await api.getLabs(1, 50, undefined, undefined, labSearch);
                if (res.success) setSearchedLabs(res.data);
                setIsSearchingLabs(false);
            } else if (labSearch === '') {
                setSearchedLabs(allLabs);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [labSearch, allLabs]);

    // THE ROGUE `};` WAS HERE! IT HAS BEEN DELETED!

    const refreshData = async (type: 'results' | 'students' | 'labs' | 'settings' | 'managers' | 'all' = 'all') => {
        try {
            const limit = 10;
            if (type === 'results' || type === 'all') {
                const res = await api.getAllocationResults(resultsPage, limit, viewRound, filterDay, filterSubject, selectedYear, selectedSem);
                if (res.success) { setResults(res.data); setResultsTotal(res.total); setResultsLastPage(res.lastPage); }
            }
            if (type === 'students' || type === 'all') {
                if (studentSearch.length < 2) {
                    const res = await api.getStudents(studentsPage, limit);
                    if (res.success) { setAllStudents(res.data); setStudentsTotal(res.total); setStudentsLastPage(res.lastPage); }
                }
            }
            if (type === 'labs' || type === 'all') {
                const res = await api.getLabs(labsPage, limit, filterDay, filterSubject, undefined, selectedYear, selectedSem);
                if (res.success) { setAllLabs(res.data); setLabsTotal(res.total); setLabsLastPage(res.lastPage); }
            }
            if (type === 'settings' || type === 'all') {
                const [resUnf, resSet] = await Promise.all([api.getUnfulfilledLabs(), api.getSettings()]);
                if (resUnf.success) setUnfulfilledLabs(resUnf.data);
                if (resSet) setSettings(resSet);
            }
            if (type === 'managers' || type === 'all') {
                const res = await api.getManagers();
                if (res.success) setManagers(res.data);
            }
        } catch (error) { console.error("ADMIN_CORE_SYNC_ERROR:", error); }
    };

    useEffect(() => { api.getTerms().then(res => { if (res.success) setAvailableTerms(res.data); }); }, []);
    useEffect(() => { refreshData('all'); }, []);
    useEffect(() => { refreshData('results'); }, [resultsPage, viewRound, filterDay, filterSubject, selectedYear, selectedSem]);
    useEffect(() => { refreshData('labs'); }, [labsPage, filterDay, filterSubject, selectedYear, selectedSem]);
    useEffect(() => { refreshData('students'); }, [studentsPage]);

    const formatTime12h = (timeInt: number) => {
        if (timeInt === undefined || timeInt === null) return "00:00";
        const str = timeInt.toString().padStart(4, '0');
        let hours = parseInt(str.slice(0, 2));
        const minutes = str.slice(2);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours < 10 ? `0${hours}` : hours}:${minutes} ${ampm}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleRunAllocation = async () => {
        if (settings.isConfirmed) return alert("CURRENT STATE: Locked.");
        setLoading(true);
        try {
            const res = await api.runAllocation();
            if (res.success) { 
                alert(res.message); 
                setResultsPage(1); // Reset to page 1 to prevent Ghost Pagination
                await refreshData(); 
                setViewRound(settings.currentRound); 
            } 
            else { alert(res.message || "Server Error"); }
        } catch (e) { alert("ENGINE_OFFLINE: Algorithm failed."); }
        finally { setLoading(false); }
    };

    const handleConfirmRound = () => {
        if (results.length === 0) return alert("Requires an active allotment draft.");
        setModal({
            isOpen: true, type: 'confirm', title: 'Finalize Round', 
            message: `Are you sure you want to finalize Round ${settings.currentRound}?`,
            onConfirm: async () => {
                const res = await api.confirmRound();
                if(res.success) { 
                    setResults([]); 
                    setResultsPage(1); // Reset to page 1
                    await refreshData(); 
                }
            }
        });
    };

    const handleRollback = () => {
        let msg = "Rollback to previous round? This will delete current unconfirmed allocations.";
        
        // Dynamically change the warning text based on the system state
        if (settings.isConfirmed) {
            msg = "Re-open the current round for editing?";
        } else if (settings.currentRound === 1) {
            msg = "Clear the current Round 1 draft? This will wipe all unconfirmed allocations and return to a clean slate.";
        }

        setModal({
            isOpen: true, type: 'confirm', title: 'Confirm Rollback', message: msg,
            onConfirm: async () => {
                try {
                    const res = await api.rollbackRound();
                    if (res.success) { 
                        alert(res.message); 
                        setResultsPage(1); 
                        await refreshData('all'); 
                    } 
                    else { alert(res.message); }
                } catch (e) { alert("Error connecting to server."); }
            }
        });
    };

    const handleDeleteLab = (id: string) => {
        setModal({
            isOpen: true, type: 'prompt', title: 'Delete Lab', 
            message: `DANGER: Are you sure you want to delete Lab ${id}?`, 
            expectedInput: 'DELETE',
            onConfirm: async () => {
                const res = await api.deleteLab(id);
                if (res.success) { alert("Lab deleted."); await refreshData(); } 
                else { alert("Delete failed: " + res.message); }
            }
        });
    };

    const handleDeallocate = (studentId: string, labId: string) => {
        setModal({
            isOpen: true, type: 'confirm', title: 'Remove TA', 
            message: "Remove this student from this TA slot?",
            onConfirm: async () => {
                const res = await api.deallocateStudent(studentId, labId);
                if (res.success) await refreshData();
            }
        });
    };

    const handleBlacklist = (studentId: string, labId: string, subjectName: string) => {
        setModal({
            isOpen: true, type: 'confirm', title: 'Toggle Lab Ban', 
            message: `Ban or Restore this student specifically for ${subjectName}? This only affects this specific lab for the current semester.`,
            onConfirm: async () => {
                const res = await api.toggleBlacklist(studentId, 'lab', labId, 'ADMIN');
                if (res.success) { alert(res.message); await refreshData(); } 
                else { alert("Failed: " + res.message); }
            }
        });
    };

    const handleHardReset = () => {
        setModal({
            isOpen: true, type: 'prompt', title: 'Semester Reset', 
            message: 'DANGER: Wipe all active applications and allocations for the current term? This gives you a blank slate for the new semester.', 
            expectedInput: 'RESET',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await api.clearAllocations();
                    if(res.success) { alert(res.message); window.location.reload(); } 
                    else { alert("Failed: " + res.message); }
                } catch (e: any) { alert("Error connecting to server."); }
                finally { setLoading(false); }
            }
        });
    };

    const handleRemoveManager = (id: number) => {
        setModal({
            isOpen: true, type: 'confirm', title: 'Revoke Access', 
            message: "Remove this Lab Manager's access?",
            onConfirm: async () => {
                setIsManagersLoading(true);
                const res = await api.removeManager(id);
                if (res.success) { setManagers(managers.filter(m => m.id !== id)); } 
                else { alert(res.message); }
                setIsManagersLoading(false);
            }
        });
    };

    const handleUpdateLab = async (originalId: string) => {
        if (!editLabForm) return;
        const res = await api.updateLabDetails(originalId, editLabForm);
        if (res.success) { 
            setEditingLabId(null); 
            setEditLabForm(null);
            await refreshData(); 
        } 
        else { alert("Update Failed: " + res.message); }
    };

    const handleCreateNewLabEntry = async () => {
        if (!newLab.subject) return alert("Required fields missing.");
        const res = await api.addLab(newLab);
        if (res.success) { alert("Lab Created."); await refreshData(); }
        else { alert(res.message); }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                
                const parsedLabs = rawData.map((row: any) => {
                    const getValue = (keyPart: string) => {
                        const key = Object.keys(row).find(k => k.toLowerCase().replace(/_/g, '').replace(/\s/g, '').includes(keyPart));
                        return key ? row[key] : undefined;
                    };
                    
                    return {
                        id: getValue('id')?.toString().trim(), 
                        subject: (getValue('subject') || getValue('course'))?.toString().trim(), 
                        day: getValue('day')?.toString().trim(),
                        startTime: parseExcelTime(getValue('start')), 
                        endTime: parseExcelTime(getValue('end')),     
                        capacity: parseInt(getValue('capacity') || '0', 10), 
                        venue: (getValue('venue') || getValue('room') || 'TBD').toString().trim()
                    };
                });
                
                const validLabs = parsedLabs.filter(l => l.subject && l.capacity > 0);
                
                if (validLabs.length === 0) return alert("No valid data found in Excel.");
                const res = await api.uploadLabsBulk(validLabs);
                if (res.success) { alert(res.message); await refreshData(); }
                else { alert(res.message); }
            } catch (err) { alert("Error reading Excel file."); }
            e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleExecuteManualAssign = async () => {
        if (!manualSelect.studentId || !manualSelect.labId) return alert("Invalid selection.");
        const res = await api.manualAllocate(manualSelect.studentId, manualSelect.labId);
        if (res.success) { alert("Override complete."); await refreshData(); }
        else { alert("Failed: " + res.message); }
    };

    const handleExecuteManualBlacklist = async () => {
        if (!blacklistSelect.studentId) return alert("Select a student to blacklist.");
        if (blacklistScope === 'lab' && !blacklistLabId) return alert("Please select a specific lab for the local blacklist.");
        
        const res = await api.toggleBlacklist(
            blacklistSelect.studentId, 
            blacklistScope, 
            blacklistScope === 'lab' ? blacklistLabId : undefined, 
            'ADMIN'
        );
        if (res.success) {
            alert(res.message); 
            setBlacklistSelect({ studentId: '' }); 
            setBlacklistSearch(''); 
            setBlacklistLabId('');
            await refreshData();
        } else { alert("Failed: " + res.message); }
    };

    const handleSyncSystemSettings = async () => {
        if (settings.acceptDataEnd > 0 && settings.acceptDataEnd <= settings.acceptDataStart) {
            return alert("Error: Application Close Date must be AFTER the Open Date.");
        }
        if (settings.withdrawalEnd > 0 && settings.withdrawalEnd <= settings.withdrawalStart) {
            return alert("Error: Withdrawal Close Date must be AFTER the Open Date.");
        }

        setIsSyncing(true);
        const res = await api.updateSettings(settings);
        setIsSyncing(false);
        if (res.success) { 
            alert("Timelines synced successfully."); 
            await refreshData(); 
        } else {
            alert("Failed to sync timelines: " + res.message);
        }
    };

    const handleExportResultsCSV = async () => {
        setLoading(true);
        try {
            // Grab the currently selected semester from the dropdown!
            const targetYear = selectedYear || settings.currentAcademicYear;
            const targetSem = selectedSem || settings.currentSemester;

            // Pass the targetYear and targetSem to the API
            const res = await api.getAllocationResults('all' as any, 10000, 'ALL', 'ALL', 'ALL', targetYear, targetSem);
            
            if (!res.success || res.data.length === 0) return alert(`No Allocations found for ${targetSem} ${targetYear}.`);
            
            let csv = "Round,TA Name,Roll Number,CGPA,Grade,Lab ID,Subject,Venue,Day,Timings\n";
            res.data.forEach((r: any) => {
                const grades = r.student.student_grades || [];
                const record = grades.find((g: any) => g.subject === r.lab.subject);
                const grade = record ? record.grade : 'N/A';
                csv += `${r.round},${sanitizeCSV(r.student.name)},${sanitizeCSV(r.student.rollNo)},${r.student.cgpa},${sanitizeCSV(grade)},${sanitizeCSV(r.lab.id)},${sanitizeCSV(r.lab.subject)},${sanitizeCSV(r.lab.venue || 'TBD')},${sanitizeCSV(r.lab.day)},${formatTime12h(r.lab.startTime)}-${formatTime12h(r.lab.endTime)}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TA_Allocations_${targetSem}_${targetYear}.csv`;
            a.click();
        } catch (e: any) { alert("Export failed: " + e.message); } 
        finally { setLoading(false); }
    };

    const handleExportApplicantsCSV = async () => {
        setLoading(true);
        try {
            // Grab the currently selected semester from the dropdown!
            const targetYear = selectedYear || settings.currentAcademicYear;
            const targetSem = selectedSem || settings.currentSemester;

            // Fetch the Archives (Applications) for this specific semester
            // Note: If api.getArchives doesn't support year/sem yet, we will update it in api.ts next!
            const res = await api.getArchives(1, 10000, targetYear, targetSem);
            
            if (!res.success || res.data.length === 0) return alert(`No Applications found for ${targetSem} ${targetYear}.`);
            
            let csv = "Round,Roll No,Name,CGPA,Applied_Grades,Date_Archived\n";
            res.data.forEach((row: any) => {
                const date = new Date(row.createdAt).toLocaleDateString();
                const safeHistory = (row.grade_history || '').replace(/"/g, '""'); 
                csv += `${row.round},${sanitizeCSV(row.rollNo)},${sanitizeCSV(row.name)},${row.cgpa},"${safeHistory}",${date}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Master_Applicants_${targetSem}_${targetYear}.csv`;
            a.click();
        } catch (e) { alert("Report failed."); }
        finally { setLoading(false); }
    };

    const handleAddManager = async () => {
        if (!newManagerEmail || !newManagerEmail.includes('@')) return alert("Enter a valid collegiate email.");
        setIsManagersLoading(true);
        const res = await api.addManager(newManagerEmail);
        if (res.success) {
            setNewManagerEmail('');
            alert(res.message);
            api.getManagers().then(r => { if (r.success) setManagers(r.data); });
        } else { alert(res.message); }
        setIsManagersLoading(false);
    };

    const uniqueSubjects = Array.from(new Set(allLabs.map(l => l.subject)));

    return (
        <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 font-sans text-gray-900 bg-gray-50/20 min-h-screen relative">
            
            {/* --- GLOBAL TAILWIND MODAL --- */}
            {modal && modal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95">
                        <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${modal.type === 'prompt' ? 'text-red-600' : 'text-gray-900'}`}>
                            {modal.title}
                        </h3>
                        <p className="text-sm font-bold text-gray-500 mb-6 leading-relaxed">{modal.message}</p>
                        
                        {modal.type === 'prompt' && (
                            <div className="mb-6">
                                <input 
                                    type="text"
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-red-500 focus:bg-white outline-none transition-all"
                                    placeholder={`Type ${modal.expectedInput} to confirm`}
                                    value={promptInput}
                                    onChange={(e) => setPromptInput(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    if (modal.type === 'prompt' && promptInput !== modal.expectedInput) {
                                        alert(`You must type ${modal.expectedInput} exactly to confirm.`);
                                        return;
                                    }
                                    modal.onConfirm();
                                    closeModal();
                                }}
                                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${modal.type === 'prompt' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-[#005a9c] hover:bg-blue-800 shadow-blue-900/30'}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center mb-8 sm:mb-12 gap-6 sm:gap-8 border-b pb-6 sm:pb-10 border-gray-200">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-4xl sm:text-6xl font-black text-[#005a9c] tracking-tighter uppercase italic">TA Allocation</h1>
                        <p className="text-gray-400 font-bold uppercase text-xs sm:text-sm tracking-[0.4em] mt-2 ml-1">Maintenance Panel</p>
                    </div>
                </div>

                <div className="flex flex-col items-start 2xl:items-end gap-4 w-full 2xl:w-auto relative z-50">
                    {/* TERM SELECTOR DROPDOWN */}
                    <div className="flex items-center gap-3 self-end">
                        {isPastTerm && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-200">Read-Only History</span>}
                        <CustomSelect 
                            value={`${selectedYear || settings.currentAcademicYear}|${selectedSem || settings.currentSemester}`}
                            onChange={(val) => {
                                const [y, s] = val.split('|');
                                setSelectedYear(y); setSelectedSem(s);
                            }}
                            className="bg-white border-2 border-gray-200 text-[#005a9c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2 hover:border-[#005a9c] transition-all shadow-sm min-w-[200px]"
                            options={[
                                { value: `${settings.currentAcademicYear}|${settings.currentSemester}`, label: `ACTIVE: ${settings.currentSemester} ${settings.currentAcademicYear}` },
                                ...availableTerms.map(t => ({ value: `${t.academicYear}|${t.semester}`, label: `HISTORY: ${t.semester} ${t.academicYear}` }))
                            ]}
                        />
                    </div>

                    <div className="flex bg-gray-200/50 p-1.5 rounded-2xl border border-gray-200 shadow-inner overflow-x-auto w-full custom-scrollbar">
                        <button onClick={() => handleTabChange('allocate')} className={`flex-shrink-0 px-6 sm:px-8 py-3 rounded-xl text-sm font-black transition-all uppercase tracking-widest ${activeTab === 'allocate' ? 'bg-white shadow-md text-[#005a9c]' : 'text-gray-500 hover:text-gray-700'}`}>Results</button>
                        <button onClick={() => handleTabChange('manage')} className={`flex-shrink-0 px-6 sm:px-8 py-3 rounded-xl text-sm font-black transition-all uppercase tracking-widest ${activeTab === 'manage' ? 'bg-white shadow-md text-[#005a9c]' : 'text-gray-500 hover:text-gray-700'}`}>Manage Labs</button>
                        <button onClick={() => handleTabChange('settings')} className={`flex-shrink-0 px-6 sm:px-8 py-3 rounded-xl text-sm font-black transition-all uppercase tracking-widest ${activeTab === 'settings' ? 'bg-white shadow-md text-[#005a9c]' : 'text-gray-500 hover:text-gray-700'}`}>Settings</button>
                        <button onClick={() => handleTabChange('access')} className={`flex-shrink-0 px-6 sm:px-8 py-3 rounded-xl text-sm font-black transition-all uppercase tracking-widest ${activeTab === 'access' ? 'bg-white shadow-md text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>Roles</button>
                        <button onClick={() => handleTabChange('danger')} className={`flex-shrink-0 px-6 sm:px-8 py-3 rounded-xl text-sm font-black transition-all uppercase tracking-widest ${activeTab === 'danger' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-red-600'}`}>Semester Reset</button>
                    </div>
                </div>
            </div>

            {/* --- TAB: SETTINGS --- */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 animate-in fade-in slide-in-from-bottom-10">
                    
                    {/* APPLICATION WINDOW */}
                    <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-gray-800 mb-10 uppercase tracking-widest text-sm flex items-center gap-3">
                            <span className="w-2 h-6 bg-[#e35205] rounded-full"></span> Application Window
                        </h3>
                        <div className="space-y-8">
                            <div className="relative">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Opens At</label>
                                <DatePicker
                                    selected={Number(settings.acceptDataStart) > 0 ? new Date(Number(settings.acceptDataStart)) : null}
                                    onChange={(date: Date | null) => setSettings({ ...settings, acceptDataStart: date?.getTime() || 0 })}
                                    showTimeSelect
                                    timeFormat="hh:mm aa"
                                    timeIntervals={15}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    disabled={isPastTerm}
                                    placeholderText="Select Date & Time"
                                    className="w-full border-2 border-gray-50 rounded-2xl p-5 text-base font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none text-gray-800 transition-all cursor-pointer"
                                    fixedHeight
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="scroll"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Closes At</label>
                                <DatePicker
                                    selected={Number(settings.acceptDataEnd) > 0 ? new Date(Number(settings.acceptDataEnd)) : null}
                                    onChange={(date: Date | null) => setSettings({ ...settings, acceptDataEnd: date?.getTime() || 0 })}
                                    showTimeSelect
                                    timeFormat="hh:mm aa"
                                    timeIntervals={15}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    disabled={isPastTerm}
                                    minDate={Number(settings.acceptDataStart) > 0 ? new Date(Number(settings.acceptDataStart)) : undefined}
                                    placeholderText="Select Date & Time"
                                    className="w-full border-2 border-gray-50 rounded-2xl p-5 text-base font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none text-gray-800 transition-all cursor-pointer"
                                    fixedHeight
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                />
                            </div>
                        </div>
                    </div>

                    {/* WITHDRAWAL WINDOW */}
                    <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-gray-800 mb-10 uppercase tracking-widest text-sm flex items-center gap-3">
                            <span className="w-2 h-6 bg-purple-500 rounded-full"></span> Withdrawal Window
                        </h3>
                        <div className="space-y-8">
                            <div className="relative">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Withdrawal Opens</label>
                                <DatePicker
                                    selected={Number(settings.withdrawalStart) > 0 ? new Date(Number(settings.withdrawalStart)) : null}
                                    onChange={(date: Date | null) => setSettings({ ...settings, withdrawalStart: date?.getTime() || 0 })}
                                    showTimeSelect
                                    timeFormat="hh:mm aa"
                                    timeIntervals={15}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    disabled={isPastTerm}
                                    placeholderText="Select Date & Time"
                                    className="w-full border-2 border-gray-50 rounded-2xl p-5 text-base font-bold bg-gray-50 focus:bg-white focus:border-purple-500 outline-none text-gray-800 transition-all cursor-pointer"
                                    fixedHeight
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Withdrawal Closes</label>
                                <DatePicker
                                    selected={Number(settings.withdrawalEnd) > 0 ? new Date(Number(settings.withdrawalEnd)) : null}
                                    onChange={(date: Date | null) => setSettings({ ...settings, withdrawalEnd: date?.getTime() || 0 })}
                                    showTimeSelect
                                    timeFormat="hh:mm aa"
                                    timeIntervals={15}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    disabled={isPastTerm}
                                    minDate={Number(settings.withdrawalStart) > 0 ? new Date(Number(settings.withdrawalStart)) : undefined}
                                    placeholderText="Select Date & Time"
                                    className="w-full border-2 border-gray-50 rounded-2xl p-5 text-base font-bold bg-gray-50 focus:bg-white focus:border-purple-500 outline-none text-gray-800 transition-all cursor-pointer"
                                    fixedHeight
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-full flex gap-4">
                        <button 
                            onClick={handleSyncSystemSettings} 
                            disabled={isPastTerm || isSyncing} 
                            className="w-full bg-[#005a9c] text-white py-5 rounded-3xl font-black text-sm uppercase hover:bg-blue-800 transition-all shadow-xl disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isSyncing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                    Syncing Timelines...
                                </>
                            ) : (
                                "Sync All Timelines"
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* --- TAB: MANAGE ROLES --- */}
            {activeTab === 'access' && (
                <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-10">
                    <div className="bg-gradient-to-br from-purple-50 to-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border-4 border-purple-100 shadow-2xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                            <div>
                                <h2 className="text-2xl sm:text-4xl font-black text-purple-900 uppercase tracking-tighter mb-2">Manage Roles</h2>
                                <p className="text-purple-700 font-bold text-base leading-relaxed">
                                    Manage Lab Managers. These accounts will have access ONLY to the Attendance and Registry portal.
                                </p>
                            </div>
                        </div>

                        {/* Add Manager Form */}
                        <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-purple-100 flex flex-col sm:flex-row gap-4 mb-8">
                            <input 
                                type="email"
                                placeholder="lab.manager@lnmiit.ac.in"
                                className="flex-1 bg-gray-50 border-2 border-transparent p-4 text-base font-bold rounded-2xl focus:bg-white focus:border-purple-200 outline-none transition-all placeholder-gray-400"
                                value={newManagerEmail}
                                onChange={(e) => setNewManagerEmail(e.target.value)}
                            />
                            <button 
                                onClick={handleAddManager}
                                disabled={isManagersLoading}
                                className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/30 disabled:opacity-50 active:scale-95"
                            >
                                {isManagersLoading ? 'Processing...' : 'Grant Access'}
                            </button>
                        </div>

                        {/* Manager List */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-black text-gray-700 uppercase tracking-widest text-xs">Active Lab Managers ({managers.length})</h3>
                            </div>
                            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {managers.map((m, idx) => (
                                    <div key={m.id} className={`p-6 flex items-center justify-between hover:bg-purple-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                <span className="font-black text-purple-600 text-lg">{m.email.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 text-lg">{m.email}</div>
                                                <div className="text-xs uppercase font-bold text-purple-500 mt-0.5 tracking-widest">{m.role}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveManager(m.id)}
                                            disabled={isManagersLoading}
                                            className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))}
                                {managers.length === 0 && (
                                    <div className="p-12 text-center text-gray-400 font-bold text-base tracking-wide">
                                        No active lab managers. Add an email above.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: SEMESTER RESET --- */}
            {activeTab === 'danger' && (
                <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-10">
                    <div className="bg-red-50 p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border-4 border-red-100 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 text-center">
                            
                            <h2 className="text-2xl sm:text-4xl font-black text-red-900 uppercase tracking-tighter mb-4">Semester Reset</h2>
                            <p className="text-red-700 font-bold text-base max-w-lg mx-auto mb-10 leading-relaxed">
                                Use this tool at the start of a new semester. This will safely wipe the active application data for the current automated semester to give you a fresh start.
                            </p>

                            <div className="bg-white p-8 rounded-[3rem] border-2 border-red-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="text-left">
                                    <h3 className="font-black text-red-800 uppercase text-lg mb-1">Wipe Active Data</h3>
                                    <p className="text-gray-500 text-sm font-bold leading-relaxed">
                                        Prepare the system for a new semester. <br />
                                        <span className="text-red-500 italic uppercase">This cannot be undone.</span>
                                    </p>
                                </div>
                                <button
                                    onClick={handleHardReset}
                                    disabled={loading || isPastTerm}
                                    className="w-full md:w-auto bg-red-600 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-3xl font-black text-sm uppercase hover:bg-red-700 transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    Reset Semester
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: MANAGE LABS --- */}
            {activeTab === 'manage' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10">
                    {/* CSV UPLOAD */}
                    <div className="bg-gradient-to-r from-blue-50 to-white p-8 rounded-[2rem] border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="font-black text-blue-900 text-xl uppercase tracking-tighter">Bulk Import Labs</h3>
                            <p className="text-gray-500 text-sm mt-1">Upload CSV or Excel to update lab slots.</p>
                        </div>
                        <label className={`cursor-pointer bg-[#005a9c] text-white px-8 py-4 rounded-[2rem] font-black text-sm uppercase shadow-xl hover:bg-blue-800 transition-all flex items-center gap-3 ${isPastTerm ? 'opacity-50 pointer-events-none' : ''}`}>
                            <span>Select File</span>
                            <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={handleFileUpload} disabled={isPastTerm} />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* ADD LAB FORM */}
                        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-gray-100">
                            <h3 className="font-black mb-6 sm:mb-10 text-blue-800 text-xs sm:text-sm tracking-[0.3em] uppercase">Add Lab Slot</h3>
                            <div className="space-y-6">
                                <div className="w-full mb-6">
                                    <input placeholder="Course (e.g. CS101)" className="w-full bg-gray-50 border-0 p-5 text-base font-bold rounded-2xl outline-none focus:ring-2 focus:ring-blue-200" onChange={e => setNewLab({ ...newLab, subject: e.target.value })} disabled={isPastTerm} />
                                </div>
                                <input placeholder="Venue / Room (e.g. LT-5)" className="w-full bg-gray-50 border-0 p-5 text-base font-bold rounded-2xl" onChange={e => setNewLab({ ...newLab, venue: e.target.value })} disabled={isPastTerm} />
                                <div className="grid grid-cols-2 gap-5">
                                    <select className="w-full bg-gray-50 p-5 text-base font-bold rounded-2xl" onChange={e => setNewLab({ ...newLab, day: e.target.value })} disabled={isPastTerm}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => <option key={d} value={d}>{d}</option>)}</select>
                                    <input type="number" placeholder="Cap" className="w-full bg-gray-50 p-5 text-base font-bold rounded-2xl" defaultValue={3} onChange={e => setNewLab({ ...newLab, capacity: parseInt(e.target.value) })} disabled={isPastTerm} />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-5">
                                    <TimePicker
                                        label="Start Time"
                                        value={newLab.startTime}
                                        onChange={(val) => setNewLab({ ...newLab, startTime: val })}
                                    />
                                    <TimePicker
                                        label="End Time"
                                        value={newLab.endTime}
                                        onChange={(val) => setNewLab({ ...newLab, endTime: val })}
                                        minTime={newLab.startTime}
                                    />
                                </div>
                                
                                <button onClick={handleCreateNewLabEntry} disabled={isPastTerm} className="w-full bg-[#005a9c] text-white py-5 rounded-3xl font-black text-sm uppercase hover:bg-blue-800 transition-all shadow-xl disabled:opacity-50">Create Entry</button>
                            </div>
                        </div>

                        {/* MANUAL ASSIGN */}
                        <div className="bg-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border-4 border-gray-100 shadow-2xl">
                            <h3 className="font-black mb-6 sm:mb-10 text-blue-700 text-xs sm:text-sm tracking-[0.3em] uppercase">Manual Assignment</h3>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="relative group/dropdown z-20">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search & Select Student (Name or Roll)..."
                                                className="w-full bg-gray-50 border-4 border-transparent p-5 text-base font-bold rounded-2xl focus:border-blue-200 focus:bg-white outline-none transition-all pr-12 peer"
                                                value={studentSearch}
                                                onChange={(e) => {
                                                    handleStudentSearch(e.target.value);
                                                    if (manualSelect.studentId) setManualSelect({ ...manualSelect, studentId: '' });
                                                }}
                                                disabled={isPastTerm}
                                            />
                                            {isSearchingStudents ? (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 transition-transform group-focus-within/dropdown:-rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            )}
                                        </div>

                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto hidden group-focus-within/dropdown:block peer-focus:block active:block custom-scrollbar">
                                            {allStudents.length > 0 ? (
                                                allStudents.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        className="w-full text-left p-4 hover:bg-blue-50 focus:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex flex-col"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setManualSelect({ ...manualSelect, studentId: s.id.toString() });
                                                            setStudentSearch(`${s.rollNo} | ${s.name}`);
                                                            (document.activeElement as HTMLElement)?.blur();
                                                        }}
                                                    >
                                                        <span className="font-black text-gray-800 text-base">{s.name}</span>
                                                        <span className="text-sm text-gray-400 font-mono font-bold">{s.rollNo}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-sm font-bold text-gray-400">
                                                    {studentSearch.length < 2 ? "Type to start searching..." : "No matching students found."}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative group/dropdown z-10">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search & Select Lab (Course or ID)..."
                                                className="w-full bg-gray-50 border-4 border-transparent p-5 text-base font-bold rounded-2xl focus:border-blue-200 focus:bg-white outline-none transition-all pr-12 peer"
                                                value={labSearch}
                                                onChange={(e) => {
                                                    handleLabSearch(e.target.value);
                                                    if (manualSelect.labId) setManualSelect({ ...manualSelect, labId: '' });
                                                }}
                                                disabled={isPastTerm}
                                            />
                                            {isSearchingLabs ? (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 transition-transform group-focus-within/dropdown:-rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            )}
                                        </div>

                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto hidden group-focus-within/dropdown:block peer-focus:block active:block custom-scrollbar">
                                            {searchedLabs.length > 0 ? (
                                                searchedLabs.map(l => (
                                                    <button
                                                        key={l.id}
                                                        type="button"
                                                        className="w-full text-left p-4 hover:bg-blue-50 focus:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setManualSelect({ ...manualSelect, labId: l.id.toString() });
                                                            setLabSearch(`${l.id} | ${l.subject} (${l.day})`);
                                                            (document.activeElement as HTMLElement)?.blur();
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="font-black text-blue-900 text-base">{l.subject} <span className="text-gray-400 font-normal ml-1">({l.day})</span></div>
                                                            <div className="text-sm text-gray-400 font-mono font-bold mt-1">{l.id}</div>
                                                        </div>
                                                        <div className="text-xs font-black text-blue-400 bg-blue-50 px-2 py-1 rounded-md">Select</div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-sm font-bold text-gray-400">
                                                    {labSearch.length < 2 && searchedLabs.length === 0 ? "Loading labs..." : "No matching labs found."}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleExecuteManualAssign} disabled={isPastTerm} className="w-full bg-black text-white py-5 rounded-3xl font-black text-sm uppercase hover:bg-gray-800 transition-all mt-4 disabled:opacity-50">Force Assign</button>
                            </div>
                        </div>

                        {/* MANUAL BLACKLIST */}
                        <div className="bg-red-50 p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border-4 border-red-100 shadow-2xl col-span-1 lg:col-span-2">
                            <h3 className="font-black mb-6 sm:mb-10 text-red-700 text-xs sm:text-sm tracking-[0.3em] uppercase">Manual Blacklist Directive</h3>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="relative group/dropdown z-20">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search & Select Student to Blacklist..."
                                                className="w-full bg-white border-4 border-transparent p-5 text-base font-bold rounded-2xl focus:border-red-200 outline-none transition-all pr-12 peer"
                                                value={blacklistSearch}
                                                onChange={(e) => {
                                                    handleBlacklistSearch(e.target.value);
                                                    if (blacklistSelect.studentId) setBlacklistSelect({ studentId: '' });
                                                }}
                                                disabled={isPastTerm}
                                            />
                                            {isSearchingBlacklist ? (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 transition-transform group-focus-within/dropdown:-rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            )}
                                        </div>

                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto hidden group-focus-within/dropdown:block peer-focus:block active:block custom-scrollbar">
                                            {searchedBlacklistStudents.length > 0 ? (
                                                searchedBlacklistStudents.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        className="w-full text-left p-4 hover:bg-red-50 focus:bg-red-50 border-b border-gray-50 last:border-0 transition-colors flex flex-col items-start"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setBlacklistSelect({ studentId: s.id.toString() });
                                                            setBlacklistSearch(`${s.rollNo} | ${s.name}`);
                                                            (document.activeElement as HTMLElement)?.blur();
                                                        }}
                                                    >
                                                        <span className="font-black text-red-900 text-base">{s.name} {s.isBlacklisted ? '(Already Blacklisted)' : ''}</span>
                                                        <span className="text-sm text-gray-500 font-mono font-bold">{s.rollNo}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-sm font-bold text-gray-400">
                                                    {blacklistSearch.length < 2 ? "Type to start searching..." : "No matching students found."}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* NEW: SCOPE SELECTOR */}
                                    <div className="flex gap-4 items-center bg-white p-3 rounded-2xl border-2 border-transparent">
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                                            <input type="radio" name="bscope" checked={blacklistScope === 'all'} onChange={() => setBlacklistScope('all')} className="w-4 h-4 text-red-600" />
                                            Global Ban (All Labs)
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                                            <input type="radio" name="bscope" checked={blacklistScope === 'lab'} onChange={() => setBlacklistScope('lab')} className="w-4 h-4 text-red-600" />
                                            Specific Lab Ban
                                        </label>
                                    </div>

                                    {/* NEW: SHOW LAB SELECTOR IF SCOPE IS 'LAB' */}
                                    {blacklistScope === 'lab' && (
                                        <select 
                                            className="w-full bg-white border-2 border-red-100 p-4 text-sm font-bold rounded-2xl focus:border-red-300 outline-none"
                                            value={blacklistLabId}
                                            onChange={(e) => setBlacklistLabId(e.target.value)}
                                        >
                                            <option value="">-- Select Lab --</option>
                                            {allLabs.map(l => (
                                                <option key={l.id} value={l.id}>{l.subject} ({l.day} {formatTime12h(l.startTime)})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <button onClick={handleExecuteManualBlacklist} disabled={isPastTerm} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black text-sm uppercase hover:bg-red-700 transition-all mt-4 shadow-lg shadow-red-200 disabled:opacity-50">Toggle Blacklist</button>
                            </div>
                        </div>
                    </div>

                    {/* LAB CARDS WITH EDIT/DELETE */}
                    <div className="bg-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-gray-800 mb-10 uppercase tracking-[0.3em] text-xs sm:text-sm">Lab Registry</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {allLabs.map(l => {
                                const isEditing = editingLabId === l.id;

                                return (
                                    <div key={l.id} className={`p-6 rounded-[2rem] transition-all shadow-sm border ${isEditing ? 'bg-blue-50 border-blue-200 ring-4 ring-blue-100 scale-105 z-10' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-blue-300 group'}`}>
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-black text-blue-400">Edit Lab Slot</span>
                                                    <button onClick={() => { setEditingLabId(null); setEditLabForm(null); }} className="text-gray-400 text-sm hover:text-red-500">✕</button>
                                                </div>

                                                {/* EDITABLE Subject */}
                                                <input 
                                                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-base font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    value={editLabForm?.subject || ''} 
                                                    onChange={e => setEditLabForm({...editLabForm, subject: e.target.value})}
                                                />

                                                {/* EDITABLE Day & Venue */}
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <select 
                                                        className="bg-white border border-blue-200 rounded-lg px-2 py-2 text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        value={editLabForm?.day || 'Mon'}
                                                        onChange={e => setEditLabForm({...editLabForm, day: e.target.value})}
                                                    >
                                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                    <input 
                                                        className="bg-white border border-blue-200 rounded-lg px-2 py-2 text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400" 
                                                        value={editLabForm?.venue || ''} 
                                                        onChange={e => setEditLabForm({...editLabForm, venue: e.target.value})}
                                                        placeholder="Venue"
                                                    />
                                                </div>

                                                {/* EDITABLE Times */}
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <TimePicker
                                                        label="Start"
                                                        small={true}
                                                        value={editLabForm?.startTime || 900}
                                                        onChange={(val) => setEditLabForm({...editLabForm, startTime: val})}
                                                    />
                                                    <TimePicker
                                                        label="End"
                                                        small={true}
                                                        value={editLabForm?.endTime || 1200}
                                                        onChange={(val) => setEditLabForm({...editLabForm, endTime: val})}
                                                    />
                                                </div>

                                                {/* EDITABLE Capacity */}
                                                <div className="flex items-center gap-2 mt-4 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                    <label className="text-xs font-black text-blue-900 uppercase">New Cap:</label>
                                                    <input 
                                                        className="w-full bg-white border border-blue-200 rounded-md px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400" 
                                                        value={editLabForm?.capacity || 0} 
                                                        onChange={e => setEditLabForm({...editLabForm, capacity: parseInt(e.target.value) || 0})}
                                                        type="number" min="0" 
                                                    />
                                                </div>

                                                <button onClick={() => handleUpdateLab(l.id)} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black uppercase mt-3 shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Save Changes</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-black text-blue-900 text-xl tracking-tighter uppercase">{l.subject}</div>
                                                    {!isPastTerm && (
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { setEditingLabId(l.id); setEditLabForm({...l}); }} className="text-blue-400 hover:text-blue-600" title="Edit Lab">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteLab(l.id)} className="text-gray-300 hover:text-red-500" title="Delete Lab">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-sm font-bold text-blue-600 mb-1 bg-blue-50 inline-block px-2 py-1 rounded-md">{l.venue || 'TBD'}</div>
                                                <div className="text-xs font-black text-gray-400 uppercase mb-4">{l.day}</div>
                                                <div className="flex justify-between items-center text-sm font-bold bg-white p-2 rounded-xl border border-gray-100">
                                                    <span className="text-gray-400">Time:</span>
                                                    <span>{formatTime12h(l.startTime)} - {formatTime12h(l.endTime)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm font-bold bg-white p-2 rounded-xl border border-gray-100 mt-2">
                                                    <span className="text-gray-400">Cap:</span>
                                                    <span className="text-blue-900">{l.capacity}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination for Labs (Shows Page 0 if Empty) */}
                        <div className="mt-10 flex justify-center items-center gap-4">
                            <button
                                onClick={() => setLabsPage(p => Math.max(1, p - 1))}
                                disabled={labsPage <= 1}
                                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            >
                                ← Prev
                            </button>
                            <span className="text-sm font-black text-gray-500 uppercase tracking-widest">
                                Page {labsTotal === 0 ? 0 : labsPage} of {labsLastPage}
                            </span>
                            <button
                                onClick={() => setLabsPage(p => Math.min(labsLastPage, p + 1))}
                                disabled={labsPage >= labsLastPage || labsLastPage === 0}
                                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: ALLOCATE --- */}
            {activeTab === 'allocate' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
                        <div className="flex flex-wrap gap-2 sm:gap-4">
                            <button onClick={handleExportResultsCSV} className="bg-white border-2 border-gray-100 text-gray-700 px-4 sm:px-6 py-3 sm:py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Export Report</button>
                            <button onClick={handleExportApplicantsCSV} className="bg-white border-2 border-blue-50 text-blue-700 px-4 sm:px-6 py-3 sm:py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all">Master Data</button>
                            <button onClick={handleRollback} disabled={isPastTerm} className="bg-yellow-50 text-yellow-600 border-2 border-yellow-100 px-4 sm:px-6 py-3 sm:py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-yellow-100 transition-all disabled:opacity-50">
                                ↺ Rollback
                            </button>
                            <button 
                                onClick={handleConfirmRound} 
                                disabled={!hasPendingAllocations || settings.isConfirmed || isPastTerm} 
                                className={`px-5 sm:px-8 py-3 sm:py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all ${
                                    (!hasPendingAllocations || settings.isConfirmed || isPastTerm) 
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                                    : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                                }`}
                            >
                                {settings.isConfirmed ? 'Finalized' : (!hasPendingAllocations ? 'Nothing to Confirm' : 'Confirm List')}
                            </button>
                        </div>
                        <button onClick={handleRunAllocation} disabled={loading || settings.isConfirmed || isPastTerm} className={`w-full lg:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-[2.2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105 ${settings.isConfirmed || isPastTerm ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#005a9c] text-white'}`}>{loading ? 'Processing...' : 'Execute Round Logic'}</button>
                    </div>

                    {/* RESULTS TABLE */}
                    <div className="bg-white shadow-2xl rounded-[2rem] sm:rounded-[3rem] border border-gray-100 overflow-hidden border-t-8 border-t-blue-600">
                        <div className="p-8 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <span className="text-xs font-black uppercase text-gray-400">Filters:</span>
                                <select 
                                    value={viewRound} 
                                    onChange={(e) => {
                                        setViewRound(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                                        setResultsPage(1); 
                                    }} 
                                    className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2 px-4 rounded-xl outline-none cursor-pointer hover:border-blue-400 transition-colors"
                                >
                                    <option value="ALL">All Rounds</option>
                                    {[...Array(settings.currentRound)].map((_, i) => (<option key={i + 1} value={i + 1}>Round {i + 1}</option>))}
                                </select>
                                <select 
                                    value={filterDay} 
                                    onChange={e => {
                                        setFilterDay(e.target.value);
                                        setResultsPage(1); 
                                    }} 
                                    className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2 px-4 rounded-xl outline-none cursor-pointer hover:border-blue-400 transition-colors"
                                >
                                    <option value="ALL">All Days</option>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select 
                                    value={filterSubject} 
                                    onChange={e => {
                                        setFilterSubject(e.target.value);
                                        setResultsPage(1);
                                    }} 
                                    className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2 px-4 rounded-xl outline-none cursor-pointer hover:border-blue-400 transition-colors"
                                >
                                    <option value="ALL">All Subjects</option>
                                    {globalSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            {(settings.isConfirmed || isPastTerm) && <span className="text-xs font-black bg-green-100 text-green-700 px-4 py-2 rounded-full uppercase tracking-tighter ring-4 ring-green-50">Record Locked</span>}
                        </div>

                        <div className="max-h-[600px] overflow-y-auto overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-gray-100 text-xs font-black text-gray-500 uppercase tracking-[0.2em] border-b z-20">
                                    <tr>
                                        <th className="p-6 text-center">Round</th>
                                        <th className="p-6">Student</th>
                                        <th className="p-6">Details</th>
                                        <th className="p-6">Lab Info</th>
                                        <th className="p-6 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {results.map((r, i) => (
                                        <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="p-6 font-black text-blue-900 text-center text-lg">{r.round}</td>
                                            <td className="p-6">
                                                <div className="font-black text-gray-900 text-base sm:text-lg flex items-center flex-wrap gap-2">
                                                    {r.student.name}
                                                    {/* Show Global Ban OR Lab Ban Badge */}
                                                    {r.student.isBlacklisted && <span className="bg-red-600 text-white px-2 py-0.5 rounded-[4px] text-[10px] uppercase tracking-wider shadow-sm">Global Ban</span>}
                                                    {!r.student.isBlacklisted && r.student.lab_blacklists?.some((b:any) => b.labId === r.labId) && <span className="bg-orange-500 text-white px-2 py-0.5 rounded-[4px] text-[10px] uppercase tracking-wider shadow-sm">Lab Ban</span>}
                                                </div>
                                                <div className="text-sm text-gray-400 font-mono mt-1">{r.student.rollNo}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex gap-2 mb-1">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">CGPA: {r.student.cgpa}</span>
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">Grade: {r.student.student_grades?.find((g: any) => g.subject === r.lab.subject)?.grade || 'N/A'}</span>
                                                </div>

                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-blue-600 text-xl">{r.lab.subject}</div>
                                                <div className="text-xs font-black text-gray-400 uppercase">{r.lab.day} | {formatTime12h(r.lab.startTime)} - {formatTime12h(r.lab.endTime)}</div>
                                                <div className="text-xs text-blue-400 font-bold mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> {r.lab.venue || 'TBD'}</div>
                                            </td>
                                            <td className="p-6 text-center space-y-2">
                                                <button
                                                    onClick={() => handleDeallocate(r.studentId, r.labId)}
                                                    disabled={isPastTerm}
                                                    className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 disabled:opacity-50"
                                                >
                                                    Remove
                                                </button>
                                                <button
                                                    onClick={() => handleBlacklist(r.studentId, r.labId, r.lab.subject)}
                                                    disabled={isPastTerm}
                                                    className={`w-full px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 ${r.student.isBlacklisted ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-800 text-white hover:bg-black'}`}
                                                >
                                                    Toggle Lab Ban
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {results.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-black uppercase tracking-widest text-sm sm:text-base">No Records Found</td></tr>}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination for Results (Shows Page 0 if Empty) */}
                        <div className="p-8 border-t bg-gray-50 flex justify-center items-center gap-4">
                            <button
                                onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                                disabled={resultsPage <= 1}
                                className="bg-white border-2 border-gray-100 px-6 py-2 rounded-xl text-sm font-black uppercase hover:bg-gray-50 disabled:opacity-50 transition-all"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest bg-white px-4 py-2 rounded-lg border border-gray-100">
                                Page {resultsTotal === 0 ? 0 : resultsPage} of {resultsLastPage} ({resultsTotal} Total)
                            </span>
                            <button
                                onClick={() => setResultsPage(p => Math.min(resultsLastPage, p + 1))}
                                disabled={resultsPage >= resultsLastPage || resultsLastPage === 0}
                                className="bg-white border-2 border-gray-100 px-6 py-2 rounded-xl text-sm font-black uppercase hover:bg-gray-50 disabled:opacity-50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* VACANCY ALERT */}
                    <div className="bg-red-50 p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-red-100 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between mb-8 sm:items-center gap-4">
                            <h3 className="font-black text-red-600 uppercase tracking-[0.2em] text-sm">Critical Vacancies</h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search Subjects..."
                                    value={vacanciesSearchQuery}
                                    onChange={(e) => {
                                        setVacanciesSearchQuery(e.target.value);
                                        setVacanciesPage(1);
                                    }}
                                    className="w-full sm:w-64 bg-white border border-red-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-red-400 outline-none pl-10 transition-all text-red-900 placeholder-red-300"
                                />
                                <svg className="w-5 h-5 text-red-300 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-grow">
                            {(() => {
                                const grouped = unfulfilledLabs.reduce((acc, lab) => {
                                    if (!acc[lab.subject]) {
                                        acc[lab.subject] = { totalVacancies: 0, labs: [] };
                                    }
                                    acc[lab.subject].totalVacancies += (lab.capacity - lab.assigned);
                                    acc[lab.subject].labs.push(lab);
                                    return acc;
                                }, {} as Record<string, { totalVacancies: number, labs: typeof unfulfilledLabs }>);

                                const sortedGroups = (Object.entries(grouped) as [string, { totalVacancies: number, labs: typeof unfulfilledLabs }][])
                                    .sort((a, b) => b[1].totalVacancies - a[1].totalVacancies)
                                    .filter(([subject]) => subject.toLowerCase().includes(vacanciesSearchQuery.toLowerCase()));

                                if (sortedGroups.length === 0) {
                                    return (
                                        <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center text-sm text-red-400 py-10 italic border-2 border-dashed border-red-200 rounded-3xl bg-white/50">
                                            No matching subjects found.
                                        </div>
                                    );
                                }

                                const ITEMS_PER_PAGE = 3;
                                const totalPages = Math.ceil(sortedGroups.length / ITEMS_PER_PAGE);
                                const startIndex = (vacanciesPage - 1) * ITEMS_PER_PAGE;
                                const paginatedGroups = sortedGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                                return (
                                    <>
                                        {paginatedGroups.map(([subject, data]) => (
                                            <div key={subject} className="bg-white rounded-[2rem] shadow-sm border border-red-100 overflow-hidden flex flex-col">
                                                <div className="p-6 bg-red-600 flex justify-between items-center text-white">
                                                    <h4 className="font-black text-2xl tracking-tight">{subject}</h4>
                                                    <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold font-mono">
                                                        {data.totalVacancies} Missing TAs
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-gray-50 flex-grow">
                                                    <div className="flex flex-col gap-2">
                                                        {(() => {
                                                            const dayOrder: Record<string, number> = {
                                                                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
                                                            };
                                                            return [...data.labs].sort((a, b) => {
                                                                const dayDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
                                                                if (dayDiff !== 0) return dayDiff;
                                                                return a.startTime - b.startTime;
                                                            }).map(l => (
                                                                <div key={l.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center text-sm hover:border-red-200 transition-colors">
                                                                    <div>
                                                                        <div className="font-black text-gray-800 uppercase tracking-widest text-xs">{l.day}</div>
                                                                        <div className="text-gray-500 font-bold">{formatTime12h(l.startTime)} - {formatTime12h(l.endTime)}</div>
                                                                        {/* Add Venue to Vacancies View */}
                                                                        <div className="text-blue-500 font-bold text-xs mt-1">{l.venue || 'TBD'}</div>
                                                                    </div>
                                                                    <div className="font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                                                                        -{l.capacity - l.assigned}
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {totalPages > 1 && (
                                            <div className="col-span-1 md:col-span-2 xl:col-span-3 mt-8 flex justify-center items-center gap-4">
                                                <button
                                                    onClick={() => setVacanciesPage(p => Math.max(1, p - 1))}
                                                    disabled={vacanciesPage <= 1}
                                                    className="bg-white border-2 border-red-100 text-red-500 px-6 py-2 rounded-xl text-sm font-bold uppercase hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
                                                >
                                                    Previous
                                                </button>
                                                <span className="text-xs font-black text-red-400 uppercase tracking-widest bg-white px-4 py-2 rounded-lg border border-red-100 shadow-sm">
                                                    Page {sortedGroups.length === 0 ? 0 : vacanciesPage} of {totalPages} ({sortedGroups.length} Subjects)
                                                </span>
                                                <button
                                                    onClick={() => setVacanciesPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={vacanciesPage >= totalPages || totalPages === 0}
                                                    className="bg-white border-2 border-red-100 text-red-500 px-6 py-2 rounded-xl text-sm font-bold uppercase hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};