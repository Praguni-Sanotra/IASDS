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

// FullCalendar daysOfWeek: 0=Sun, 1=Mon, ...
const FC_DAY_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const PERIOD_TIMES: Record<number, { s: string; e: string }> = {
  0: { s: '09:00:00', e: '10:00:00' },
  1: { s: '10:00:00', e: '11:00:00' },
  2: { s: '11:00:00', e: '12:00:00' },
  3: { s: '12:00:00', e: '13:00:00' },
  4: { s: '14:00:00', e: '15:00:00' },
  5: { s: '15:00:00', e: '16:00:00' },
};

export function TimetableCalendar({ slots, onSlotClick, isAdmin, onEventDrop }: TimetableCalendarProps) {
  const events = slots.map((slot, index) => {
    const pNum = Number(slot.period);
    const periodKey = pNum >= 0 && pNum <= 5 ? pNum : 0;
    const gridTimes = PERIOD_TIMES[periodKey];

    // Align to grid hour slots (09:00–10:00, etc.) — DB times like 10:35 cause thin slivers
    const startTime = gridTimes.s;
    const endTime = gridTimes.e;

    const subjectCode = slot.subjectId?.code || slot.subjectCode || 'SUB';
    const facultyName =
      slot.facultyName ||
      slot.facultyId?.name ||
      'No Faculty';
    const subjectType = (slot.subjectId?.type || slot.type || (slot.isLab ? 'LAB' : 'THEORY')).toUpperCase();
    const roomNumber = slot.roomId?.roomNumber || slot.roomNumber;
    const dayOfWeek = FC_DAY_MAP[String(slot.day || 'MON').toUpperCase()] ?? 1;

    const slotId = slot._id?.toString?.() || (slot._id ? String(slot._id) : '');
    if (!slotId) {
      console.warn('Timetable slot missing _id at index', index, slot);
    }

    return {
      id: slotId,
      title: subjectCode,
      daysOfWeek: [dayOfWeek],
      startTime,
      endTime,
      extendedProps: {
        ...slot,
        _id: slotId,
        subjectCode,
        facultyName,
        type: subjectType,
        roomName: roomNumber,
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
        firstDay={1}
        slotMinTime="09:00:00"
        slotMaxTime="17:00:00"
        slotDuration="01:00:00"
        snapDuration="01:00:00"
        allDaySlot={false}
        weekends={true}
        hiddenDays={[0]}
        events={[
          ...events,
          {
            title: 'LUNCH BREAK',
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: '13:00:00',
            endTime: '14:00:00',
            display: 'background',
            color: '#eff6ff',
          },
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
        expandRows={true}
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
            16: 'Ending (4:35)',
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
        .fc-timegrid-event-harness {
          margin: 2px 4px !important;
          min-height: 5.25rem !important;
        }
        .fc-timegrid-event-harness-inset .fc-timegrid-event-harness {
          min-height: 5.25rem !important;
        }
        .fc-v-event {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          min-height: 5rem !important;
        }
        .fc-v-event .fc-event-main {
          height: 100% !important;
          min-height: 5rem !important;
        }
        .fc-timegrid-event {
          overflow: visible !important;
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
