import React from 'react';
import { AlertCircle, User, MapPin, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EventCardProps {
  event: any;
}

const typeStyles: Record<string, { bg: string, text: string, border: string, iconColor: string }> = {
  THEORY: {
    bg: 'bg-blue-50/80 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/50 dark:border-blue-800/50',
    iconColor: 'text-blue-500'
  },
  LAB: {
    bg: 'bg-purple-50/80 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200/50 dark:border-purple-800/50',
    iconColor: 'text-purple-500'
  },
  SEMINAR: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/50 dark:border-emerald-800/50',
    iconColor: 'text-emerald-500'
  },
  TUTORIAL: {
    bg: 'bg-orange-50/80 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200/50 dark:border-orange-800/50',
    iconColor: 'text-orange-500'
  },
};

export function EventCard({ event }: EventCardProps) {
  const { extendedProps } = event;
  const type = (extendedProps.type || 'THEORY').toUpperCase();
  const isConflict = extendedProps.isConflict;
  const style = typeStyles[type] || typeStyles.THEORY;

  return (
    <div className={cn(
      "group relative flex flex-col h-full w-full p-2 border-l-4 rounded-r-lg backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:z-10 shadow-sm",
      isConflict 
        ? "bg-red-50/90 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-300" 
        : `${style.bg} ${style.border} ${style.text}`
    )}>
      {/* Subject Code & Title */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <h4 className="font-black text-[11px] tracking-tight uppercase leading-none">
          {extendedProps.subjectCode}
        </h4>
        {isConflict && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
      </div>

      <div className="space-y-1.5 flex-1">
        {/* Faculty */}
        <div className="flex items-center gap-1.5 opacity-90">
          <User size={10} className={style.iconColor} />
          <span className="text-[10px] font-medium truncate">
            {extendedProps.facultyName || 'No Faculty'}
          </span>
        </div>

        {/* Room */}
        <div className="flex items-center gap-1.5 opacity-90">
          <MapPin size={10} className={style.iconColor} />
          <span className="text-[10px] font-medium truncate">
            {extendedProps.roomName || extendedProps.roomId?.name || 'Room TBA'}
          </span>
        </div>
      </div>

      {/* Batch / Section footer */}
      <div className="mt-2 pt-1 border-t border-current/10 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest opacity-60">
        <div className="flex items-center gap-1">
          <Users size={8} />
          <span>{extendedProps.batch || 'Gen'}</span>
        </div>
        <span>{extendedProps.section}</span>
      </div>
    </div>
  );
}
