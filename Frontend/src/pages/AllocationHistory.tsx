import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const AllocationHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const res = await api.getAllocationHistory();
    if (res.success) {
        setHistory(res.history || []);
        if (res.history?.length > 0) setSelectedRun(res.history[0]);
    }
    setLoading(false);
  };

  const handleRunNew = async () => {
    if (!window.confirm("WARNING: This will assign all unallocated students to rooms. Proceed?")) return;
    setLoading(true);
    const res = await api.runAllocation();
    if (res.success) {
        alert("Algorithm Execution Complete!");
        fetchHistory();
    } else {
        alert(res.message || "Failed to run algorithm.");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
            <h1 className="text-3xl font-black text-[#005a9c] uppercase tracking-tighter">Algorithm Engine</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Hostel Allocation Processing</p>
        </div>
        <button 
            onClick={handleRunNew} 
            disabled={loading}
            className="bg-[#e35205] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
        >
            {loading ? 'Running Engine...' : 'Run New Allocation'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Recent Executions</p>
          {history.length === 0 && <p className="text-sm font-bold text-gray-400">No previous runs found.</p>}
          
          {history.map(run => (
            <button key={run.runId} onClick={() => setSelectedRun(run)} className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${selectedRun?.runId === run.runId ? 'border-[#005a9c] bg-blue-50' : 'bg-white border-transparent shadow-sm hover:border-blue-100'}`}>
              <p className="font-mono text-xs font-bold text-[#005a9c]">#{run.runId.substring(0,8)}</p>
              <p className="text-[10px] text-gray-500 uppercase font-black mt-1">{new Date(run.timestamp).toLocaleString()}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedRun ? (
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
               <h2 className="text-xl font-black uppercase mb-6 font-mono border-b pb-4 text-gray-800">Engine Output Log</h2>
               
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-3xl font-black text-green-600">{selectedRun.results.stats.successfully_allocated}</p>
                      <p className="text-[10px] text-green-700 font-bold uppercase tracking-widest mt-1">Students Assigned</p>
                  </div>
                  <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-3xl font-black text-orange-600">{selectedRun.results.stats.waitlisted}</p>
                      <p className="text-[10px] text-orange-700 font-bold uppercase tracking-widest mt-1">Students Waitlisted</p>
                  </div>
               </div>
               
               {/* TERMINAL WINDOW */}
               <div className="bg-gray-900 rounded-2xl p-6 font-mono text-xs text-green-400 h-96 overflow-y-auto leading-relaxed custom-scrollbar shadow-inner">
                  <p className="text-gray-500 italic mb-4">// Fetching execution results for ID: {selectedRun.runId}</p>
                  
                  {selectedRun.results?.allocations?.map((r:any, i:number) => (
                    <p key={i} className="mb-1">
                        <span className="text-blue-400">[{r.allocation_type}]</span> Student <span className="text-white">{r.student_name}</span> matched to <span className="text-yellow-400">{r.hostel} Room {r.room_number}</span> ({r.room_type})
                    </p>
                  ))}
                  
                  {selectedRun.results?.waitlist?.map((r:any, i:number) => (
                    <p key={i} className="text-red-400 mt-2">
                        [WAITLIST] Student <span className="text-white">{r.name}</span> - {r.reason}
                    </p>
                  ))}
               </div>
            </div>
          ) : (
            <div className="h-64 border-4 border-dashed border-gray-200 rounded-[2rem] flex items-center justify-center text-gray-400 font-black uppercase tracking-widest bg-gray-50">
                Select a run from history
            </div>
          )}
        </div>
      </div>
    </div>
  );
};