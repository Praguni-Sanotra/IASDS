"use client";

import React, { useEffect, useState } from 'react';
import { Sliders, RotateCcw, Loader2 } from 'lucide-react';
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

  const renderList = (items: Constraint[], title: string) => (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100">
        {title}
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((c) => (
          <li key={c._id} className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</p>
              {c.description && (
                <p className="text-sm text-zinc-500 mt-1">{c.description}</p>
              )}
              <p className="text-xs text-zinc-400 mt-1">Priority: {c.priority}</p>
            </div>
            <button
              onClick={() => toggleConstraint(c)}
              disabled={savingId === c._id}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                c.isEnabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  c.isEnabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </li>
        ))}
        {items.length === 0 && !loading && (
          <li className="px-6 py-8 text-center text-zinc-500 text-sm">No constraints configured.</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sliders className="text-blue-600" /> Scheduling Constraints
          </h1>
          <p className="text-sm text-zinc-500">
            Enable or disable rules used by the AI timetable scheduler.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-semibold hover:bg-zinc-200"
        >
          <RotateCcw size={16} /> Reset Defaults
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {renderList(hard, 'Hard Constraints (must satisfy)')}
          {renderList(soft, 'Soft Constraints (optimize when possible)')}
        </div>
      )}
    </div>
  );
}
