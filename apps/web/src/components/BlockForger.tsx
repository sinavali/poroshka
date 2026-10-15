'use client';

import React, { useState } from 'react';
import { Hammer, Copy, Check, Sparkles, Wand2 } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client.ts';

interface ForgeResult {
  modality: string;
  stitched_template: string;
  compiled_text: string;
  slots: Array<{ slot_key: string; label_fa: string; default_value_en: string }>;
  resolved_slot_values: Record<string, string>;
}

export function BlockForger() {
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('text_writing');
  const [forceFarsi, setForceFarsi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleForge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const cachedProfile = localStorage.getItem('promptjoo_user_profile');
      const profile = cachedProfile ? JSON.parse(cachedProfile) : {};

      const data = await fetchFromApi<ForgeResult>('/api/v1/catalog/forge', {
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          modality,
          force_farsi_output: forceFarsi,
          profile
        })
      });

      setResult(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.compiled_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden mb-12">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-6 relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Hammer className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            موتور بلوک‌چین پرامپت (Zero-LLM Block Forger)
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              رایگان و بدون تاخیر
            </span>
          </h3>
          <p className="text-xs text-gray-400">
            ایده خود را بنویسید تا سیستم به صورت آنی بلوک‌های استاندارد (نقش، وظیفه، قیود و فرمت) را ترکیب کرده و یک پرامپت بی‌نقص بسازد.
          </p>
        </div>
      </div>

      <form onSubmit={handleForge} className="space-y-4 relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="مثلاً: سناریو معرفی لپ‌تاپ گیمینگ برای استوری اینستاگرام..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="text_writing">تولید محتوا و کپشن</option>
              <option value="text_to_image">تولید تصویر (میدجورنی)</option>
              <option value="data_structuring">اکسل و داده</option>
              <option value="code_tech">برنامه‌نویسی و SQL</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={forceFarsi}
              onChange={(e) => setForceFarsi(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-white/20"
            />
            <span>دستور خروجی کاملاً فارسی روان (fa-IR) اضافه شود</span>
          </label>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50 spring-transition"
          >
            <Wand2 className="w-4 h-4" />
            <span>{loading ? 'در حال ساخت پرامپت...' : 'ساخت آنی پرامپت'}</span>
          </button>
        </div>
      </form>

      {/* Result Display */}
      {result && (
        <div className="mt-6 pt-6 border-t border-white/10 space-y-4 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              پرامپت مهندسی‌شده آماده است:
            </span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold spring-transition ${
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-gray-200 hover:bg-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی در کلیپ‌بورد</span>
                </>
              )}
            </button>
          </div>

          <pre className="bilingual-code text-xs bg-slate-950 p-4 rounded-2xl border border-white/10 text-gray-300 max-h-60 overflow-y-auto">
            {result.compiled_text}
          </pre>
        </div>
      )}
    </div>
  );
}
