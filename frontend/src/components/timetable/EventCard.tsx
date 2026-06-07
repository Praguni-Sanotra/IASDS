import React from 'react';
import { AlertCircle, User, MapPin, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EventCardProps {
  event: any;
}

const typeStyles: Record<string, { bg: string; title: string; body: string; border: string; iconColor: string }> = {
  THEORY: {
    bg: 'bg-sky-50 border-sky-300',
    title: 'text-slate-900',
    body: 'text-slate-700',
    border: 'border-sky-500',
    iconColor: 'text-sky-600',
  },
  LAB: {
    bg: 'bg-violet-50 border-violet-300',
    title: 'text-slate-900',
    body: 'text-slate-700',
    border: 'border-violet-500',
    iconColor: 'text-violet-600',
  },
  SEMINAR: {
    bg: 'bg-emerald-50 border-emerald-300',
    title: 'text-slate-900',
    body: 'text-slate-700',
    border: 'border-emerald-500',
    iconColor: 'text-emerald-600',
  },
  TUTORIAL: {
    bg: 'bg-amber-50 border-amber-300',
    title: 'text-slate-900',
    body: 'text-slate-700',
    border: 'border-amber-500',
    iconColor: 'text-amber-600',
  },
};

export function EventCard({ event }: EventCardProps) {
  const { extendedProps } = event;
  const type = (extendedProps.type || 'THEORY').toUpperCase();
  const isConflict = extendedProps.isConflict;
  const style = typeStyles[type] || typeStyles.THEORY;

  const subjectCode =
    extendedProps.subjectCode ||
    extendedProps.subjectId?.code ||
    event.title ||
    'SUB';

  const facultyName =
    extendedProps.facultyName ||
    extendedProps.facultyId?.name ||
    'No Faculty';

  const roomLabel =
    extendedProps.roomName ||
    extendedProps.roomId?.roomNumber ||
    extendedProps.roomNumber ||
    'Room TBA';

  const batchLabel = (extendedProps.batch || 'Gen').replace(/^batch_/i, '').replace(/_/g, ' ');

  return (
    <div
      className={cn(
        'group relative flex flex-col h-full min-h-[5rem] w-full p-2.5 border-l-4 rounded-md shadow-sm overflow-hidden',
        isConflict
          ? 'bg-red-50 border-red-500 text-red-900'
          : `${style.bg} ${style.border}`
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <h4 className={cn('font-black text-xs tracking-tight uppercase leading-tight', isConflict ? 'text-red-900' : style.title)}>
          {subjectCode}
        </h4>
        {isConflict && <AlertCircle size={12} className="text-red-500 animate-pulse shrink-0" />}
      </div>

      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-1.5">
          <User size={11} className={isConflict ? 'text-red-600' : style.iconColor} />
          <span
            className={cn('text-[10px] font-semibold truncate leading-tight', isConflict ? 'text-red-800' : style.body)}
            title={facultyName}
          >
            {facultyName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin size={11} className={isConflict ? 'text-red-600' : style.iconColor} />
          <span className={cn('text-[10px] font-medium truncate', isConflict ? 'text-red-700' : style.body)}>
            {roomLabel}
          </span>
        </div>
      </div>

      <div className={cn('mt-1.5 pt-1 border-t flex items-center justify-between text-[9px] font-bold uppercase tracking-wide', isConflict ? 'border-red-200 text-red-700' : 'border-slate-300/60 text-slate-600')}>
        <div className="flex items-center gap-1 truncate">
          <Users size={8} />
          <span className="truncate">{batchLabel}</span>
        </div>
        {extendedProps.section && <span>Sec {extendedProps.section}</span>}
      </div>
    </div>
  );
}
