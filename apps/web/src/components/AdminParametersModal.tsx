'use client';

import React, { useEffect } from 'react';
import { PromptParameter, AdminPromptItem } from './AdminPromptsView';

interface AdminParametersModalProps {
  prompt: AdminPromptItem | null;
  onClose: () => void;
}

export function AdminParametersModal({ prompt, onClose }: AdminParametersModalProps) {
  useEffect(() => {
    if (!prompt) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [prompt, onClose]);

  if (!prompt) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md w-screen h-screen animate-fade-in !m-0 !mt-0"
      style={{ margin: 0, marginTop: 0 }}
      dir="rtl"
    >
      <div className="glass-panel w-full max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              پارامترهای متغیر: {prompt.title_fa}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
              {prompt.slug}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {prompt.parameters_summary.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">این پرامپت پارامتر متغیری ندارد.</p>
          ) : (
            prompt.parameters_summary.map((param: PromptParameter) => (
              <div
                key={param.slot_key}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 block">{param.label_fa}</span>
                  <span className="font-mono text-[10px] text-slate-400">{param.slot_key}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-200/80 font-mono text-[10px] text-slate-700">
                    {param.input_type}
                  </span>
                  {param.is_required && (
                    <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold">
                      اجباری
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="pressable px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
