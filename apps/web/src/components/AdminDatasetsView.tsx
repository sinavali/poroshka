'use client';

import React, { useState } from 'react';
import { Database, Download, Upload, CheckCircle2, AlertCircle, RefreshCw, FileText, ArrowDownToLine, Plus, Code } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { AdminPromptCreatorModal } from './AdminPromptCreatorModal';

export function AdminDatasetsView() {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [activeMode, setActiveMode] = useState<'file' | 'raw'>('file');

  const handleDownloadCsv = () => {
    window.open('/api/v1/ingestion/export/csv', '_blank');
  };

  const handleDownloadJson = () => {
    window.open('/api/v1/ingestion/export/json', '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      setSyncResult(null);
    };
    reader.readAsText(file);
  };

  const handleStartSync = async () => {
    if (!fileContent.trim()) {
      showDynamicToast({ title: 'لطفاً ابتدا فایل دیتاست را انتخاب یا وارد کنید', type: 'error' });
      return;
    }

    setLoading(true);
    setSyncResult(null);

    try {
      let payload: any;
      if (fileName.endsWith('.json') || fileContent.trim().startsWith('[')) {
        payload = JSON.parse(fileContent);
      } else {
        payload = { csv_text: fileContent };
      }

      const res = await fetchFromApi<any>('/api/v1/ingestion/import', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSyncResult(res);
      showDynamicToast({
        title: 'همگام‌سازی با موفقیت انجام شد',
        message: `${res.inserted} مورد جدید، ${res.skipped_duplicates} مورد تکراری`,
        type: 'success'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری دیتاست';
      showDynamicToast({ title: 'خطا در بارگذاری', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">همگام‌سازی و مدیریت دیتاست‌ها (Dev ⟷ Prod)</h3>
            <p className="text-xs text-slate-500">
              خروجی استاندارد با هماهنگی کامل اکسل و ورود بدون ایجاد موارد تکراری بر اساس محتوا و اسلاگ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="pressable flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن پرامپت تکی</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="pressable flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>خروجی CSV (اکسل)</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="pressable flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-600" />
            <span>خروجی JSON</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveMode('file')}
          className={`px-4 py-2 rounded-xl text-xs font-bold spring-transition ${
            activeMode === 'file'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          بارگذاری فایل (CSV / JSON)
        </button>
        <button
          onClick={() => setActiveMode('raw')}
          className={`px-4 py-2 rounded-xl text-xs font-bold spring-transition ${
            activeMode === 'raw'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          استودیو درج مستقیم کد (JSON Array یا CSV)
        </button>
      </div>

      {/* Upload and Sync Card */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        {activeMode === 'file' ? (
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1">بارگذاری فایل دیتاست جدید</h4>
            <p className="text-xs text-slate-500 mb-4">
              فایل CSV یا JSON استخراج‌شده از محیط لوکال یا منابع داده را انتخاب کنید. سیستم به‌طور خودکار موارد تکراری را نادیده گرفته و فقط رکوردهای جدید را ثبت می‌کند.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="pressable flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>انتخاب فایل CSV یا JSON</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fileName && (
                <span className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  {fileName} ({Math.round(fileContent.length / 1024)} KB)
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800">درج مستقیم محتوای متنی دیتاست</h4>
            <p className="text-xs text-slate-500">
              آرایه رکوردهای پرامپت را به فرمت JSON Array یا خطوط CSV اینجا الصاق کنید:
            </p>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setFileContent(e.target.value);
                setFileName('raw_input.json');
              }}
              dir="ltr"
              placeholder={`[\n  {\n    "title_fa": "کپشن اینستاگرام برای معرفی محصول",\n    "template_en": "Write an engaging caption about {{product}}..."\n  }\n]`}
              className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Text preview */}
        {activeMode === 'file' && fileContent && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">پیش‌نمایش محتوای فایل:</span>
            <pre className="text-[11px] font-mono bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {fileContent.slice(0, 800)}
              {fileContent.length > 800 ? '\n... (بقیه فایل)' : ''}
            </pre>
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            onClick={handleStartSync}
            disabled={loading || !fileContent.trim()}
            className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'در حال بررسی و همگام‌سازی...' : 'شروع همگام‌سازی یکتا'}</span>
          </button>
        </div>

        {/* Results Card */}
        {syncResult && (
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>نتایج همگام‌سازی: {syncResult.message}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-500 block text-[11px]">کل ردیف‌های پردازش‌شده</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {syncResult.total_processed?.toLocaleString('fa-IR')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-500 block text-[11px]">پرامپت‌های جدید (ثبت‌شده)</span>
                <span className="text-base font-black text-emerald-600 font-mono">
                  {syncResult.inserted?.toLocaleString('fa-IR')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-500 block text-[11px]">موارد تکراری (نادیده‌گرفته)</span>
                <span className="text-base font-black text-slate-600 font-mono">
                  {syncResult.skipped_duplicates?.toLocaleString('fa-IR')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-500 block text-[11px]">خطاها</span>
                <span className="text-base font-black text-rose-600 font-mono">
                  {syncResult.error_count?.toLocaleString('fa-IR') || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <AdminPromptCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
      />
    </div>
  );
}
