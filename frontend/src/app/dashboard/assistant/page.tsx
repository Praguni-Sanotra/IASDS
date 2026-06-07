"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  History, 
  Menu, 
  X, 
  Zap, 
  Info, 
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { HistorySidebar } from '../../../components/assistant/HistorySidebar';
import { MessageList } from '../../../components/assistant/MessageList';
import { ChatInput } from '../../../components/assistant/ChatInput';
import { SuggestionChips } from '../../../components/assistant/SuggestionChips';
import { useAuthStore } from '../../../store/authStore';
import apiClient from '../../../lib/apiClient';
import { cn } from '../../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

export default function AssistantPage() {
  const { user, accessToken } = useAuthStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timetableInfo, setTimetableInfo] = useState<any>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('iasds_chat_sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Revive dates
      parsed.forEach((s: any) => s.messages.forEach((m: any) => m.timestamp = new Date(m.timestamp)));
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      handleNewChat();
    }
    
    // Fetch context info
    apiClient.get('/schedule/latest').then(res => setTimetableInfo(res.data)).catch(() => {});
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('iasds_chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Conversation',
      timestamp: Date.now(),
      messages: []
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id && filtered.length > 0) setActiveSessionId(filtered[0].id);
    else if (filtered.length === 0) handleNewChat();
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleSend = async (text: string) => {
    if (!activeSession) return;

    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    const updatedMessages = [...activeSession.messages, userMessage];
    
    // Update title if it's the first message
    let updatedTitle = activeSession.title;
    if (activeSession.messages.length === 0) {
      updatedTitle = text.length > 30 ? text.slice(0, 30) + '...' : text;
    }

    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: updatedTitle, messages: updatedMessages } : s));
    
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedule/ai-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: text, sessionId: activeSessionId }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Assistant failed to respond');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to start stream');

      let assistantContent = '';
      const assistantMessage: Message = { role: 'assistant', content: '', timestamp: new Date() };
      
      // Initial empty assistant message
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...updatedMessages, assistantMessage] } : s));

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.token) {
                assistantContent += data.token;
                setSessions(prev => prev.map(s => 
                  s.id === activeSessionId 
                    ? { ...s, messages: s.messages.map((m, idx) => idx === s.messages.length - 1 ? { ...m, content: assistantContent } : m) } 
                    : s
                ));
              }
            } catch (e) {
              console.error('Parsing chunk error', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Generation stopped');
      } else {
        toast.error('AI Service Error. Please try again.');
        console.error(error);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="fixed inset-0 top-16 md:left-64 flex overflow-hidden bg-white dark:bg-zinc-950">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* History Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <HistorySidebar 
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          onDelete={handleDeleteSession}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Navigation / Status Bar */}
        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Bot size={16} className="text-blue-600" />
                Timetable Assistant
              </h2>
              {timetableInfo ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Knowledge Base: {timetableInfo.semester} (Published {new Date(timetableInfo.createdAt).toLocaleDateString()})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-zinc-500 font-medium">Syncing live timetable context...</span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800/50">
            <Zap size={10} fill="currentColor" /> AI Powered
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/30 dark:bg-zinc-900/10">
          {activeSession?.messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 mb-6 shadow-2xl shadow-blue-500/20 rotate-3 transition-transform hover:rotate-0 cursor-default">
                <Bot size={40} />
              </div>
              <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-2">How can I help you today?</h1>
              <p className="text-sm text-zinc-500 text-center max-w-sm mb-10 leading-relaxed">
                I have access to the MIET institutional timetable. Ask me anything about faculty loads, room availability, or class schedules.
              </p>
              <SuggestionChips onSelect={handleSend} />
            </div>
          ) : (
            <MessageList 
              messages={activeSession?.messages || []} 
              isStreaming={isStreaming} 
            />
          )}
        </div>

        {/* Input Bar */}
        <ChatInput 
          onSend={handleSend} 
          onStop={handleStop}
          isLoading={isStreaming} 
        />

        {/* Error/Context Alerts */}
        {!timetableInfo && !isStreaming && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none">
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                No published timetable found. AI responses will be based on historical data or system defaults.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
