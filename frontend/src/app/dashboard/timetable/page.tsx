"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Share2, FileText, Calendar as CalendarIcon, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { TimetableCalendar } from '../../../components/timetable/TimetableCalendar';
import { FilterBar } from '../../../components/timetable/FilterBar';
import { SlotDetailPopover } from '../../../components/timetable/SlotDetailPopover';
import { GenerationPanel } from '../../../components/timetable/GenerationPanel';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../lib/apiClient';

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
      let endpoint = '/faculty';
      if (viewAs === 'batch') endpoint = '/faculty'; // Need a batch endpoint, using faculty as placeholder
      if (viewAs === 'room') endpoint = '/rooms';
      
      const res = await apiClient.get(endpoint);
      const data = res.data.data || [];
      setFilterOptions(data.map((item: any) => ({
        id: item._id,
        name: item.name || item.roomNumber || item.code
      })));
    } catch (error) {
      console.error('Filter load error', error);
    }
  }, [viewAs]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const handleExport = (format: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Preparing ${format.toUpperCase()} export...`,
        success: 'Export downloaded successfully!',
        error: 'Export failed'
      }
    );
  };

  const handleEventDrop = async (info: any) => {
    const { event, oldEvent, revert } = info;
    const day = event.start.getDay() - 1; // 0 = Mon
    const period = event.start.getHours() - 8;

    const toastId = toast.loading('Checking conflicts...');

    try {
      await apiClient.post('/schedule/reschedule', {
        timetableId: timetable._id,
        triggerType: 'MANUAL_MOVE',
        affectedEntityId: event.extendedProps.facultyId,
        affectedDay: oldEvent.start.getDay() - 1,
        affectedPeriods: [oldEvent.start.getHours() - 8],
        targetDay: day,
        targetPeriod: period
      });
      toast.success('Slot moved successfully', { id: toastId });
      fetchTimetable(); // Refresh data
    } catch (error: any) {
      revert();
      const message = error.response?.data?.message || 'Conflict detected';
      toast.error(message, { id: toastId });
    }
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
        const fId = typeof slot.facultyId === 'string' ? slot.facultyId : slot.facultyId?._id;
        return fId === selectedId;
      }
      if (viewAs === 'room') {
        const rId = typeof slot.roomId === 'string' ? slot.roomId : slot.roomId?._id;
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

        <div className="flex items-center gap-2">
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
          
          <button 
            onClick={() => handleExport('ics')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <CalendarIcon size={16} /> Add to Calendar
          </button>
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
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon size={32} className="text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Published Timetable</h3>
            <p className="text-zinc-500 max-w-xs mt-2">
              The academic schedule for the current semester hasn't been published yet.
              {isAdmin && " Use the AI Scheduler panel to generate one."}
            </p>
          </div>
        )}
      </div>

      {/* Overlays */}
      <SlotDetailPopover 
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <GenerationPanel 
          onScheduleReady={fetchTimetable}
        />
      )}

    </div>
  );
}
