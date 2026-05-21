import React from 'react';
import { Calendar as CalendarIcon, Filter, Eye, Navigation2 } from 'lucide-react';

interface FilterBarProps {
  viewAs: string;
  setViewAs: (v: string) => void;
  selectedId: string;
  setSelectedId: (id: string) => void;
  showEmpty: boolean;
  setShowEmpty: (s: boolean) => void;
  options: { id: string; name: string }[];
}

export function FilterBar({ viewAs, setViewAs, selectedId, setSelectedId, showEmpty, setShowEmpty, options }: FilterBarProps) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <Eye size={18} className="text-blue-500" />
        <span className="text-sm font-bold text-slate-500">View as:</span>
        <select 
          value={viewAs}
          onChange={(e) => setViewAs(e.target.value)}
          className="bg-blue-50 border-none text-sm font-bold text-blue-900 rounded-lg focus:ring-2 focus:ring-blue-600 px-3 py-1.5 cursor-pointer outline-none"
        >
          <option value="batch">Batch / Section</option>
          <option value="faculty">Faculty</option>
          <option value="room">Room</option>
          <option value="department">Department</option>
        </select>
      </div>

      <div className="flex-1 w-full flex items-center gap-2">
        <Filter size={18} className="text-blue-500" />
        <select 
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 bg-blue-50 border-none text-sm font-bold text-blue-900 rounded-lg focus:ring-2 focus:ring-blue-600 px-3 py-1.5 cursor-pointer outline-none"
        >
          <option value="">Select {viewAs.charAt(0).toUpperCase() + viewAs.slice(1)}...</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input 
            type="checkbox"
            checked={showEmpty}
            onChange={(e) => setShowEmpty(e.target.checked)}
            className="w-4 h-4 rounded border-blue-200 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-sm font-medium text-slate-600">Show empty slots</span>
        </label>

        <div className="h-6 w-px bg-blue-100" />

        <div className="flex items-center gap-1 bg-blue-50 rounded-lg p-1">
          <button className="px-3 py-1 text-xs font-black bg-white text-blue-900 rounded-md shadow-sm transition-all">Week</button>
          <button className="px-3 py-1 text-xs font-bold text-blue-400 hover:text-blue-900 rounded-md transition-all">Month</button>
        </div>
      </div>
    </div>
  );
}
