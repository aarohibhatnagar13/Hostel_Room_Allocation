import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AllocationRun } from '../types';

export const AllocationHistory: React.FC = () => {
  const [history, setHistory] = useState<AllocationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AllocationRun | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const res = await api.getAllocationHistory();
    if (res.success) setHistory(res.data || []);
    setLoading(false);
  };

  const handleRunNew = async () => {
    if (!window.confirm("Run Greedy Allocation Algorithm?")) return;
    const res = await api.runAllocation();
    if (res.success) {
        alert("Algorithm Execution Complete");
        fetchHistory();
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Algorithm Run History</h1>
        <button onClick={handleRunNew} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg">Run New Allocation</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
          <p className="text-[10px] font-black uppercase text-gray-400">Previous Cached Results</p>
          {history.map(run => (
            <button key={run.runId} onClick={() => setSelectedRun(run)} className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedRun?.runId === run.runId ? 'border-indigo-600 bg-indigo-50' : 'bg-white border-transparent shadow-sm'}`}>
              <p className="font-mono text-xs font-bold text-indigo-600">#{run.runId.substring(0,8)}</p>
              <p className="text-[10px] text-gray-400 uppercase font-black">{new Date(run.timestamp).toLocaleString()}</p>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          {selectedRun ? (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
               <h2 className="text-xl font-black uppercase mb-6 font-mono border-b pb-4">Allocation Result Log</h2>
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-2xl text-green-700 font-bold text-sm uppercase">Assigned: {selectedRun.stats.roomsFilled}</div>
                  <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 font-bold text-sm uppercase">Waitlist: {selectedRun.stats.studentsWaitlisted}</div>
               </div>
               <div className="bg-gray-900 rounded-2xl p-6 font-mono text-xs text-green-400 h-64 overflow-y-auto leading-relaxed">
                  <p className="text-gray-500 italic mb-2">// Fetching cached results for {selectedRun.runId}</p>
                  {selectedRun.results?.map((r:any, i:number) => (
                    <p key={i}>[SUCCESS] Student {r.studentId} matched to Room {r.roomNumber}</p>
                  ))}
                  {selectedRun.waitlist?.map((r:any, i:number) => (
                    <p key={i} className="text-amber-400">[WAITLIST] Student {r.studentId} - No match found.</p>
                  ))}
               </div>
            </div>
          ) : <div className="h-64 border-4 border-dashed border-gray-100 rounded-3xl flex items-center justify-center text-gray-300 font-black uppercase tracking-widest">Select a run from cache</div>}
        </div>
      </div>
    </div>
  );
};