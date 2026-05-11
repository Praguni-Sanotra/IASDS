import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { User, Bot, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
      {messages.map((msg, i) => (
        <div 
          key={i} 
          className={cn(
            "flex gap-4 max-w-3xl mx-auto",
            msg.role === 'user' ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            msg.role === 'user' ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          )}>
            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
          </div>

          <div className={cn(
            "flex flex-col gap-1",
            msg.role === 'user' ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10" 
                : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-tl-none shadow-sm"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose dark:prose-invert prose-sm max-w-none">
                {msg.content}
              </ReactMarkdown>
              
              {msg.role === 'assistant' && i === messages.length - 1 && isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
              )}
            </div>
            <span className="text-[10px] text-zinc-400 px-1">
              {formatDistanceToNow(msg.timestamp)} ago
            </span>
          </div>
        </div>
      ))}
      
      {isStreaming && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex gap-4 max-w-3xl mx-auto">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
            <Bot size={16} />
          </div>
          <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-700 shadow-sm">
            <Loader2 size={16} className="animate-spin text-zinc-400" />
          </div>
        </div>
      )}
    </div>
  );
}
