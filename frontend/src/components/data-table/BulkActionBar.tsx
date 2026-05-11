import React from 'react';
import { Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionBar({ selectedCount, onClear, onDelete }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 rounded-xl shadow-2xl shadow-black/20 flex items-center gap-4 border border-zinc-800 dark:border-zinc-200">
        <div className="bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
          {selectedCount}
        </div>
        <span className="text-sm font-medium pr-4 border-r border-zinc-700 dark:border-zinc-300">
          Records selected
        </span>
        
        <button
          onClick={onDelete}
          className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 dark:text-red-600 dark:hover:text-red-700 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          <Trash2 size={16} />
          Delete
        </button>

        <button
          onClick={onClear}
          className="p-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-zinc-400 dark:text-zinc-600 transition-colors"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
