'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Sparkles,
  Sliders,
  Trash2,
  Cpu
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { type BulkStatusState } from './admin-ingestion-types';
import { AdminBulkIngestionMetrics } from './AdminBulkIngestionMetrics';
import { AdminCleanStartModal } from './AdminCleanStartModal';

export function AdminBulkIngestionTab() {
  const [status, setStatus] = useState<BulkStatusState | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCleanStartOpen, setIsCleanStartOpen] = useState(false);

  // Ingestion execution settings
  const [batchSize, setBatchSize] = useState<number>(10);
  const [delayMs, setDelayMs] = useState<number>(250);
  const initializedBatchSettingsRef = useRef(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchFromApi<BulkStatusState>('/api/v1/ingestion/bulk/status');
      setStatus(data);
      if (!initializedBatchSettingsRef.current && data) {
        if (typeof data.batch_size === 'number' && data.batch_size > 0) {
          setBatchSize(data.batch_size);
        }
        if (typeof data.delay_ms === 'number' && data.delay_ms >= 0) {
          setDelayMs(data.delay_ms);
        }
        initializedBatchSettingsRef.current = true;
      }
    } catch {
      // Ignore poll errors
    }
  }, []);

  useEffect(() => {
    setLoadingStatus(true);
    fetchStatus().finally(() => setLoadingStatus(false));

    // Polling while running
    pollTimerRef.current = setInterval(() => {
      fetchStatus();
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchStatus]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await fetchFromApi<{ ok: boolean; message: string; status: BulkStatusState }>(
        '/api/v1/ingestion/bulk/start',
        {
          method: 'POST',
          body: JSON.stringify({ batch_size: batchSize, delay_ms: delayMs })
        }
      );
      setStatus(res.status);
      showDynamicToast({ title: 'پایپ‌لاین غنی‌سازی آغاز شد', message: res.message, type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در اجرای پایپ‌لاین';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const res = await fetchFromApi<{ ok: boolean; status: BulkStatusState }>('/api/v1/ingestion/bulk/pause', {
        method: 'POST'
      });
      setStatus(res.status);
      showDynamicToast({ title: 'فرآیند موقتاً متوقف شد', type: 'forge' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در توقف موقت';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const res = await fetchFromApi<{ ok: boolean; status: BulkStatusState }>('/api/v1/ingestion/bulk/resume', {
        method: 'POST',
        body: JSON.stringify({ batch_size: batchSize, delay_ms: delayMs })
      });
      setStatus(res.status);
      showDynamicToast({ title: 'ادامه فرآیند غنی‌سازی فعال گردید', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ادامه فرآیند';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      const res = await fetchFromApi<{ ok: boolean; status: BulkStatusState }>('/api/v1/ingestion/bulk/stop', {
        method: 'POST'
      });
      setStatus(res.status);
      showDynamicToast({ title: 'فرآیند لغو گردید', type: 'forge' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در لغو فرآیند';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const isRunning = status?.status === 'RUNNING';
  const isPaused = status?.status === 'PAUSED';

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* 1. MAIN BULK INGESTION CONTROLLER */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  پایپ‌لاین غنی‌سازی دسته‌جمعی پرامپت‌ها (Bulk Ingestion)
                </h3>
                {status && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border ${
                      status.status === 'RUNNING'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : status.status === 'PAUSED'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : status.status === 'COMPLETED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : status.status === 'FAILED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {status.status === 'RUNNING' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                    {status.status === 'RUNNING' && 'در حال پردازش زنده'}
                    {status.status === 'PAUSED' && 'متوقف موقت (Paused)'}
                    {status.status === 'COMPLETED' && 'تکمیل شده (۱۰۰٪)'}
                    {status.status === 'STOPPED' && 'متوقف شده (Stopped)'}
                    {status.status === 'IDLE' && 'آماده پردازش'}
                    {status.status === 'FAILED' && 'خطا در اجرا'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                غنی‌سازی خودکار پرامپت‌ها با AvalAI، تولید اسلات‌های متغیر و تفکیک بلوک‌های اتمیک
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
            {!isRunning && !isPaused && (
              <button
                onClick={handleStart}
                disabled={actionLoading || loadingStatus}
                className="pressable flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>شروع غنی‌سازی هوشمند</span>
              </button>
            )}

            {isRunning && (
              <button
                onClick={handlePause}
                disabled={actionLoading}
                className="pressable flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/20"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>توقف موقت</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="pressable flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>ادامه پردازش</span>
              </button>
            )}

            {(isRunning || isPaused) && (
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="pressable flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>لغو کامل</span>
              </button>
            )}

            {/* Hard Reset Button */}
            <button
              onClick={() => setIsCleanStartOpen(true)}
              disabled={actionLoading || isRunning}
              className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs disabled:opacity-50"
              title="پاک‌سازی کامل دیتابیس برای شروع تازه و بدون دیتای دمو"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>پاک‌سازی کامل (Hard Reset)</span>
            </button>

            <button
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="pressable p-2.5 rounded-2xl text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/80"
              title="بروزرسانی وضعیت"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Execution Settings Bar: Batch Size & Delay */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">تنظیمات اجرای پایپ‌لاین:</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600 font-bold whitespace-nowrap">اندازه هر بچ:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={isRunning}
              className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-center text-slate-900 font-bold disabled:opacity-50"
              dir="ltr"
            />
            <span className="text-[11px] text-slate-400">رکورد در هر درخواست</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600 font-bold whitespace-nowrap">تاخیر بین بچ‌ها:</label>
            <input
              type="number"
              min={0}
              step={50}
              value={delayMs}
              onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value, 10) || 0))}
              disabled={isRunning}
              className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-center text-slate-900 font-bold disabled:opacity-50"
              dir="ltr"
            />
            <span className="text-[11px] text-slate-400">میلی‌ثانیه (ms)</span>
          </div>
        </div>

        {/* Clean Focused Progress Bar */}
        <AdminBulkIngestionMetrics status={status} isRunning={isRunning} />
      </div>

      {/* Clean Start / Hard Reset Modal */}
      <AdminCleanStartModal
        isOpen={isCleanStartOpen}
        onClose={() => setIsCleanStartOpen(false)}
        onSuccess={() => fetchStatus()}
      />
    </div>
  );
}
