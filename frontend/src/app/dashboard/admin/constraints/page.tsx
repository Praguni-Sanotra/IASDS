"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Sliders, RotateCcw, Loader2, FileUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../../../lib/apiClient';

type Constraint = {
  _id: string;
  name: string;
  description?: string;
  type: 'HARD' | 'SOFT';
  isEnabled: boolean;
  priority: number;
};

export default function ConstraintsPage() {
  const [hard, setHard] = useState<Constraint[]>([]);
  const [soft, setSoft] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConstraints = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/constraints');
      setHard(res.data.data?.HARD || []);
      setSoft(res.data.data?.SOFT || []);
    } catch {
      toast.error('Failed to load constraints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConstraints();
  }, []);

  const toggleConstraint = async (c: Constraint) => {
    setSavingId(c._id);
    try {
      await apiClient.put(`/constraints/${c._id}`, { isEnabled: !c.isEnabled });
      toast.success(`${c.name} ${!c.isEnabled ? 'enabled' : 'disabled'}`);
      fetchConstraints();
    } catch {
      toast.error('Update failed');
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all constraints to defaults?')) return;
    try {
      await apiClient.post('/constraints/reset');
      toast.success('Constraints reset');
      fetchConstraints();
    } catch {
      toast.error('Reset failed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      await apiClient.post('/constraints/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Constraints imported successfully');
      fetchConstraints();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderList = (items: Constraint[], title: string) => (
    <div className="bg-white rounded-[32px] border border-blue-50 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-blue-50 bg-blue-50/10">
        <h3 className="font-black text-blue-900 tracking-tight">{title}</h3>
      </div>
      <ul className="divide-y divide-blue-50/50">
        {items.map((c) => (
          <li key={c._id} className="px-8 py-6 flex items-center justify-between gap-6 hover:bg-blue-50/5 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <p className="font-extrabold text-blue-950 text-base">{c.name}</p>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  P{c.priority}
                </span>
              </div>
              {c.description && (
                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-md">{c.description}</p>
              )}
            </div>
            <button
              onClick={() => toggleConstraint(c)}
              disabled={savingId === c._id}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${
                c.isEnabled ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  c.isEnabled ? 'translate-x-7' : ''
                }`}
              />
            </button>
          </li>
        ))}
        {items.length === 0 && !loading && (
          <li className="px-8 py-12 text-center text-slate-400 font-medium italic">No constraints configured in this category.</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-blue-950 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <Sliders size={24} />
            </div>
            Scheduling Rules
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Configure the logic used by the AI engine to generate conflict-free schedules.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-100 text-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-50 transition-all shadow-sm active:scale-95"
          >
            {importing ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />}
            Import Config
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all active:scale-95"
          >
            <RotateCcw size={18} /> Defaults
          </button>
        </div>
      </div>

      <div className="bg-blue-600 rounded-[24px] p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Download size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-100 mb-1">XLSX Import Schema</p>
            <p className="text-sm font-bold">Name, Type (HARD/SOFT), Category, Description, Enabled (TRUE/FALSE), Priority</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2">
          {renderList(hard, 'Hard Constraints (Absolute Rules)')}
          {renderList(soft, 'Soft Constraints (Optimization Goals)')}
        </div>
      )}
    </div>
  );
}

