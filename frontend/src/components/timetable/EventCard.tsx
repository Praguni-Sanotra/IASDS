import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EventCardProps {
  event: any;
}

const typeColors: Record<string, string> = {
  THEORY: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  LAB: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  SEMINAR: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  TUTORIAL: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
};

export function EventCard({ event }: EventCardProps) {
  const { extendedProps } = event;
  const type = extendedProps.type || 'THEORY';
  const isConflict = extendedProps.isConflict;

  return (
    <div className={cn(
      "flex flex-col h-full w-full p-1.5 border rounded-md text-[10px] leading-tight overflow-hidden transition-all hover:shadow-md cursor-pointer",
      isConflict ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" : typeColors[type]
    )}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-bold truncate">{extendedProps.subjectCode}</span>
        {isConflict && <AlertCircle size={10} className="text-red-500 shrink-0" />}
      </div>
      
      <div className="flex items-center gap-1 mb-1">
        <div className="w-4 h-4 rounded-full bg-current opacity-20 flex items-center justify-center shrink-0">
          <span className="text-[8px] font-bold text-current">{extendedProps.facultyInitials}</span>
        </div>
        <span className="truncate opacity-80">{extendedProps.roomNumber}</span>
      </div>

      <div className="mt-auto opacity-70 italic truncate">
        {extendedProps.batchName} - {extendedProps.section}
      </div>
    </div>
  );
}
