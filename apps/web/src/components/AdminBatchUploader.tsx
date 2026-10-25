'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Layers,
  RefreshCw,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  ShieldCheck,
  Clock,
  X
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import {
  IngestionRecord,
  ValidationSummary,
  parseAndValidateDataset
} from '../lib/dataset-parser';

export type { IngestionRecord, ValidationSummary };

export interface BatchProgressStats {
  processedCount: number;
  insertedCount: number;
  skippedDuplicates: number;
  failedCount: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  batchErrors: Array<{ batchIndex: number; error: string }>;
}

const BATCH_SIZE = 500;

export function AdminBatchUploader({
  onImportComplete
}: {
  onImportComplete?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [enrichWithLlm, setEnrichWithLlm] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'validated' | 'running' | 'paused' | 'failed_batch' | 'completed'>('idle');
  const [batchSize, setBatchSize] = useState<number>(200);

  // Auto retry countdown after batch failure
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // In-Memory dataset
  const validRecordsRef = useRef<IngestionRecord[]>([]);
  const currentBatchIndexRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  // Validation report
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [showInvalidDetails, setShowInvalidDetails] = useState<boolean>(false);

  // Live Progress stats
  const [stats, setStats] = useState<BatchProgressStats>({
    processedCount: 0,
    insertedCount: 0,
    skippedDuplicates: 0,
    failedCount: 0,
    currentBatch: 0,
    totalBatches: 0,
    percentage: 0,
    batchErrors: []
  });

  const [currentError, setCurrentError] = useState<string | null>(null);

  /**
   * Handle user changing batch size
   */
  const handleBatchSizeChange = (newSize: number) => {
    const validSize = Math.max(10, Math.min(1000, newSize || 200));
    setBatchSize(validSize);
    if (validation && validRecordsRef.current.length > 0) {
      const newTotalBatches = Math.ceil(validRecordsRef.current.length / validSize);
      setValidation((prev) => (prev ? { ...prev, batchSize: validSize, totalBatches: newTotalBatches } : null));
      setStats((prev) => ({ ...prev, totalBatches: newTotalBatches }));
    }
  };

  /**
   * RAM Validation Step
   */
  const validateContentInRam = useCallback((content: string, name: string, sizeBytes: number) => {
    try {
      const { summary, validRecords } = parseAndValidateDataset(content, name, sizeBytes, BATCH_SIZE);
      validRecordsRef.current = validRecords;
      currentBatchIndexRef.current = 0;
      setValidation(summary);
      setStatus('validated');
      setCurrentError(null);
      setStats({
        processedCount: 0,
        insertedCount: 0,
        skippedDuplicates: 0,
        failedCount: 0,
        currentBatch: 0,
        totalBatches: summary.totalBatches,
        percentage: 0,
        batchErrors: []
      });
    } catch (err: unknown) {
      setValidation(null);
      setStatus('idle');
      showDynamicToast({
        title: 'خطا در اعتبارسنجی فایل',
        message: err instanceof Error ? err.message : 'ساختار فایل نامعتبر است.',
        type: 'error'
      });
    }
  }, []);

  /**
   * File Upload Change Handler
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setRawText(content);
      validateContentInRam(content, selected.name, selected.size);
    };
    reader.readAsText(selected);
  };

  /**
   * Auto retry timer for failed batches (auto-confirm retry after 10s)
   */
  useEffect(() => {
    if (status !== 'failed_batch' || retryCountdown === null) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          executeBatchUpload(currentBatchIndexRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [status, retryCountdown]);

  /**
   * Core Batch Runner (uses configurable batchSize)
   */
  const executeBatchUpload = async (startFromBatchIndex = 0) => {
    const records = validRecordsRef.current;
    if (records.length === 0) return;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRetryCountdown(null);

    setIsProcessing(true);
    setStatus('running');
    isPausedRef.current = false;
    setCurrentError(null);

    const effectiveBatchSize = Math.max(10, BATCH_SIZE);
    const totalBatches = Math.ceil(records.length / effectiveBatchSize);

    for (let batchIdx = startFromBatchIndex; batchIdx < totalBatches; batchIdx++) {
      if (isPausedRef.current) {
        setStatus('paused');
        setIsProcessing(false);
        return;
      }

      currentBatchIndexRef.current = batchIdx;
      const startIdx = batchIdx * effectiveBatchSize;
      const endIdx = Math.min(startIdx + effectiveBatchSize, records.length);
      const batchChunk = records.slice(startIdx, endIdx);

      setStats((prev) => ({
        ...prev,
        currentBatch: batchIdx + 1,
        totalBatches
      }));

      try {
        const res = await fetchFromApi<{
          inserted: number;
          skipped_duplicates: number;
          error_count?: number;
          errors?: string[];
        }>('/api/v1/ingestion/import', {
          method: 'POST',
          body: JSON.stringify({
            items: batchChunk,
            enrich_with_llm: enrichWithLlm
          })
        });

        const newProcessed = endIdx;
        const newPercentage = Math.round((newProcessed / records.length) * 100);

        setStats((prev) => ({
          ...prev,
          processedCount: newProcessed,
          insertedCount: prev.insertedCount + (res.inserted || 0),
          skippedDuplicates: prev.skippedDuplicates + (res.skipped_duplicates || 0),
          failedCount: prev.failedCount + (res.error_count || 0),
          percentage: newPercentage
        }));
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'خطای ارتباط با سرور در حین پردازش بچ';
        setCurrentError(`خطا در پردازش بچ ${batchIdx + 1} (${startIdx + 1} تا ${endIdx}): ${errorMsg}`);
        setStatus('failed_batch');
        setIsProcessing(false);
        setStats((prev) => ({
          ...prev,
          batchErrors: [...prev.batchErrors, { batchIndex: batchIdx + 1, error: errorMsg }]
        }));
        // Auto confirm batch retry after 10 seconds
        setRetryCountdown(10);
        return;
      }
    }

    setStatus('completed');
    setIsProcessing(false);
    showDynamicToast({
      title: 'درون‌ریزی کامل شد',
      message: `${records.length.toLocaleString('fa-IR')} رکورد با موفقیت پردازش شد.`,
      type: 'success'
    });
    if (onImportComplete) onImportComplete();
  };

  const handlePause = () => {
    isPausedRef.current = true;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRetryCountdown(null);
    setStatus('paused');
    setIsProcessing(false);
  };

  const handleResume = () => {
    executeBatchUpload(currentBatchIndexRef.current);
  };

  const handleRetryCurrentBatch = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRetryCountdown(null);
    executeBatchUpload(currentBatchIndexRef.current);
  };

  const handleCancelAutoRetry = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRetryCountdown(null);
  };

  const handleSkipCurrentBatch = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRetryCountdown(null);
    const nextIdx = currentBatchIndexRef.current + 1;
    currentBatchIndexRef.current = nextIdx;
    executeBatchUpload(nextIdx);
  };

  const handleReset = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setRetryCountdown(null);
    setFile(null);
    setRawText('');
    setValidation(null);
    setStatus('idle');
    validRecordsRef.current = [];
    currentBatchIndexRef.current = 0;
    isPausedRef.current = false;
  };

  return (
    <div className="space-y-6">
      {/* 1. FILE SELECTION / DROPZONE */}
      {status === 'idle' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5 animate-fade-in">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              بارگذاری فایل دیتاست پرامپت‌ها (JSON / CSV / JSONL)
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              فایل JSON حاوی آرایه‌ای از پرامپت‌ها را انتخاب کنید. پردازش در حافظه رم (RAM) و در دسته‌های ۵۰۰تایی انجام می‌شود.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all">
            <input
              type="file"
              id="batch-dataset-file"
              accept=".json,.csv,.jsonl,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="batch-dataset-file" className="cursor-pointer flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800">
                  {file ? file.name : 'برای انتخاب فایل کلیک کنید یا آن را به اینجا بکشید'}
                </span>
                <p className="text-[11px] text-slate-400">
                  پشتیبانی بهینه از فایل‌های حجیم (۱۰ مگابایت، ۲۵۰۰+ رکورد) با دسته‌بندی ۵۰۰ تایی
                </p>
              </div>
            </label>
          </div>

          {/* Configurable Batch Size Setting */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="space-y-0.5">
              <label htmlFor="batch-size-input-idle" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>اندازه هر دسته ارسالی (Batch Size):</span>
              </label>
              <p className="text-[11px] text-slate-500">
                تعداد رکوردهای ارسال‌شده در هر درخواست شبکه (پیشنهادی برای پایگاه داده ریموت: ۵۰ تا ۲۰۰ رکورد)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[50, 100, 200, 500].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleBatchSizeChange(size)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      batchSize === size
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <input
                id="batch-size-input-idle"
                type="number"
                min={10}
                max={1000}
                step={10}
                value={batchSize}
                onChange={(e) => handleBatchSizeChange(parseInt(e.target.value, 10) || 200)}
                className="w-20 px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enrichWithLlmCheckbox"
                checked={enrichWithLlm}
                onChange={(e) => setEnrichWithLlm(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
              />
              <label htmlFor="enrichWithLlmCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                غنی‌سازی و ترجمه آنی با هوش مصنوعی (AI Semantic Ingestion)
              </label>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              برای بارگذاری سریع پیشنهاد می‌شود خام ذخیره کنید و بعداً با موتور Bulk Ingestion غنی‌سازی کنید.
            </span>
          </div>
        </div>
      )}

      {/* 2. VALIDATION DASHBOARD (STEP 1) */}
      {validation && status !== 'idle' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 animate-fade-in">
          {/* Validation Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>اعتبارسنجی دیتاست در رم (RAM Validation Report)</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    آماده بارگذاری
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  فایل <span className="font-mono text-slate-700 font-bold">{validation.fileName}</span> (
                  {(validation.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            </div>

            {status === 'validated' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="pressable px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  انتخاب فایل دیگر
                </button>
                <button
                  onClick={() => executeBatchUpload(0)}
                  className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>شروع درون‌ریزی دسته‌ای ({validation.validCount.toLocaleString('fa-IR')} رکورد)</span>
                </button>
              </div>
            )}
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block">کل رکوردهای بارگذاری‌شده</span>
              <span className="text-base font-black text-slate-900 font-mono">
                {validation.totalLoaded.toLocaleString('fa-IR')}
              </span>
            </div>
            <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block">رکوردهای معتبر و سالم</span>
              <span className="text-base font-black text-emerald-800 font-mono">
                {validation.validCount.toLocaleString('fa-IR')}
              </span>
            </div>
            <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200">
              <span className="text-[10px] text-blue-700 block">برنامه‌ریزی دسته‌ها (بچ‌ها)</span>
              <span className="text-base font-black text-blue-800 font-mono">
                {validation.totalBatches} بچ ({validation.batchSize} تایی)
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${validation.invalidCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200/80'}`}>
              <span className={`text-[10px] block ${validation.invalidCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                موارد نامعتبر / فاقد پرامپت
              </span>
              <span className={`text-base font-black font-mono ${validation.invalidCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                {validation.invalidCount}
              </span>
            </div>
          </div>

          {/* Invalid items warning drawer */}
          {validation.invalidCount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
              <div
                onClick={() => setShowInvalidDetails(!showInvalidDetails)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {validation.invalidCount} سطر فاقد کلید معتبر متن پرامپت بودند و به طور خودکار نادیده گرفته می‌شوند.
                  </span>
                </div>
                <button className="text-amber-700">
                  {showInvalidDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showInvalidDetails && (
                <div className="pt-2 border-t border-amber-200/80 space-y-1.5 max-h-40 overflow-y-auto">
                  {validation.invalidItems.map((inv, idx) => (
                    <div key={idx} className="text-[11px] font-mono text-amber-800 bg-white/70 p-2 rounded-xl flex items-center justify-between">
                      <span>سطر {inv.index}: {inv.reason}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-xs">{inv.sample}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sample Preview Table */}
          {status === 'validated' && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>نمونه سطرهای اعتبارسنجی‌شده از فایل:</span>
              </span>
              <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200 shadow-xs">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3 w-1/4">عنوان استخراج‌شده</th>
                      <th className="p-3">متن پرامپت انگلیسی</th>
                      <th className="p-3 w-28">مودالیتی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {validation.sampleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-800">{row.title}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600" dir="ltr">
                          {row.prompt}...
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">{row.modality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. EXECUTION PROGRESS BAR & CONTROLS */}
          {(status === 'running' || status === 'paused' || status === 'failed_batch' || status === 'completed') && (
            <div className="pt-4 border-t border-slate-200/80 space-y-4">
              {/* Progress Head */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      پیشرفت بارگذاری دسته‌ای:
                    </span>
                    <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      بچ {stats.currentBatch} از {stats.totalBatches}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {stats.processedCount.toLocaleString('fa-IR')} از {validation.validCount.toLocaleString('fa-IR')} رکورد پردازش شد
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  {status === 'running' && (
                    <button
                      onClick={handlePause}
                      className="pressable flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white shadow-sm"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>توقف موقت (Pause)</span>
                    </button>
                  )}

                  {status === 'paused' && (
                    <button
                      onClick={handleResume}
                      className="pressable flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ادامه بارگذاری (Resume)</span>
                    </button>
                  )}

                  {status === 'completed' && (
                    <button
                      onClick={handleReset}
                      className="pressable flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>بارگذاری فایل جدید</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      status === 'completed'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : status === 'failed_batch'
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500'
                    }`}
                    style={{ width: `${Math.max(stats.percentage, 2)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>{stats.percentage}%</span>
                  <span>اندازه هر بچ: {batchSize} رکورد</span>
                </div>
              </div>

              {/* Live KPI Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">کل پردازش‌شده</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {stats.processedCount.toLocaleString('fa-IR')}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-emerald-600 block">پرامپت‌های جدید (Inserted)</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    {stats.insertedCount.toLocaleString('fa-IR')}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-amber-600 block">تکراری و نادیده‌گرفته‌شده</span>
                  <span className="text-sm font-black text-amber-700 font-mono">
                    {stats.skippedDuplicates.toLocaleString('fa-IR')}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-rose-600 block">خطاها</span>
                  <span className="text-sm font-black text-rose-700 font-mono">
                    {stats.failedCount.toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>

              {/* FAILURE RECOVERY BANNER (Safe to continue & Auto-retry countdown) */}
              {status === 'failed_batch' && currentError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{currentError}</span>
                    </div>

                    {retryCountdown !== null && retryCountdown > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-xl text-xs font-mono font-bold animate-pulse border border-rose-300">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        <span>تلاش مجدد خودکار تا {retryCountdown} ثانیه...</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    دسته‌های قبلی با موفقیت در دیتابیس ثبت شده‌اند و هیچ داده‌ای از دست نرفته است.
                    {retryCountdown !== null && retryCountdown > 0 ? (
                      <span className="font-bold mr-1">
                        سیستم به دلیل قطعی موقت ارتباط سرور/شبکه پس از پایان شمارش معکوس به صورت خودکار ارسال این بسته را تکرار می‌کند.
                      </span>
                    ) : (
                      ' می‌توانید همین دسته را مجدداً ارسال کنید یا از آن صرف‌نظر کرده و به دسته بعدی بروید.'
                    )}
                  </p>

                  <div className="flex items-center flex-wrap gap-2 pt-1">
                    <button
                      onClick={handleRetryCurrentBatch}
                      className="pressable flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>تلاش مجدد فوری بچ {stats.currentBatch}</span>
                    </button>

                    {retryCountdown !== null && retryCountdown > 0 && (
                      <button
                        onClick={handleCancelAutoRetry}
                        className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>لغو تلاش خودکار</span>
                      </button>
                    )}

                    <button
                      onClick={handleSkipCurrentBatch}
                      className="pressable flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      <span>رد شدن از این بچ و ادامه</span>
                    </button>
                  </div>
                </div>
              )}

              {/* COMPLETION BANNER */}
              {status === 'completed' && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>بارگذاری و همگام‌سازی دیتاست با موفقیت به پایان رسید!</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    تعداد {stats.insertedCount.toLocaleString('fa-IR')} پرامپت جدید با موفقیت به کاتالوگ اضافه شد و{' '}
                    {stats.skippedDuplicates.toLocaleString('fa-IR')} مورد به دلیل تکراری بودن شناسه بدون مشکل نادیده گرفته شد.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
