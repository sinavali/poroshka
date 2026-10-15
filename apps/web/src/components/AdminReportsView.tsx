'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Cpu,
  Tv,
  Search,
  Database,
  Send,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock
} from 'lucide-react';

export interface AdminReportsViewProps {
  reportType: string;
  reportData: any;
  loading: boolean;
  onSelectReport: (type: string) => void;
  onRefresh: () => void;
}

const REPORT_TABS = [
  { id: 'velocity', label: 'نرخ تبدیل و کپی', icon: TrendingUp },
  { id: 'model-demand', label: 'تقاضای مدل‌های هوش مصنوعی', icon: Cpu },
  { id: 'ad-yield', label: 'جایگاه‌های تبلیغاتی', icon: Tv },
  { id: 'search-insights', label: 'بینش جستجو و کلیدواژه‌ها', icon: Search },
  { id: 'ingestion-health', label: 'سلامت پایپلاین درون‌ریزی', icon: Database },
  { id: 'messengers', label: 'وضعیت پیام‌رسان‌ها و ربات‌ها', icon: Send },
  { id: 'system-health', label: 'امنیت و رویدادهای سیستم', icon: ShieldAlert }
];

export function AdminReportsView({
  reportType,
  reportData,
  loading,
  onSelectReport,
  onRefresh
}: AdminReportsViewProps) {
  const currentTab = REPORT_TABS.find((t) => t.id === reportType) || REPORT_TABS[0];
  const IconComponent = currentTab.icon;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar max-w-full">
          {REPORT_TABS.map((rep) => {
            const TabIcon = rep.icon;
            const isActive = reportType === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => onSelectReport(rep.id)}
                className={`pressable flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap spring-transition border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{rep.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>به‌روزرسانی داده‌ها</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        {/* Header bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-600">
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">{currentTab.label}</h3>
              <p className="text-[11px] text-slate-500">گزارش بلادرنگ و تفکیک‌شده هسته سیستم</p>
            </div>
          </div>
          {loading && (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              در حال بازخوانی اطلاعات...
            </span>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          {!reportData && !loading && (
            <div className="text-center py-12 text-slate-400 text-xs">
              اطلاعاتی برای نمایش در این گزارش یافت نشد.
            </div>
          )}

          {/* 1. VELOCITY REPORT */}
          {reportType === 'velocity' && reportData?.data && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold text-[11px]">
                    <th className="pb-3 pr-2">#</th>
                    <th className="pb-3">عنوان پرامپت</th>
                    <th className="pb-3 text-center">نوع ساختار</th>
                    <th className="pb-3 text-center">دفعات کپی</th>
                    <th className="pb-3 text-center">بازدید</th>
                    <th className="pb-3 text-center">نرخ تبدیل</th>
                    <th className="pb-3 pl-2 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.data.map((row: any, idx: number) => {
                    const convRate = parseFloat(row.conversion_rate) || 0;
                    return (
                      <tr key={row.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-2 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="py-3 font-medium text-slate-900 max-w-xs truncate">
                          {row.title_fa}
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                            {row.modality || 'متن'}
                          </span>
                        </td>
                        <td className="py-3 text-center font-bold text-slate-800">
                          {Number(row.copy_count).toLocaleString('fa-IR')}
                        </td>
                        <td className="py-3 text-center text-slate-500">
                          {Number(row.view_count).toLocaleString('fa-IR')}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.min(100, convRate)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600 font-mono">
                              {convRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pl-2 text-left">
                          {row.slug && (
                            <Link
                              href={`/p/${row.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                            >
                              مشاهده
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. MODEL DEMAND REPORT */}
          {reportType === 'model-demand' && reportData?.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.data.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      {item.model || 'عمومی'}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      تعداد پرامپت‌ها:{' '}
                      <strong className="text-slate-700">
                        {Number(item.prompt_count).toLocaleString('fa-IR')}
                      </strong>
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-base font-black text-blue-600 font-mono">
                      {Number(item.total_copies).toLocaleString('fa-IR')}
                    </span>
                    <p className="text-[10px] text-slate-400">مجموع کپی‌ها</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. AD YIELD REPORT */}
          {reportType === 'ad-yield' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-3">جایگاه‌های فعال تبلیغاتی</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold text-[11px]">
                        <th className="pb-3 pr-2">شناسه جایگاه</th>
                        <th className="pb-3">محل قرارگیری</th>
                        <th className="pb-3">ارائه‌دهنده</th>
                        <th className="pb-3">شناسه زون تبلیغاتی</th>
                        <th className="pb-3 text-left pl-2">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(reportData.ad_units || []).map((ad: any) => (
                        <tr key={ad.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 pr-2 font-mono text-[11px] text-slate-500">{ad.id}</td>
                          <td className="py-3 font-bold text-slate-800">{ad.placement_slot}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {ad.provider}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-slate-600">{ad.zone_id}</td>
                          <td className="py-3 text-left pl-2">
                            {ad.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                فعال
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                <AlertCircle className="w-3.5 h-3.5" />
                                غیرفعال
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {reportData.click_audits && reportData.click_audits.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3">لاگ تعاملات و کلیک‌ها</h4>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {reportData.click_audits.map((audit: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-700 font-medium">{audit.event_type || 'کلیک بنر'}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(audit.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. SEARCH INSIGHTS */}
          {reportType === 'search-insights' && reportData?.top_keywords && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold text-[11px]">
                    <th className="pb-3 pr-2">#</th>
                    <th className="pb-3">عبارت‌ها و کلیدواژه‌های جستجو</th>
                    <th className="pb-3 text-center">مجموع کپی‌های ایجادشده</th>
                    <th className="pb-3 text-left pl-2">وضعیت تقاضا</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.top_keywords.map((kw: any, idx: number) => {
                    const copies = Number(kw.copies) || 0;
                    const keywords = Array.isArray(kw.search_keywords_fa)
                      ? kw.search_keywords_fa
                      : [kw.search_keywords_fa || 'بدون برچسب'];
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-2 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {keywords.map((k: string, kIdx: number) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] border border-slate-200"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-center font-bold text-slate-800 font-mono">
                          {copies.toLocaleString('fa-IR')}
                        </td>
                        <td className="py-3 text-left pl-2">
                          {copies > 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              تقاضای بالا
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              معمولی
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. INGESTION HEALTH */}
          {reportType === 'ingestion-health' && reportData?.batches && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold text-[11px]">
                    <th className="pb-3 pr-2">بسته ورودی</th>
                    <th className="pb-3 text-center">کل سطرها</th>
                    <th className="pb-3 text-center">پردازش شده</th>
                    <th className="pb-3 text-center">تکراری</th>
                    <th className="pb-3 text-center">خطاها</th>
                    <th className="pb-3 text-center">وضعیت</th>
                    <th className="pb-3 text-left pl-2">تاریخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.batches.map((batch: any) => (
                    <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pr-2 font-bold text-slate-800">{batch.batch_name}</td>
                      <td className="py-3 text-center font-mono font-medium text-slate-700">
                        {Number(batch.total_rows).toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-emerald-600">
                        {Number(batch.processed_rows).toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-500">
                        {Number(batch.skipped_duplicates).toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3 text-center font-mono text-rose-600 font-bold">
                        {Number(batch.failed_rows).toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3 text-center">
                        {batch.is_paused ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            متوقف شده
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            پایدار
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-left pl-2 font-mono text-[11px] text-slate-400">
                        {formatDate(batch.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. MESSENGERS REPORT */}
          {reportType === 'messengers' && reportData?.outbox_breakdown && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {reportData.outbox_breakdown.map((item: any, idx: number) => {
                  const isSent = item.status === 'SENT';
                  const isPending = item.status === 'PENDING';
                  return (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">
                          {isSent ? 'ارسال موفق' : isPending ? 'در صف ارسال' : 'ناموفق'}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSent ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        />
                      </div>
                      <p className="text-2xl font-black text-slate-900 font-mono">
                        {Number(item.count).toLocaleString('fa-IR')}
                      </p>
                      <p className="text-[11px] text-slate-400">وضعیت پایپلاین خروجی</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. SYSTEM HEALTH REPORT */}
          {reportType === 'system-health' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security audits */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  رویدادهای امنیتی و نظارتی
                </h4>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {(reportData.security || []).map((sec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{sec.event_type || 'رویداد'}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDate(sec.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{sec.details || 'بدون جزئیات'}</p>
                      {sec.ip_address && (
                        <span className="inline-block font-mono text-[10px] text-slate-400">
                          IP: {sec.ip_address}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-500" />
                  آخرین لاگ‌های سیستمی
                </h4>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {(reportData.logs || []).map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-blue-600">
                          {log.level || 'INFO'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 line-clamp-2">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
