import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSearchParams } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'allocate';

    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.getRooms(1, 10);
            if (res && res.data) setRooms(res.data);
        } catch (err) {
            console.error("Data fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    return (
        <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Page Header */}
            <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#005a9c] tracking-tighter uppercase mb-1.5 leading-tight">
                    Hostel <span className="text-gray-900">Dashboard</span>
                </h1>
                <p className="text-[#005a9c]/70 font-bold uppercase tracking-widest text-[10px] border-l-4 border-[#005a9c] pl-3 ml-0.5 py-0.5">
                    System Overview
                </p>
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={() => setSearchParams({ tab: 'allocate' })}
                    className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'allocate' ? 'bg-[#005a9c] text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}
                >
                    Allocation Overview
                </button>
                <button 
                    onClick={() => setSearchParams({ tab: 'rooms' })}
                    className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'rooms' ? 'bg-[#005a9c] text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}
                >
                    Quick Rooms List
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-[#005a9c] rounded-full animate-spin" />
                    <p className="font-black uppercase text-gray-400 tracking-widest text-xs">Loading Data...</p>
                </div>
            ) : (
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    {rooms.length === 0 ? (
                        <p className="text-center font-bold text-gray-400 py-10 uppercase tracking-widest text-sm">No room data available.</p>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 text-[10px] font-black tracking-widest uppercase text-gray-400">Room No</th>
                                        <th className="p-4 text-[10px] font-black tracking-widest uppercase text-gray-400">Hostel</th>
                                        <th className="p-4 text-[10px] font-black tracking-widest uppercase text-gray-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rooms.map((room: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 font-bold text-gray-800">{room.room_number}</td>
                                            <td className="p-4 font-bold text-[#005a9c]">{room.hostel_name}</td>
                                            <td className="p-4">
                                                <span className="font-black text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                                    {room.occupied_beds} / {room.capacity}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};