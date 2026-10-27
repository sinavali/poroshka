'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Calendar, Clock, Copy, Brain, Shield, AlertTriangle, CheckCircle, Ban, Trash2, LogOut, Laptop } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

export interface MemoryProfileItem {
  title?: string;
  brand_name?: string;
  target_audience?: string;
  brand_tone?: string;
}

export interface CopiedHistoryItem {
  id: string;
  title_fa: string;
  slug?: string;
  last_copied_at: string;
  copy_count: number;
}

export interface UserProfileUser {
  id: string;
  phone?: string;
  phone_e164?: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
  last_login_at?: string;
  saved_context_profile_json?: {
    profiles?: MemoryProfileItem[];
    [key: string]: unknown;
  };
}

export interface UserSessionItem {
  id: string;
  device_label?: string;
  ip_address?: string;
  expires_at: string;
  created_at: string;
}

export interface UserProfileData {
  user: UserProfileUser;
  copied_history?: CopiedHistoryItem[];
  active_sessions?: UserSessionItem[];
}

interface AdminUserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function AdminUserProfileModal({ userId, onClose, onUserUpdated }: AdminUserProfileModalProps) {
  const [data, setData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    setLoading(true);
    fetchFromApi<UserProfileData>(`/api/v1/admin/users/${userId}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        showDynamicToast({ title: 'خطا در بارگذاری پروفایل کاربر', message: err.message, type: 'error' });
      })
      .finally(() => setLoading(false));

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [userId, onClose]);

  if (!userId) return null;

  const handleToggleBlock = async () => {
    if (!data?.user) return;
    const newStatus = !data.user.is_blocked;
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_blocked: newStatus })
      });
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          user: { ...prev.user, is_blocked: newStatus }
        };
      });
      showDynamicToast({
        title: newStatus ? 'حساب کاربر مسدود شد' : 'رفع مسدودی حساب انجام شد',
        type: newStatus ? 'error' : 'success'
      });
      if (onUserUpdated) onUserUpdated();
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در تغییر وضعیت', message: err instanceof Error ? err.message : '', type: 'error' });
    }
  };

  const handleSetRole = async (newRole: 'ADMIN' | 'OPERATOR' | 'USER') => {
    if (!data?.user) return;
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          user: { ...prev.user, role: newRole }
        };
      });
      showDynamicToast({
        title: 'نقش کاربر به‌روزرسانی شد',
        message: `نقش جدید: ${newRole}`,
        type: 'auth'
      });
      if (onUserUpdated) onUserUpdated();
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در تغییر نقش کاربر', message: err instanceof Error ? err.message : '', type: 'error' });
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm('آیا از حذف کامل این حساب کاربری اطمینان دارید؟ این عملیات غیرقابل بازگشت است.')) return;
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE'
      });
      showDynamicToast({ title: 'حساب کاربری حذف گردید', type: 'success' });
      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در حذف حساب کاربری', message: err instanceof Error ? err.message : '', type: 'error' });
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!userId) return;
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          active_sessions: (prev.active_sessions || []).filter((s) => s.id !== sessionId)
        };
      });
      showDynamicToast({ title: 'نشست کاربر ابطال شد', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ابطال نشست';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    }
  };

  const handleTerminateAllSessions = async () => {
    if (!userId || !confirm('آیا از خروج اجباری تمامی نشست‌های این کاربر اطمینان دارید؟')) return;
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}/sessions/terminate-all`, {
        method: 'POST'
      });
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          active_sessions: []
        };
      });
      showDynamicToast({ title: 'تمامی نشست‌های فعال کاربر با موفقیت خاتمه یافتند', type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ابطال نشست‌ها';
      showDynamicToast({ title: 'خطا', message: msg, type: 'error' });
    }
  };

  const user = data?.user;
  const history: CopiedHistoryItem[] = data?.copied_history || [];
  const memoryProfiles: MemoryProfileItem[] = (user?.saved_context_profile_json?.profiles as MemoryProfileItem[]) || [];
  const sessions: UserSessionItem[] = data?.active_sessions || [];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in w-screen h-screen"
    >
      <div className="glass-panel w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">پروفایل و پرونده کاربر</h3>
              <p className="text-xs text-slate-500 font-mono" dir="ltr">{user?.phone_e164 || 'بارگذاری...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">در حال دریافت سوابق کاربر...</p>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* User Meta Summary Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">سطح دسترسی:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  user.role === 'ADMIN' 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                    : user.role === 'OPERATOR'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {user.role === 'ADMIN' ? 'مدیر ارشد (Admin)' : user.role === 'OPERATOR' ? 'اپراتور (Operator)' : 'کاربر عادی (User)'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">وضعیت حساب:</span>
                <span className={`font-bold ${user.is_blocked ? 'text-red-600' : 'text-emerald-600'}`}>
                  {user.is_blocked ? 'مسدود شده' : 'فعال و مجاز'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">تاریخ عضویت:</span>
                <span className="font-mono text-slate-700">
                  {new Date(user.created_at).toLocaleDateString('fa-IR')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">آخرین ورود:</span>
                <span className="font-mono text-slate-700">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('fa-IR') : 'نامشخص'}
                </span>
              </div>
            </div>

            {/* Quick Actions & Role Elevation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">مدیریت سطح دسترسی و نقش:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetRole('USER')}
                  className={`pressable px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    user.role === 'USER'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  کاربر عادی
                </button>
                <button
                  type="button"
                  onClick={() => handleSetRole('OPERATOR')}
                  className={`pressable px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    user.role === 'OPERATOR'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  ارتقا به اپراتور
                </button>
                <button
                  type="button"
                  onClick={() => handleSetRole('ADMIN')}
                  className={`pressable px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  ارتقا به مدیر ارشد
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                <button
                  onClick={handleToggleBlock}
                  className={`pressable px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    user.is_blocked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                  }`}
                >
                  {user.is_blocked ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>رفع مسدودی حساب</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>مسدود کردن کاربر</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDeleteUser}
                  className="pressable px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف کامل حساب کاربری</span>
                </button>
              </div>
            </div>

            {/* Saved Context Memories Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-indigo-600" />
                <span>پروفایل‌های حافظه برند ذخیره‌شده ({memoryProfiles.length} مورد)</span>
              </h4>

              {memoryProfiles.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  این کاربر هنوز حافظه برندی ثبت نکرده است.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {memoryProfiles.map((mem: MemoryProfileItem, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{mem.title || `پروفایل ${idx + 1}`}</span>
                        {mem.brand_name && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                            {mem.brand_name}
                          </span>
                        )}
                      </div>
                      {mem.target_audience && (
                        <p className="text-[11px] text-slate-600">مخاطبان: {mem.target_audience}</p>
                      )}
                      {mem.brand_tone && (
                        <p className="text-[11px] text-slate-600">لحن: {mem.brand_tone}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Copied History Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-blue-600" />
                <span>تاریخچه پرامپت‌های کپی‌شده ({history.length} مورد)</span>
              </h4>

              {history.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  هیچ پرامپتی توسط این کاربر کپی نشده است.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {history.map((h: CopiedHistoryItem) => (
                    <div key={h.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <h5 className="font-bold text-slate-900">{h.title_fa}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.last_copied_at).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-blue-600 font-bold">{h.copy_count} بار کپی</span>
                        {h.slug && (
                          <a
                            href={`/p/${h.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-slate-500 hover:text-blue-600 font-bold"
                          >
                            مشاهده پرامپت ←
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Sessions Management Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span>نشست‌های فعال کاربر ({sessions.length} مورد)</span>
                </h4>
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleTerminateAllSessions}
                    className="pressable px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>خروج از تمامی دستگاه‌ها</span>
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  این کاربر در حال حاضر هیچ نشست فعالی ندارد.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {sessions.map((s: UserSessionItem) => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{s.device_label || 'مرورگر وب'}</span>
                          {s.ip_address && (
                            <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded" dir="ltr">
                              {s.ip_address}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span>ورود: {new Date(s.created_at).toLocaleDateString('fa-IR')}</span>
                          <span>انقضا: {new Date(s.expires_at).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTerminateSession(s.id)}
                        className="pressable px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                      >
                        خروج اجباری
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
