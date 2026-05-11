import React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventCard } from './EventCard';

interface TimetableCalendarProps {
  slots: any[];
  onSlotClick: (slot: any) => void;
  isAdmin: boolean;
  onEventDrop: (info: any) => void;
}

const PERIOD_START_HOUR = 8;
const PERIOD_DURATION_MINS = 60; // 55 min class + 5 min break

export function TimetableCalendar({ slots, onSlotClick, isAdmin, onEventDrop }: TimetableCalendarProps) {
  
  // Helper to get date for a specific day of the current week (MON = 0, SAT = 5)
  const getDateForDay = (day: string | number) => {
    const dayMap: Record<string, number> = {
      'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5, 'SUN': 6
    };
    
    const dayIndex = typeof day === 'string' ? dayMap[day.toUpperCase()] : day;
    
    if (dayIndex === undefined) return new Date().toISOString().split('T')[0];

    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday...
    // Adjust to Monday as start of week (1)
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + (dayIndex || 0);
    const date = new Date(today);
    date.setDate(diff);
    
    return date.toISOString().split('T')[0];
  };

  // Transform internal slots to FullCalendar events
  const events = slots.map((slot, index) => {
    const date = getDateForDay(slot.day);
    const startHour = PERIOD_START_HOUR + slot.period;
    
    // Formatting hours to HH:MM:SS
    const startTime = `${String(startHour).padStart(2, '0')}:00:00`;
    const endTime = `${String(startHour).padStart(2, '0')}:55:00`;

    // Handle populated or raw IDs
    const subjectCode = slot.subjectId?.code || slot.subjectCode || 'SUB';
    const facultyName = slot.facultyId?.name || slot.facultyName || 'Faculty';

    return {
      id: `slot-${index}`,
      title: subjectCode,
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      extendedProps: {
        ...slot,
        subjectCode,
        facultyName,
        facultyInitials: facultyName.split(' ').map((n: string) => n[0]).join('') || '??',
      },
      editable: isAdmin,
    };
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 h-[700px] timetable-calendar">
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false} // We have our own navigation in FilterBar
        dayHeaderFormat={{ weekday: 'short' }}
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        slotDuration="00:30:00"
        allDaySlot={false}
        weekends={true}
        hiddenDays={[0]} // Hide Sunday
        events={events}
        editable={isAdmin}
        eventDrop={onEventDrop}
        eventContent={(eventInfo) => <EventCard event={eventInfo.event} />}
        eventClick={(info) => onSlotClick(info.event.extendedProps)}
        eventDrop={onEventDrop}
        height="100%"
        nowIndicator={true}
        expandRows={true}
        handleWindowResize={true}
        themeSystem="standard"
      />

      <style jsx global>{`
        .fc {
          --fc-border-color: #e4e4e7;
          --fc-page-bg-color: transparent;
          font-family: inherit;
        }
        .dark .fc {
          --fc-border-color: #27272a;
        }
        .fc .fc-timegrid-slot {
          height: 3rem !important;
        }
        .fc-v-event {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .fc-timegrid-event-harness {
          margin: 2px !important;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border: 1px solid var(--fc-border-color);
        }
        .fc-col-header-cell {
          padding: 12px 0 !important;
          background: #f9fafb !important;
        }
        .dark .fc-col-header-cell {
          background: #18181b !important;
        }
        .fc-col-header-cell-cushion {
          font-size: 12px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
