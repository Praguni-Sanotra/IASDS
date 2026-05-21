"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Download, Share2, FileText, Calendar as CalendarIcon, Printer, Sparkles, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { FilterBar } from '../../../components/timetable/FilterBar';
import { SlotDetailPopover } from '../../../components/timetable/SlotDetailPopover';
import { GenerationPanel } from '../../../components/timetable/GenerationPanel';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../lib/apiClient';

// Lazy load heavy components
const TimetableCalendar = dynamic(() => import('../../../components/timetable/TimetableCalendar').then(mod => mod.TimetableCalendar), {
  loading: () => (
    <div className="w-full h-[600px] bg-zinc-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-zinc-200">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  ),
  ssr: false
});

const GenerateAITimetableModal = dynamic(() => import('../../../components/modals/GenerateAITimetableModal'), {
  ssr: false
});



export default function TimetablePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [timetable, setTimetable] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [viewAs, setViewAs] = useState('batch');
  const [selectedId, setSelectedId] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [filterOptions, setFilterOptions] = useState<any[]>([]);

  // Selection
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // AI Modal
  const [showAIModal, setShowAIModal] = useState(false);



  const fetchTimetable = useCallback(async () => {
    setIsLoading(true);
    try {
      // For now fetching latest published
      const res = await apiClient.get('/schedule/latest');
      setTimetable(res.data);
      setSlots(res.data.slots || []);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load timetable');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      if (viewAs === 'batch') {
        // Extract unique batches directly from the timetable slots
        if (!slots || slots.length === 0) {
          setFilterOptions([]);
          return;
        }
        const uniqueBatches = Array.from(new Set(slots.map((s: any) => s.batch || s.batchId).filter(Boolean)));
        setFilterOptions(uniqueBatches.map(b => ({
          id: b as string,
          name: (b as string).replace('batch_', '').replace('_', ' Semester ')
        })));
        return;
      }

      let endpoint = '/faculty';
      if (viewAs === 'room') endpoint = '/rooms';
      
      const res = await apiClient.get(endpoint);
      const data = res.data.data || res.data || [];
      setFilterOptions(data.map((item: any) => ({
        id: item._id,
        name: item.name || item.roomNumber || item.code
      })));
    } catch (error) {
      console.error('Filter load error', error);
    }
  }, [viewAs, slots]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

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
    
    const slotId = event.extendedProps._id;
    if (!slotId) {
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
        // Slot batch might be an ID or string
        return slot.batch === selectedId || slot.batchId === selectedId;
      }
      if (viewAs === 'faculty') {
        const fId = typeof slot.facultyId === 'string' ? slot.facultyId : slot.facultyId?._id?.toString();
        return fId === selectedId;
      }
      if (viewAs === 'room') {
        const rId = typeof slot.roomId === 'string' ? slot.roomId : slot.roomId?._id?.toString();
        return rId === selectedId;
      }
      return true;
    });
  }, [slots, viewAs, selectedId]);

  // Auto-select first option if none selected
  useEffect(() => {
    if (filterOptions.length > 0 && !selectedId) {
      setSelectedId(filterOptions[0].id);
    }
  }, [filterOptions, selectedId]);

  return (
    <div className="relative min-h-screen flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-blue-900">Timetable Explorer</h1>
          <p className="text-sm font-medium text-slate-500">View and manage academic schedules across departments.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Show Empty Slots Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none bg-white border border-blue-100 px-4 py-2.5 rounded-2xl shadow-sm hover:bg-blue-50 transition-all">
            <input
              type="checkbox"
              checked={showEmpty}
              onChange={(e) => setShowEmpty(e.target.checked)}
              className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm font-bold text-blue-900">Show empty slots</span>
          </label>

          {/* Add to Calendar */}
          <button
            onClick={() => handleExport('ics')}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95"
          >
            <CalendarIcon size={18} /> Add to Calendar
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

          {/* Send to HOD — Admin only */}
          {isAdmin && timetable && (
            <button
              onClick={async () => {
                const toastId = toast.loading('Sending timetable to HOD for approval...');
                try {
                  // Mock API call
                  await apiClient.post(`/admin/timetable/${timetable._id}/send-to-hod`);
                  toast.success('Timetable submitted to HOD successfully!', { id: toastId });
                } catch (error: any) {
                  toast.error(error.response?.data?.message || 'Failed to send to HOD', { id: toastId });
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-black rounded-xl border border-indigo-200 transition-all active:scale-95"
            >
              <Share2 size={16} />
              Send to HOD
            </button>
          )}

          {/* Add Slot — Admin only */}
          {isAdmin && timetable && (
            <button
              onClick={() => setSelectedSlot({
                isNew: true,
                day: 'MON',
                period: 0,
                subjectId: '',
                facultyId: '',
                roomId: '',
                batch: viewAs === 'batch' ? selectedId : '',
                section: 'A'
              })}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Plus size={16} /> Add Class Slot
            </button>
          )}
        </div>
      </div>

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
                <span className="font-bold">Manual edit mode:</span>
                Click any class to edit, drag slots to move, or use <strong>Add Class Slot</strong>.
                Conflicts can be overridden with Force Move.
              </div>
            )}
            {!selectedId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-2">
                <CalendarIcon size={18} />
                Please select a {viewAs} to view the schedule.
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
        onSuccess={fetchTimetable}
      />

    </div>
  );
}
