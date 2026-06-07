"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Share2, FileText, Calendar as CalendarIcon, Printer, Sparkles, Plus, PenLine, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { TimetableCalendar } from '../../../components/timetable/TimetableCalendar';
import { FilterBar } from '../../../components/timetable/FilterBar';
import { SlotDetailPopover } from '../../../components/timetable/SlotDetailPopover';
import { GenerationPanel } from '../../../components/timetable/GenerationPanel';
import GenerateAITimetableModal from '../../../components/modals/GenerateAITimetableModal';
// import { useAuthStore } from '../../../store/authStore'; // AUTH DISABLED
import apiClient from '../../../lib/apiClient';


export default function TimetablePage() {
  // const { user } = useAuthStore(); // AUTH DISABLED
  // Mock user for display when auth is disabled
  const user = { role: 'ADMIN' };
  const isAdmin = user?.role === 'ADMIN';

  const [timetable, setTimetable] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timetableDept, setTimetableDept] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('iasds_timetable_dept') || '' : ''
  );
  const [timetableSemester, setTimetableSemester] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('iasds_timetable_semester') || '' : ''
  );
  
  // Filter States
  const [viewAs, setViewAs] = useState('batch');
  const [selectedId, setSelectedId] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [filterOptions, setFilterOptions] = useState<any[]>([]);

  // Selection
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // AI Modal
  const [showAIModal, setShowAIModal] = useState(false);



  const fetchTimetable = useCallback(async (dept?: string, semester?: string) => {
    setIsLoading(true);
    try {
      const storedDept = dept || sessionStorage.getItem('iasds_timetable_dept') || '';
      const storedSem = semester || sessionStorage.getItem('iasds_timetable_semester') || '';

      const params: Record<string, string> = {};
      if (storedDept) params.department = storedDept;
      if (storedSem) params.semesterId = storedSem;

      const res = await apiClient.get('/schedule/latest', { params });
      setTimetable(res.data);
      setSlots(res.data.slots || []);
      if (res.data.department) setTimetableDept(res.data.department);
      if (res.data.semesterId) setTimetableSemester(res.data.semesterId);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load timetable');
      }
      setTimetable(null);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      if (viewAs === 'batch') {
        if (!slots || slots.length === 0) {
          setFilterOptions([]);
          return;
        }
        const uniqueBatches = Array.from(new Set(slots.map((s: any) => s.batch || s.batchId).filter(Boolean)));
        setFilterOptions(uniqueBatches.map(b => {
          const label = (b as string)
            .replace(/^batch_/, '')
            .replace(/_(\d+)_([AB])$/, ' Sem $1 Section $2')
            .replace(/_(\d+)$/, ' Semester $1')
            .replace(/_/g, ' ');
          return { id: b as string, name: label };
        }));
        return;
      }

      if (viewAs === 'faculty') {
        const res = await apiClient.get('/faculty', { params: { limit: 1000 } });
        const allFaculty = res.data.data || res.data || [];
        const nameById = new Map<string, string>();
        allFaculty.forEach((fac: any) => {
          nameById.set(String(fac._id), fac.name || fac.email || 'Unknown');
        });

        slots.forEach((slot: any) => {
          const fac = slot.facultyId;
          const id = typeof fac === 'string' ? fac : fac?._id?.toString();
          if (id && !nameById.has(id)) {
            nameById.set(id, slot.facultyName || fac?.name || 'Unknown Faculty');
          }
        });

        let options = Array.from(nameById.entries()).map(([id, name]) => ({ id, name }));

        if (!showEmpty) {
          const idsInTimetable = new Set(
            slots.map((s: any) => String(s.facultyId?._id || s.facultyId || '')).filter(Boolean)
          );
          options = options.filter((o) => idsInTimetable.has(o.id));
        }

        setFilterOptions(options.sort((a, b) => a.name.localeCompare(b.name)));
        return;
      }

      if (viewAs === 'department') {
        const depts = new Set<string>();
        if (timetable?.department) depts.add(timetable.department);
        slots.forEach((slot: any) => {
          const dept = slot.subjectId?.department;
          if (dept) depts.add(dept);
        });
        setFilterOptions(
          Array.from(depts).map(d => ({ id: d, name: d }))
        );
        return;
      }

      if (viewAs === 'room') {
        const res = await apiClient.get('/rooms', { params: { limit: 1000 } });
        const data = res.data.data || res.data || [];
        setFilterOptions(data.map((item: any) => ({
          id: item._id,
          name: `${item.roomNumber} — ${item.building}`
        })));
        return;
      }
    } catch (error) {
      console.error('Filter load error', error);
    }
  }, [viewAs, slots, showEmpty, timetable?.department]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    setSelectedId('');
  }, [viewAs]);

  const handleExport = async (format: string) => {
    if (!timetable?._id) {
      toast.error('No timetable to export');
      return;
    }
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} export...`);
    try {
      const res = await apiClient.get('/export/timetable', {
        responseType: 'blob',
        params: {
          format,
          batch: viewAs === 'batch' ? selectedId : undefined,
          facultyId: viewAs === 'faculty' ? selectedId : undefined,
          roomId: viewAs === 'room' ? selectedId : undefined,
        },
      });
      const ext = format === 'excel' ? 'xlsx' : format === 'ics' ? 'ics' : 'pdf';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable.${ext}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded', { id: toastId });
    } catch {
      toast.error('Export failed', { id: toastId });
    }
  };

  const handleEventDrop = async (info: any) => {
    const { event, oldEvent, revert } = info;
    
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const day = days[event.start.getDay()] || 'MON';
    const hour = event.start.getHours();
    
    let period = 0;
    if (hour === 9) period = 0;
    else if (hour === 10) period = 1;
    else if (hour === 11) period = 2;
    else if (hour === 12) period = 3;
    else if (hour === 14) period = 4;
    else if (hour === 15) period = 5;
    
    const props = event.extendedProps;
    const slotId = props._id?.toString?.() || String(props._id || '');
    if (!slotId || slotId.startsWith('slot-')) {
      toast.error('Could not find slot ID');
      revert();
      return;
    }

    const toastId = toast.loading('Updating slot position...');

    const saveMove = async (forceUpdate = false) => {
      try {
        await apiClient.put(`/admin/timetable/${timetable._id}/slots/${slotId}`, {
          day,
          period,
          batch: props.batch,
          section: props.section,
          force: forceUpdate
        });
        toast.success(forceUpdate ? 'Slot moved (forced override)' : 'Slot moved successfully', { id: toastId });
        fetchTimetable();
      } catch (error: any) {
        if (error.response?.status === 409) {
          const conflicts = error.response.data?.conflicts || [];
          toast.error(
            <div className="flex flex-col gap-1.5 p-1">
              <span className="font-bold text-red-800">Scheduling Conflict:</span>
              <ul className="text-xs list-disc pl-4 text-red-700 space-y-0.5">
                {conflicts.map((c: string, idx: number) => <li key={idx}>{c}</li>)}
              </ul>
              <button 
                onClick={() => {
                  toast.dismiss(toastId);
                  saveMove(true);
                }} 
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold w-fit active:scale-95 transition-all shadow-md shadow-red-600/10"
              >
                Force Move Anyway
              </button>
            </div>,
            { id: toastId, duration: 10000 }
          );
        } else {
          toast.error(error.response?.data?.message || 'Failed to move slot', { id: toastId });
        }
        revert();
      }
    };

    saveMove(false);
  };

  // Filter slots for the calendar
  const filteredSlots = React.useMemo(() => {
    if (!selectedId) return [];
    
    return slots.filter(slot => {
      if (viewAs === 'batch') {
        return slot.batch === selectedId || slot.batchId === selectedId;
      }
      if (viewAs === 'faculty') {
        const fId = typeof slot.facultyId === 'string'
          ? slot.facultyId
          : slot.facultyId?._id?.toString();
        return fId === selectedId;
      }
      if (viewAs === 'room') {
        const rId = typeof slot.roomId === 'string'
          ? slot.roomId
          : slot.roomId?._id?.toString();
        return rId === selectedId;
      }
      if (viewAs === 'department') {
        const dept = slot.subjectId?.department || timetable?.department;
        return dept?.toUpperCase() === selectedId.toUpperCase();
      }
      return true;
    });
  }, [slots, viewAs, selectedId, timetable?.department]);

  // Auto-select first option when none selected or current selection is invalid
  useEffect(() => {
    if (filterOptions.length > 0) {
      const stillValid = filterOptions.some((o) => o.id === selectedId);
      if (!selectedId || !stillValid) {
        setSelectedId(filterOptions[0].id);
      }
    }
  }, [filterOptions, selectedId]);

  const handleLoadTimetable = (dept: string, sem: string) => {
    if (dept) sessionStorage.setItem('iasds_timetable_dept', dept);
    if (sem) sessionStorage.setItem('iasds_timetable_semester', sem);
    setTimetableDept(dept);
    setTimetableSemester(sem);
    setSelectedId('');
    fetchTimetable(dept, sem);
  };

  const DEPT_OPTIONS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'AIDS', 'AIML'];

  const openManualAddClass = () => {
    if (!timetable) {
      toast.error('Load or generate a timetable first');
      return;
    }
    setSelectedSlot({
      isNew: true,
      isManualAdd: true,
      day: 'MON',
      period: 0,
      subjectId: '',
      facultyId: '',
      roomId: '',
      batch: viewAs === 'batch' && selectedId ? selectedId : `batch_${timetableDept || 'CSE'}_${timetableSemester || '1'}`,
      section: 'A',
    });
  };

  const creditCompliance = React.useMemo(() => {
    const byBatch: Record<string, Record<string, { required: number; scheduled: number; name: string }>> = {};

    slots.forEach((slot: any) => {
      const batch = slot.batch || 'default';
      const sub = slot.subjectId;
      if (!sub?.code) return;

      const code = sub.code;
      const required = sub.hoursPerWeek || sub.credits || 0;
      if (!byBatch[batch]) byBatch[batch] = {};
      if (!byBatch[batch][code]) {
        byBatch[batch][code] = { required, scheduled: 0, name: sub.name || code };
      }
      byBatch[batch][code].scheduled += 1;
    });

    const issues: { batch: string; code: string; name: string; required: number; scheduled: number }[] = [];
    Object.entries(byBatch).forEach(([batch, subjects]) => {
      Object.entries(subjects).forEach(([code, info]) => {
        if (info.required > 0 && info.scheduled !== info.required) {
          issues.push({ batch, code, name: info.name, required: info.required, scheduled: info.scheduled });
        }
      });
    });

    return issues;
  }, [slots]);

  return (
    <div className="relative min-h-screen flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-blue-900">Timetable Explorer</h1>
          <p className="text-sm font-medium text-slate-500">
            View and manage academic schedules
            {timetableDept && timetableSemester
              ? ` — ${timetableDept} Semester ${timetableSemester}`
              : ' across departments.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export tools */}
          <div className="hidden sm:flex items-center bg-blue-50 p-1 rounded-xl border border-blue-100">
            <button
              onClick={() => handleExport('pdf')}
              className="p-2 hover:bg-white rounded-lg text-blue-600 transition-all"
              title="Export PDF"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="p-2 hover:bg-white rounded-lg text-blue-600 transition-all"
              title="Export Excel"
            >
              <Share2 size={18} />
            </button>
            <button
              className="p-2 hover:bg-white rounded-lg text-blue-600 transition-all"
              title="Print"
            >
              <Printer size={18} />
            </button>
          </div>

          {/* Add to Calendar */}
          <button
            onClick={() => handleExport('ics')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <CalendarIcon size={16} /> Add to Calendar
          </button>

          {/* Generate AI Timetable — Admin only */}
          {isAdmin && (
            <button
              id="timetable-page-generate-btn"
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-black rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
            >
              <Sparkles size={16} className="text-yellow-300" />
              Generate AI Timetable
            </button>
          )}

          {/* Manual class creation — Admin only */}
          {isAdmin && timetable && (
            <button
              onClick={openManualAddClass}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              title="Create a new class block with subject, teacher, room, day and period"
            >
              <PenLine size={16} /> Add Class Manually
            </button>
          )}
        </div>
      </div>

      {/* Department / Semester loader */}
      {slots.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Load timetable:</span>
          <select
            value={timetableDept}
            onChange={(e) => handleLoadTimetable(e.target.value, timetableSemester)}
            className="bg-white border border-slate-200 text-sm font-semibold text-slate-800 rounded-lg px-3 py-1.5"
          >
            <option value="">Department</option>
            {DEPT_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={timetableSemester}
            onChange={(e) => handleLoadTimetable(timetableDept, e.target.value)}
            className="bg-white border border-slate-200 text-sm font-semibold text-slate-800 rounded-lg px-3 py-1.5"
          >
            <option value="">Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            {slots.length} total slots in loaded timetable
          </span>
        </div>
      )}

      {/* Filters */}
      <FilterBar 
        viewAs={viewAs}
        setViewAs={setViewAs}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        showEmpty={showEmpty}
        setShowEmpty={setShowEmpty}
        options={filterOptions}
      />

      {/* Calendar Area */}
      <div className="flex-1 min-h-[600px]">
        {isLoading ? (
          <div className="w-full h-[600px] bg-zinc-100 dark:bg-zinc-800/50 rounded-xl animate-pulse flex items-center justify-center">
            <p className="text-zinc-400 font-medium">Loading timetable data...</p>
          </div>
        ) : slots.length > 0 ? (
          <div className="flex flex-col gap-4">
            {isAdmin && timetable && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center gap-2">
                <span className="font-bold">Manual control:</span>
                Click a class to edit, drag to move, or use <strong>Add Class Manually</strong> to create new blocks.
                Conflicts can be overridden with Force Move.
              </div>
            )}
            {creditCompliance.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-900">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <AlertTriangle size={16} />
                  Credit / weekly hours mismatch (1 credit = 1 class per week)
                </div>
                <ul className="text-xs space-y-1 list-disc pl-5">
                  {creditCompliance.slice(0, 8).map((item, i) => (
                    <li key={i}>
                      <strong>{item.code}</strong> ({item.batch.replace(/^batch_/, '')}): scheduled {item.scheduled} / required {item.required} periods
                    </li>
                  ))}
                  {creditCompliance.length > 8 && (
                    <li>…and {creditCompliance.length - 8} more</li>
                  )}
                </ul>
                <p className="text-xs mt-2 text-orange-700">Regenerate the timetable or add classes manually to match credits.</p>
              </div>
            )}
            {!selectedId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-2">
                <CalendarIcon size={18} />
                Please select a {viewAs} to view the schedule.
              </div>
            )}
            {selectedId && filteredSlots.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm font-medium">
                No classes found for this {viewAs}. Try another filter or regenerate the timetable.
              </div>
            )}
            {selectedId && filteredSlots.length > 0 && (
              <div className="text-sm text-slate-500 font-medium px-1">
                Showing <strong className="text-blue-700">{filteredSlots.length}</strong> scheduled class{filteredSlots.length !== 1 ? 'es' : ''}
              </div>
            )}
            <TimetableCalendar 
              slots={filteredSlots} 
              isAdmin={isAdmin}
              onSlotClick={setSelectedSlot}
              onEventDrop={handleEventDrop}
            />
          </div>
        ) : (
          <div className="w-full h-[600px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-5">
              <CalendarIcon size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Published Timetable</h3>
            <p className="text-zinc-500 max-w-xs mt-2 mb-6">
              The academic schedule for the current semester hasn't been published yet.
            </p>
            {isAdmin && (
              <button
                id="empty-state-generate-btn"
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black rounded-2xl hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/30 transition-all active:scale-95"
              >
                <Sparkles size={16} className="text-yellow-300" />
                Generate AI Timetable
              </button>
            )}
          </div>
        )}
      </div>

      {/* Overlays */}
      <SlotDetailPopover 
        slot={selectedSlot}
        timetableId={timetable?._id}
        onClose={() => setSelectedSlot(null)}
        onSuccess={fetchTimetable}
        isAdmin={isAdmin}
      />

      {/* Legacy slide-out panel */}
      {isAdmin && (
        <GenerationPanel
          onScheduleReady={fetchTimetable}
        />
      )}

      {/* AI Timetable Modal */}
      <GenerateAITimetableModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onSuccess={(dept, semester) => {
          if (dept) sessionStorage.setItem('iasds_timetable_dept', dept);
          if (semester) sessionStorage.setItem('iasds_timetable_semester', String(semester));
          fetchTimetable(dept, String(semester));
        }}
      />

    </div>
  );
}
