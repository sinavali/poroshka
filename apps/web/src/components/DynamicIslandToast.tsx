'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Copy, Brain, UserCheck, AlertTriangle } from 'lucide-react';

export interface ToastPayload {
  title: string;
  message?: string;
  type?: 'copy' | 'memory' | 'auth' | 'forge' | 'error' | 'success';
}

export function showDynamicToast(payload: ToastPayload) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('promptjoo:toast', { detail: payload }));
  }
}

export function DynamicIslandToast() {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastPayload>;
      setToast(customEvent.detail);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(null);
      }, 2600);
    };

    window.addEventListener('promptjoo:toast', handleToast);
    return () => {
      window.removeEventListener('promptjoo:toast', handleToast);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.type) {
      case 'copy':
        return <Copy className="w-4 h-4 text-emerald-400" />;
      case 'memory':
        return <Brain className="w-4 h-4 text-indigo-400" />;
      case 'auth':
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'forge':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed top-6 left-1/2 z-50 pointer-events-none animate-dynamic-island">
      <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-950/90 text-white border border-white/15 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 pointer-events-auto">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
          {renderIcon()}
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs font-bold text-white tracking-tight">{toast.title}</span>
          {toast.message && (
            <span className="text-[10px] text-gray-400 line-clamp-1">{toast.message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
