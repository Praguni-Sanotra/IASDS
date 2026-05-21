import React from 'react';
import { AlertCircle, User, MapPin, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EventCardProps {
  event: any;
}

const typeStyles: Record<string, { bg: string, text: string, border: string, iconColor: string }> = {
  THEORY: {
    bg: 'bg-white',
    text: 'text-blue-900',
    border: 'border-blue-600',
    iconColor: 'text-blue-600'
  },
  LAB: {
    bg: 'bg-blue-50/50',
    text: 'text-blue-950',
    border: 'border-blue-800',
    iconColor: 'text-blue-800'
  },
  SEMINAR: {
    bg: 'bg-white',
    text: 'text-blue-900',
    border: 'border-blue-400',
    iconColor: 'text-blue-400'
  },
  TUTORIAL: {
    bg: 'bg-white',
    text: 'text-blue-900',
    border: 'border-blue-500',
    iconColor: 'text-blue-500'
  },
};

export function EventCard({ event }: EventCardProps) {
  const { extendedProps } = event;
  const type = (extendedProps.type || 'THEORY').toUpperCase();
  const isConflict = extendedProps.isConflict;
  const style = typeStyles[type] || typeStyles.THEORY;

  return (
    <div className={cn(
      "group relative flex flex-col h-full w-full p-3 border-l-4 rounded-xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
      isConflict 
        ? "bg-red-50 border-red-500 text-red-900" 
        : `${style.bg} ${style.border} ${style.text}`
    )}>

      {/* Subject Code & Title */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <h4 className="font-extrabold text-[13px] tracking-tight uppercase leading-tight text-blue-950">
          {extendedProps.subjectCode}
        </h4>
        {isConflict && <AlertCircle size={14} className="text-red-600 animate-pulse" />}
      </div>

      <div className="space-y-2 flex-1">
        {/* Faculty */}
        <div className="flex items-center gap-2">
          <User size={12} className={cn("shrink-0", style.iconColor)} />
          <span className="text-[11px] font-bold text-slate-700 truncate">
            {extendedProps.facultyName || 'No Faculty'}
          </span>
        </div>

        {/* Room */}
        <div className="flex items-center gap-2">
          <MapPin size={12} className={cn("shrink-0", style.iconColor)} />
          <span className="text-[11px] font-bold text-slate-700 truncate">
            {extendedProps.roomName || extendedProps.roomId?.roomNumber || extendedProps.roomId?.name || 'Room TBA'}
          </span>
        </div>
      </div>

      {/* Batch / Section footer */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-blue-800/70">
        <div className="flex items-center gap-1.5">
          <Users size={10} />
          <span>{extendedProps.batch || 'Gen'}</span>
        </div>
        <span className="bg-blue-50 px-2 py-0.5 rounded-md">{extendedProps.section}</span>
      </div>

    </div>
  );
}
