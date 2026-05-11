"use client";

import React, { useState, useEffect } from 'react';
import { WifiOff, Calendar, RefreshCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import apiClient from '../../lib/apiClient';

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await apiClient.get('/'); // Basic health check
        window.location.reload(); // Reload if back online
      } catch (e) {
        // Still offline
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-8 animate-pulse">
        <WifiOff size={48} className="text-zinc-400" />
      </div>
      
      <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mb-4 tracking-tighter">You're Offline</h1>
      <p className="text-zinc-500 max-w-sm mb-12 leading-relaxed">
        Don't worry! Your viewed timetables and chat history are still available offline. We'll automatically reconnect once your signal returns.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <Link 
          href="/dashboard/timetable"
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <Calendar size={18} /> Cached Timetable
        </Link>
        <button 
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
        >
          {isRetrying ? <RefreshCcw size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          {isRetrying ? 'Checking...' : 'Try Again'}
        </button>
      </div>

      <p className="mt-12 text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />
        Searching for connection
      </p>
    </div>
  );
}
