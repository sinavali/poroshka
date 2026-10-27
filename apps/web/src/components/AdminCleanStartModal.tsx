'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface AdminCleanStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminCleanStartModal({ isOpen, onClose, onSuccess }: AdminCleanStartModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [resetUsers, setResetUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
      setResetUsers(false);
      setError('');
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isConfirmed = confirmationText.trim().toUpperCase() === 'RESET';

  const handleExecuteReset = async () => {
    if (!isConfirmed || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetchFromApi<{
        ok: boolean;
        message: string;
        details?: Record<string, boolean>;
      }>('/api/v1/admin/reset-data', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'RESET',
          reset_users: resetUsers
        })
      });

      showDynamicToast({
        title: 'پاک‌سازی کامل با موفقیت انجام شد',
        message: res.message || 'پایگاه داده برای شروع تمیز آماده است.',
        type: 'success'
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در فرآیند پاک‌سازی داده‌ها';
      setError(msg);
      showDynamicToast({
        title: 'خطا در پاک‌سازی',
        message: msg,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-rose-200/80 shadow-2xl bg-white space-y-5 animate-scale-in"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-950">
                پاک‌سازی کامل و شروع مجدد (Clean Start / Production Reset)
              </h3>
              <p className="text-xs text-rose-600 font-medium">
                ریست وضعیت پایگاه داده، کش‌ها و صف‌های پردازشی به نقطه صفر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>هشدار مهم: این عملیات غیرقابل بازگشت است!</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">
            با اجرای این عملیات، تمامی پرامپت‌ها، وکتورهای امبدینگ، صف‌ها، تیکت‌ها و تاریخچه کپی کاربران به صورت کامل از پایگاه داده و ردیس پاک‌سازی می‌شوند.
          </p>
        </div>

        {/* Audit summary */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">اقداماتی که انجام خواهد شد:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-700">
              <Trash2 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>حذف کلیه پرامپت‌ها و بلوک‌ها</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-700">
              <Trash2 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>پاک‌سازی کامل کش امبدینگ‌ها</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-700">
              <Trash2 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>ریست صف پردازش دسته‌ای</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-700">
              <Trash2 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>تخلیه کامل کش Redis</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>دسته‌بندی‌های پیش‌فرض و حساب‌های مدیران سیستم (Admin) جهت حفظ دسترسی محفوظ می‌مانند.</span>
          </div>
        </div>

        {/* Optional Users deletion */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 cursor-pointer hover:bg-slate-100">
          <input
            type="checkbox"
            checked={resetUsers}
            onChange={(e) => setResetUsers(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 text-rose-600 rounded-md border-slate-300 focus:ring-rose-500"
          />
          <span className="font-bold">حذف حساب‌های کاربران عادی (غیر مدیر) و نشست‌های آنان</span>
        </label>

        {/* Double Confirmation Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            جهت تایید نهایی، عبارت <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded">RESET</span> را تایپ کنید:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={loading}
            placeholder="RESET"
            className="w-full text-center font-mono font-bold tracking-widest text-sm bg-white border border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl px-3 py-2.5 text-rose-600 outline-hidden"
            dir="ltr"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs font-medium border border-rose-200">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="pressable px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={!isConfirmed || loading}
            className="pressable flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>در حال پاک‌سازی جامع داده‌ها...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>تایید و پاک‌سازی کامل (Clean Start)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
