import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Command } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 500))}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the timetable..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 resize-none dark:text-zinc-200 min-h-[40px] max-h-[120px]"
        />
        
        <div className="flex flex-col items-center justify-end h-[40px] px-1 pb-1">
          <span className="text-[10px] text-zinc-400 font-bold mb-1">
            {input.length}/500
          </span>
          {isLoading ? (
            <button
              onClick={onStop}
              className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-200 transition-colors"
              title="Stop generating"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-center text-zinc-400 mt-2 flex items-center justify-center gap-1">
        <Command size={10} /> Enter to send | Shift + Enter for new line
      </p>
    </div>
  );
}
