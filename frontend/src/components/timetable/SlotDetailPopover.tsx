import React, { useState, useEffect } from 'react';
import { X, User, MapPin, BookOpen, Users, Edit3, Trash2, Save, Calendar, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../lib/apiClient';

interface SlotDetailPopoverProps {
  slot: any;
  timetableId: string;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin: boolean;
}

export function SlotDetailPopover({ slot, timetableId, onClose, onSuccess, isAdmin }: SlotDetailPopoverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [subjectId, setSubjectId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [day, setDay] = useState('');
  const [period, setPeriod] = useState(0);
  const [batch, setBatch] = useState('');
  const [section, setSection] = useState('');

  // Dropdown options loaded on edit toggle
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Initialize form state
  useEffect(() => {
    if (slot) {
      setSubjectId(slot.subjectId?._id || slot.subjectId || '');
      setFacultyId(slot.facultyId?._id || slot.facultyId || '');
      setRoomId(slot.roomId?._id || slot.roomId || '');
      setDay(slot.day || 'MON');
      setPeriod(slot.period !== undefined ? slot.period : 0);
      setBatch(slot.batch || '');
      setSection(slot.section || 'A');
      setIsEditing(slot.isNew || false); // Open in edit mode directly if new slot!
    }
  }, [slot]);

  // Load dropdown data when entering edit mode
  useEffect(() => {
    if (isEditing && subjects.length === 0) {
      const fetchData = async () => {
        setIsLoadingData(true);
        try {
          const [subRes, facRes, roomRes] = await Promise.all([
            apiClient.get('/subjects', { params: { limit: 1000 } }),
            apiClient.get('/faculty', { params: { limit: 1000 } }),
            apiClient.get('/rooms', { params: { limit: 1000 } })
          ]);
          setSubjects(subRes.data.data || []);
          setFacultyList(facRes.data.data || []);
          setRooms(roomRes.data.data || []);
        } catch (error) {
          toast.error('Failed to load editing options');
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isEditing, subjects.length]);

  if (!slot) return null;

  const handleSave = async (forceUpdate = false) => {
    setIsSaving(true);
    const toastId = toast.loading(forceUpdate ? 'Applying forced slot changes...' : (slot.isNew ? 'Creating slot...' : 'Saving slot changes...'));
    try {
      if (slot.isNew) {
        await apiClient.post(`/admin/timetable/${timetableId}/slots`, {
          subjectId,
          facultyId,
          roomId,
          day,
          period,
          batch,
          section,
          force: forceUpdate
        });
        toast.success(forceUpdate ? 'Slot created (forced override)' : 'Slot created successfully', { id: toastId });
      } else {
        await apiClient.put(`/admin/timetable/${timetableId}/slots/${slot._id}`, {
          subjectId,
          facultyId,
          roomId,
          day,
          period,
          batch,
          section,
          force: forceUpdate
        });
        toast.success(forceUpdate ? 'Slot updated (forced override)' : 'Slot updated successfully', { id: toastId });
      }
      onSuccess();
      onClose();
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
                handleSave(true);
              }} 
              className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold w-fit active:scale-95 transition-all shadow-md shadow-red-600/10"
            >
              Force {slot.isNew ? 'Create' : 'Update'} Anyway
            </button>
          </div>,
          { id: toastId, duration: 10000 }
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to update slot', { id: toastId });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this slot from the timetable?')) return;
    setIsDeleting(true);
    const toastId = toast.loading('Deleting slot...');
    try {
      await apiClient.delete(`/admin/timetable/${timetableId}/slots/${slot._id}`);
      toast.success('Slot deleted successfully', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete slot', { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const periodOptions = [
    { value: 0, label: 'Period 1 (09:35 - 10:35)' },
    { value: 1, label: 'Period 2 (10:35 - 11:35)' },
    { value: 2, label: 'Period 3 (11:35 - 12:35)' },
    { value: 3, label: 'Period 4 (12:35 - 13:35)' },
    { value: 4, label: 'Period 5 (14:35 - 15:35)' },
    { value: 5, label: 'Period 6 (15:35 - 16:35)' }
  ];

  const dayOptions = [
    { value: 'MON', label: 'Monday' },
    { value: 'TUE', label: 'Tuesday' },
    { value: 'WED', label: 'Wednesday' },
    { value: 'THU', label: 'Thursday' },
    { value: 'FRI', label: 'Friday' },
    { value: 'SAT', label: 'Saturday' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
          <div>
            <h3 className="font-black text-lg text-blue-900 dark:text-blue-400">
              {slot.isNew ? 'Create New Slot' : isEditing ? 'Edit Class Assignment' : 'Class Details'}
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {slot.isNew ? 'Manually allocate a new class assignment' : isEditing ? 'Modify timetable slot details manually' : 'View populated schedule values'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          {isEditing ? (
            isLoadingData ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-500">Loading dropdown configurations...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Subject Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={13} /> Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        [{sub.code}] {sub.name} ({sub.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Faculty Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} /> Instructor / Faculty
                  </label>
                  <select
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                  >
                    <option value="">Select Faculty</option>
                    {facultyList.map((fac) => (
                      <option key={fac._id} value={fac._id}>
                        {fac.name} (ID: {fac.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} /> Physical Room
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                  >
                    <option value="">Select Room</option>
                    {rooms.map((rm) => (
                      <option key={rm._id} value={rm._id}>
                        {rm.roomNumber} - {rm.building} (Floor {rm.floor}, Cap: {rm.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grid for Day & Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} /> Day
                    </label>
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                    >
                      {dayOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={13} /> Period Slot
                    </label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                    >
                      {periodOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid for Batch & Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={13} /> Batch ID
                    </label>
                    <input
                      type="text"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="e.g. batch_CSE_1"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={13} /> Section
                    </label>
                    <input
                      type="text"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="e.g. A"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {/* Detail view */}
              <div className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 rounded-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</p>
                  <p className="text-sm font-extrabold text-blue-950 dark:text-zinc-100">{slot.subjectName}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{slot.subjectCode}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 rounded-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faculty Instructor</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{slot.facultyName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Employee ID: {slot.employeeId}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 rounded-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classroom Allocation</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">Room {slot.roomNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{slot.roomType} (Capacity: {slot.roomCapacity} Seats)</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 rounded-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Batch</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{slot.batchName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Section: {slot.section}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <div className="flex items-start gap-3 pl-3">
                  <Calendar size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Day</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{slot.day}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pl-3">
                  <Clock size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Time Slot</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                      {slot.startTime} - {slot.endTime} (P{slot.period + 1})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
          <div>
            {!slot.isNew && isEditing && (
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
              >
                <Trash2 size={16} /> Delete Slot
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isEditing && !slot.isNew) {
                  setIsEditing(false);
                } else {
                  onClose();
                }
              }}
              className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            {isAdmin && (
              isEditing ? (
                <button
                  disabled={isSaving}
                  onClick={() => handleSave(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50"
                >
                  <Save size={16} /> {slot.isNew ? 'Create Slot' : 'Save Changes'}
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/25 active:scale-95"
                >
                  <Edit3 size={16} /> Edit Slot
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
