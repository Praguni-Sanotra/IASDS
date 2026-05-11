import React from 'react';
import { Search, MapPin, User, AlertCircle } from 'lucide-react';

const SUGGESTIONS = [
  { text: "Who teaches on Monday morning?", icon: <Search size={14} /> },
  { text: "Show me free rooms on Wednesday", icon: <MapPin size={14} /> },
  { text: "What's the workload of Dr. Kumar?", icon: <User size={14} /> },
  { text: "Any scheduling conflicts this week?", icon: <AlertCircle size={14} /> },
];

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
      {SUGGESTIONS.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s.text)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
        >
          {s.icon}
          {s.text}
        </button>
      ))}
    </div>
  );
}
