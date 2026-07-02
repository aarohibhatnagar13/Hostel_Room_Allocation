import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CustomSelect } from "../components/CustomSelect";

export const AdminReports: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [students, setStudents] = useState<any[]>([]);
    
    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterGender, setFilterGender] = useState('ALL');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.getStudentReports();
            if (res && res.success) {
                setStudents(res.data || []);
            }
        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters
    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.roll_number.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || s.allocation_status === filterStatus;
        const matchesGender = filterGender === 'ALL' || s.gender === filterGender;
        return matchesSearch && matchesStatus && matchesGender;
    });

    const handleExportCSV = () => {
        if (filteredStudents.length === 0) return alert("No data to export.");
        
        let csv = "Roll Number,Student Name,Gender,Year,CGPA,Status,Hostel,Room Number,Room Type\n";
        
        filteredStudents.forEach(s => {
            const hostel = s.allocatedRoom?.hostel_name || 'N/A';
            const roomNo = s.allocatedRoom?.room_number || 'N/A';
            const roomType = s.allocatedRoom?.room_type || 'N/A';
            csv += `"${s.roll_number}","${s.name}","${s.gender}",${s.year_of_study},${s.cgpa},"${s.allocation_status.toUpperCase()}","${hostel}","${roomNo}","${roomType}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hostel_Allocation_Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#005a9c] tracking-tighter uppercase mb-1.5 leading-tight">
                        Allocation <span className="text-gray-900">Reports</span>
                    </h1>
                    <p className="text-[#005a9c]/70 font-bold uppercase tracking-widest text-[10px] border-l-4 border-[#005a9c] pl-3 ml-0.5 py-0.5">
                        Master Student Roster
                    </p>
                </div>
                <button 
                    onClick={handleExportCSV}
                    className="bg-[#10b981] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#059669] transition-all shadow-xl active:scale-95 flex items-center gap-3"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download CSV
                </button>
            </div>

            {/* Filters Area */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px]">
                    <input 
                        type="text" 
                        placeholder="Search Name or Roll No..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-50 p-4 text-sm font-bold text-gray-800 rounded-xl border-2 border-gray-100 focus:border-[#005a9c] outline-none transition-all"
                    />
                </div>
                <div className="w-48">
                    <CustomSelect 
                        value={filterStatus} 
                        onChange={setFilterStatus} 
                        options={[
                            { value: 'ALL', label: 'All Statuses' }, 
                            { value: 'allocated', label: 'Allocated' }, 
                            { value: 'waitlisted', label: 'Waitlisted' },
                            { value: 'unallocated', label: 'Unallocated' }
                        ]} 
                        className="bg-gray-50 border-2 border-gray-100 text-gray-800 font-bold text-xs uppercase rounded-xl px-4 py-4"
                    />
                </div>
                <div className="w-48">
                    <CustomSelect 
                        value={filterGender} 
                        onChange={setFilterGender} 
                        options={[
                            { value: 'ALL', label: 'All Genders' }, 
                            { value: 'Male', label: 'Male' }, 
                            { value: 'Female', label: 'Female' }
                        ]} 
                        className="bg-gray-50 border-2 border-gray-100 text-gray-800 font-bold text-xs uppercase rounded-xl px-4 py-4"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#005a9c] rounded-full animate-spin" />
                        <p className="font-black uppercase text-gray-400 tracking-widest text-xs">Loading Roster...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-20 text-center font-black uppercase text-gray-300 tracking-widest border-4 border-dashed border-gray-50 m-4 rounded-[2rem]">
                        No Students Found.
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Student Info</th>
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Academics</th>
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Status</th>
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Assignment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((s: any, idx: number) => (
                                    <tr key={s.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                        <td className="p-5">
                                            <p className="font-black text-gray-900">{s.name}</p>
                                            <div className="flex gap-2 items-center mt-1">
                                                <p className="text-xs text-[#005a9c] font-bold">{s.roll_number}</p>
                                                <span className="text-[9px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">{s.gender}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <p className="font-bold text-gray-700">Year {s.year_of_study}</p>
                                            <p className="text-xs text-gray-500 font-bold mt-0.5">CGPA: {s.cgpa}</p>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                s.allocation_status === 'allocated' || s.allocation_status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                s.allocation_status === 'waitlisted' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>
                                                {s.allocation_status}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            {s.allocatedRoom ? (
                                                <div>
                                                    <p className="font-black text-[#005a9c]">{s.allocatedRoom.hostel_name} - {s.allocatedRoom.room_number}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{s.allocatedRoom.room_type}</p>
                                                </div>
                                            ) : (
                                                <p className="text-xs font-bold text-gray-400 italic">--</p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};