'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  Database,
  Download,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { showDynamicToast } from './DynamicIslandToast';
import { AdminPromptCreatorModal } from './AdminPromptCreatorModal';
import { AdminCleanStartModal } from './AdminCleanStartModal';
import { AdminBulkIngestionTab } from './AdminBulkIngestionTab';
import { AdminBatchUploader } from './AdminBatchUploader';

export function AdminDatasetsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug] : [];
  const pathSubTab = slug[0] === 'datasets' && slug[1] ? slug[1] : null;

  const urlSubTab = (pathSubTab || searchParams.get('dataset_tab') || 'upload') as 'upload' | 'bulk_ingestion';
  const initialTab = urlSubTab === 'bulk_ingestion' ? 'bulk_ingestion' : 'upload';

  const [activeTab, setActiveTab] = useState<'upload' | 'bulk_ingestion'>(initialTab);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isCleanStartOpen, setIsCleanStartOpen] = useState(false);

  useEffect(() => {
    if (urlSubTab && (urlSubTab === 'upload' || urlSubTab === 'bulk_ingestion')) {
      setActiveTab(urlSubTab);
    }
  }, [urlSubTab]);

  const handleTabChange = (tab: 'upload' | 'bulk_ingestion') => {
    setActiveTab(tab);
    router.push(`/admin/datasets/${tab}`);
  };

  const handleDownloadCsv = () => {
    window.open('/api/v1/ingestion/export/csv', '_blank');
  };

  const handleDownloadJson = () => {
    window.open('/api/v1/ingestion/export/json', '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Top Header Actions & Export Bar */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              مدیریت و درون‌ریزی پایگاه داده پرامپت‌ها
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              درون‌ریزی فایل‌های JSON پردازش‌شده، فایل‌های CSV خام و اجرای پایپ‌لاین غنی‌سازی هوش مصنوعی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="pressable flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت تکی پرامپت</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            title="دریافت فایل خروجی کامل JSON با اسکیمای اسلات‌ها"
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-600" />
            <span>خروجی JSON</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
            title="دریافت فایل خروجی CSV سازگار با اکسل"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>خروجی CSV</span>
          </button>

          <button
            onClick={() => setIsCleanStartOpen(true)}
            className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs"
            title="پاک‌سازی کامل تمام پرامپت‌ها برای شروع تازه"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>شروع تازه (Hard Reset)</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Upload vs Bulk Ingestion */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => handleTabChange('upload')}
          className={`pressable flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>بارگذاری فایل (JSON پردازش‌شده یا CSV)</span>
        </button>

        <button
          onClick={() => handleTabChange('bulk_ingestion')}
          className={`pressable flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'bulk_ingestion'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>غنی‌سازی دسته‌جمعی پرامپت‌ها (Bulk Ingestion)</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'upload' && <AdminBatchUploader />}
      {activeTab === 'bulk_ingestion' && <AdminBulkIngestionTab />}

      {/* Add Single Prompt Modal */}
      <AdminPromptCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onCreated={() => {
          showDynamicToast({ title: 'پرامپت با موفقیت ایجاد شد', type: 'success' });
        }}
      />

      {/* Clean Start / Hard Reset Modal */}
      <AdminCleanStartModal
        isOpen={isCleanStartOpen}
        onClose={() => setIsCleanStartOpen(false)}
        onSuccess={() => {
          showDynamicToast({ title: 'داده‌های کاتالوگ با موفقیت پاک‌سازی شدند', type: 'success' });
        }}
      />
    </div>
  );
}
