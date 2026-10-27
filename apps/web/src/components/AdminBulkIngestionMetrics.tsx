'use client';

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { type BulkStatusState } from './admin-ingestion-types';

interface MetricsProps {
  status: BulkStatusState | null;
  isRunning: boolean;
}

export function AdminBulkIngestionMetrics({ status, isRunning }: MetricsProps) {
  const formatFa = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '۰';
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  const percentage = Math.min(100, Math.max(0, status?.progress_percentage ?? 0));

  return (
    <div className="space-y-4 pt-2">
      {/* Sleek Minimal Progress Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-700">پیشرفت پردازش و غنی‌سازی:</span>
            <span className="text-blue-600 font-black text-sm">{formatFa(percentage)}٪</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            {formatFa(status?.enriched_count)} از {formatFa(status?.total_in_db)} پرامپت
          </span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${Math.max(percentage > 0 ? 1 : 0, percentage)}%` }}
          />
        </div>
      </div>

      {/* Current Processing Item Ticker */}
      {isRunning && status?.current_slug && (
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/90 border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-2xs">
          <Activity className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
          <span className="font-bold">در حال پردازش:</span>
          <span className="font-mono text-blue-600 text-[11px] truncate" dir="ltr">{status.current_slug}</span>
        </div>
      )}

      {/* Error Alert if any */}
      {status?.last_error && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span className="font-bold">هشدار:</span>
          <span className="truncate">{status.last_error}</span>
        </div>
      )}
    </div>
  );
}
