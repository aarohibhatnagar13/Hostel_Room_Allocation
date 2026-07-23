import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

import {CustomSelect} from "../components/CustomSelect";

export const AdminAttendance: React.FC = () => {
    const [rooms, setRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Filters
    const [filterHostel, setFilterHostel] = useState<string>('ALL');
    const [filterGender, setFilterGender] = useState<string>('ALL');
    const [uniqueHostels, setUniqueHostels] = useState<string[]>([]);

    useEffect(() => { fetchRooms(); }, []);
    //fetch rooms functions
    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const res = await api.getRooms();
            if (res && res.success && res.data) {
                setRooms(res.data);
                const hostels = Array.from(new Set(res.data.map((r: any) => r.hostel_name))) as string[];
                setUniqueHostels(hostels.sort());
            }
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // --- CSV UPLOAD LOGIC ---
    const downloadTemplate = () => {
        const csvContent = "RoomNumber,HostelName,Floor,Capacity,RoomType,Gender,AllowedYears(SpaceSeparated)\n101,BH-1,1,1,Single,Male,1 2 3 4\n102,BH-1,1,2,Double,Male,1 2\n101,GH-1,1,3,Triple,Female,1";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Room_Upload_Template.csv`;
        a.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                const parsedRooms = [];

                // Skip the header row (i = 1)
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',').map(c => c.trim());
                    if (cols.length < 6) continue; // Skip invalid rows

                    // Parse space-separated years (e.g., "1 2" -> [1, 2])
                    let allowedYears: number[] = [];
                    if (cols[6] && cols[6].trim() !== '') {
                        allowedYears = cols[6].split(' ').map(y => parseInt(y)).filter(y => !isNaN(y));
                    }

                    parsedRooms.push({
                        roomNumber: cols[0],
                        hostelName: cols[1],
                        floor: cols[2],
                        capacity: cols[3],
                        roomType: cols[4],
                        gender: cols[5],
                        allowedYears: allowedYears.length > 0 ? allowedYears : null
                    });
                }

                if (parsedRooms.length === 0) {
                    alert("No valid rooms found in CSV.");
                    return;
                }

                const res = await api.uploadRoomsBulk(parsedRooms);
                if (res.success) {
                    alert(res.message);
                    fetchRooms(); // Refresh the table automatically!
                } else {
                    alert(res.message || "Failed to upload rooms.");
                }
            } catch (err) {
                alert("Error parsing CSV file. Please use the template.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    // Apply Filters to the room list
    const filteredRooms = rooms.filter(room => {
        if (filterHostel !== 'ALL' && room.hostel_name !== filterHostel) return false;
        if (filterGender !== 'ALL' && room.current_gender !== filterGender && room.current_gender !== 'Both') return false;
        return true;
    });

    const totalBeds = filteredRooms.reduce((sum, r) => sum + parseInt(r.capacity), 0);
    const filledBeds = filteredRooms.reduce((sum, r) => sum + parseInt(r.occupied_beds), 0);
    const occupancyRate = totalBeds === 0 ? 0 : Math.round((filledBeds / totalBeds) * 100);

    return (
        <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#005a9c] tracking-tighter uppercase mb-1.5 leading-tight">
                        Room Occupancy <span className="text-gray-900">Tracker</span>
                    </h1>
                    <p className="text-[#005a9c]/70 font-bold uppercase tracking-widest text-[10px] border-l-4 border-[#005a9c] pl-3 ml-0.5 py-0.5">
                        Live Hostel Availability & Settings
                    </p>
                </div>
                
                {/* BULK UPLOAD CONTROLS */}
                <div className="flex gap-3">
                    <button onClick={downloadTemplate} className="px-5 py-3 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                        Get CSV Template
                    </button>
                    
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading}
                        className="px-6 py-3 bg-[#e35205] text-white hover:bg-orange-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                    >
                        {isUploading ? 'Uploading...' : 'Bulk Upload Rooms'}
                    </button>
                </div>
            </div>

            {/* Filters Area */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block ml-2">Filter by Hostel</label>
                    <CustomSelect 
                        value={filterHostel} onChange={setFilterHostel}
                        options={[{ value: 'ALL', label: 'All Hostels' }, ...uniqueHostels.map(h => ({ value: h, label: h }))]}
                        className="bg-gray-50 border-2 border-gray-100 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-3 hover:border-blue-200"
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block ml-2">Filter by Gender</label>
                    <CustomSelect 
                        value={filterGender} onChange={setFilterGender}
                        options={[
                            { value: 'ALL', label: 'All Genders' },
                            { value: 'Male', label: 'Male Rooms Only' },
                            { value: 'Female', label: 'Female Rooms Only' }
                        ]}
                        className="bg-gray-50 border-2 border-gray-100 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-3 hover:border-blue-200"
                    />
                </div>
                <div className="ml-auto">
                    <button onClick={fetchRooms} className="px-6 py-3 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-[#005a9c] rounded-full animate-spin" />
                    <p className="font-black uppercase text-gray-400 tracking-widest text-xs">Syncing Registry...</p>
                </div>
            ) : filteredRooms.length === 0 ? (
                <div className="py-16 text-center font-black uppercase text-gray-300 tracking-widest border-4 border-dashed border-gray-100 rounded-[2rem]">
                    No Rooms Found matching criteria.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* STATS ROW */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Rooms</p>
                                <p className="text-3xl font-black text-gray-800">{filteredRooms.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">🚪</div>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Available Beds</p>
                                <p className="text-3xl font-black text-[#005a9c]">{totalBeds - filledBeds}</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500">🛏️</div>
                        </div>
                        <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Occupancy Rate</p>
                                <p className="text-3xl font-black text-green-700">{occupancyRate}%</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-500">📈</div>
                        </div>
                    </div>

                    {/* DESKTOP TABLE */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hidden sm:block">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Hostel & Room</th>
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Type & Floor</th>
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Gender & Years</th>
                                    <th className="p-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Occupancy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRooms.map((room, idx) => (
                                    <tr key={room.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                        <td className="p-5">
                                            <p className="font-black text-gray-900 text-lg">{room.hostel_name}</p>
                                            <p className="text-xs text-[#005a9c] font-bold mt-0.5">Room {room.room_number}</p>
                                        </td>
                                        <td className="p-5">
                                            <p className="font-bold text-gray-700">{room.room_type}</p>
                                            <p className="text-xs text-gray-400 font-bold mt-0.5">Floor {room.floor}</p>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    room.current_gender === 'Male' ? 'bg-blue-100 text-blue-700' : 
                                                    room.current_gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {room.current_gender === 'Both' ? 'Unassigned' : room.current_gender}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                                    Years: {room.allowed_years ? JSON.parse(room.allowed_years).join(', ') : 'All'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden max-w-[100px]">
                                                    <div 
                                                        className={`h-2.5 rounded-full ${room.occupied_beds >= room.capacity ? 'bg-red-400' : 'bg-green-400'}`} 
                                                        style={{ width: `${(room.occupied_beds / room.capacity) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="font-black text-xs text-gray-600 w-12">
                                                    {room.occupied_beds} / {room.capacity}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            )}
        </div>
    );
};