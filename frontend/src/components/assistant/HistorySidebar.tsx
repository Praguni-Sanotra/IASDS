import React from 'react';
import { MessageSquare, Plus, Clock, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Session {
  id: string;
  title: string;
  timestamp: number;
}

interface HistorySidebarProps {
  sessions: Session[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function HistorySidebar({ sessions, activeId, onSelect, onNew, onDelete }: HistorySidebarProps) {
  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-4">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all shadow-sm"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Clock size={12} /> Recent Conversations
        </div>
        
        {sessions.map((s) => (
          <div 
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
              activeId === s.id 
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare size={16} className={activeId === s.id ? "text-blue-600" : "text-zinc-400"} />
              <span className="text-sm font-medium truncate">{s.title}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
