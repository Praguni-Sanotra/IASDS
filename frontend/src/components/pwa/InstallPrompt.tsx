"use client";

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, ArrowUpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already dismissed in last 7 days
    const dismissedAt = localStorage.getItem('pwa_dismissed_at');
    if (dismissedAt) {
      const now = Date.now();
      const diff = now - parseInt(dismissedAt);
      if (diff < 7 * 24 * 60 * 60 * 1000) return;
    }

    // iOS detection
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Show iOS instructions if standalone is false
    if (isIOSDevice && !(window.navigator as any).standalone) {
      setShow(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed_at', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-sm">
      <div className="bg-zinc-900 text-white p-5 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl font-black italic">T</span>
            </div>
            <div>
              <h3 className="font-bold text-sm">Add IASDS to Home Screen</h3>
              <p className="text-[10px] text-zinc-400">Install our smart app for quick access and offline use.</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {isIOS ? (
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 text-[10px] border border-white/5">
            <ArrowUpCircle size={16} className="text-blue-400" />
            <span>Tap <span className="font-bold">Share</span> and then <span className="font-bold">"Add to Home Screen"</span></span>
          </div>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleInstall}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Download size={14} /> Install Now
            </button>
            <button 
              onClick={handleDismiss}
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all"
            >
              Not Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
