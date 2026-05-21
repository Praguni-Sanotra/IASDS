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
    
    // Adjust for timezone offset to ensure local date isn't shifted by UTC
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(date.getTime() - offsetMs);
    
    return localDate.toISOString().split('T')[0];
  };

  // Transform internal slots to FullCalendar events
  const events = slots.map((slot, index) => {
    const dayMap: Record<string, number> = {
      'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5
    };
    
    // Map to the current week's dates so they show up on the default calendar view
    const date = getDateForDay(slot.day);

    // Static Grid Mapping:
    // Period 1 -> 09:00
    // Period 2 -> 10:00
    // Period 3 -> 11:00
    // Period 4 -> 12:00
    // Period 5 -> 14:00 (Skip 13:00 for Break)
    // Period 6 -> 15:00
    
    // Period 1 -> 09:00:00
    // Period 2 -> 10:00:00
    // Period 3 -> 11:00:00
    // Period 4 -> 12:00:00
    // Period 5 -> 14:00:00 (Skip 13:00 for Break)
    // Period 6 -> 15:00:00
    
    const pNum = Number(slot.period);
    // Python backend stores periods as 0-5. Map them to 1-6 for the times dict.
    const normalizedPeriod = pNum < 6 ? pNum + 1 : pNum;
    
    const times: Record<number, {s: string, e: string}> = {
      1: { s: "09:00:00", e: "10:00:00" },
      2: { s: "10:00:00", e: "11:00:00" },
      3: { s: "11:00:00", e: "12:00:00" },
      4: { s: "12:00:00", e: "13:00:00" },
      5: { s: "14:00:00", e: "15:00:00" },
      6: { s: "15:00:00", e: "16:00:00" },
    };

    const { s: startTime, e: endTime } = times[normalizedPeriod] || times[1];

    const subjectCode = slot.subjectId?.code || slot.subjectCode || 'SUB';
    const facultyName = slot.facultyId?.name || slot.facultyName || 'Faculty';

    const slotId = slot._id?.toString?.() || slot._id || `slot-${index}`;

    return {
      id: slotId,
      title: subjectCode,
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`,
      allDay: false,
      extendedProps: {
        ...slot,
        _id: slotId,
        subjectCode,
        facultyName,
        facultyInitials: facultyName.split(' ').map((n: string) => n[0]).join('') || '??',
      },
      editable: isAdmin,
    };
  });

  return (
    <div className="flex-1 bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden flex flex-col">
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        dayHeaderFormat={{ weekday: 'short' }}
        slotMinTime="09:00:00"
        slotMaxTime="17:00:00"
        slotDuration="01:00:00"
        snapDuration="01:00:00"
        allDaySlot={false}
        weekends={false}
        hiddenDays={[0]} // Hide Sunday
        events={[
          ...events,
          {
            title: 'LUNCH BREAK',
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: '13:00:00',
            endTime: '14:00:00',
            display: 'background',
            color: '#eff6ff' // Light blue break
          }
        ]}
        editable={isAdmin}
        eventClick={(info) => onSlotClick(info.event.extendedProps)}
        eventDrop={onEventDrop}
        eventContent={(eventInfo) => {
          if (eventInfo.event.display === 'background') return null;
          return <EventCard event={eventInfo.event} />;
        }}
        eventOverlap={false}
        height="auto"
        nowIndicator={false}
        expandRows={false}
        handleWindowResize={true}
        themeSystem="standard"
        slotLabelContent={(arg) => {
          const hour = arg.date.getHours();
          const periodMap: Record<number, string> = {
            9: '1st Period (9:35)',
            10: '2nd Period (10:35)',
            11: '3rd Period (11:35)',
            12: '4th Period (12:35)',
            13: 'BREAK (1:35)',
            14: '5th Period (2:35)',
            15: '6th Period (3:35)',
            16: 'Ending (4:35)'
          };
          
          return (
            <div className="flex flex-col items-center py-1">
              <span className="text-[9px] font-black text-blue-600 uppercase leading-none mb-1">
                {periodMap[hour] || ''}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {arg.text}
              </span>
            </div>
          );
        }}
      />

      <style jsx global>{`
        .fc {
          --fc-border-color: #e2e8f0;
          --fc-page-bg-color: #ffffff;
          --fc-today-bg-color: transparent !important;
          font-family: inherit;
        }
        .fc-day-today {
          background-color: transparent !important;
        }
        .fc .fc-timegrid-slot {
          height: 6rem !important;
          border-bottom: 1px dashed #e2e8f0 !important;
        }
        .fc-v-event {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .fc-timegrid-event-harness {
          padding: 4px !important;
        }
        .fc-timegrid-slot-label-cushion {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .fc-col-header-cell {
          padding: 15px 0 !important;
          background: #f8fafc !important;
          border-bottom: 2px solid #3b82f6 !important;
        }
        .fc-col-header-cell-cushion {
          font-size: 12px;
          font-black: 900;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}
