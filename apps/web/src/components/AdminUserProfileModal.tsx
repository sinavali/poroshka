'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Calendar, Clock, Copy, Brain, Shield, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface AdminUserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function AdminUserProfileModal({ userId, onClose, onUserUpdated }: AdminUserProfileModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }

    setLoading(true);
    fetchFromApi<any>(`/api/v1/admin/users/${userId}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        showDynamicToast({ title: 'خطا در بارگذاری پروفایل کاربر', message: err.message, type: 'error' });
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  const handleToggleBlock = async () => {
    if (!data?.user) return;
    const newStatus = !data.user.is_blocked;
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_blocked: newStatus })
      });
      setData((prev: any) => ({
        ...prev,
        user: { ...prev.user, is_blocked: newStatus }
      }));
      showDynamicToast({
        title: newStatus ? 'حساب کاربر مسدود شد' : 'رفع مسدودی حساب انجام شد',
        type: newStatus ? 'error' : 'success'
      });
      if (onUserUpdated) onUserUpdated();
    } catch {
      showDynamicToast({ title: 'خطا در تغییر وضعیت', type: 'error' });
    }
  };

  const handleToggleRole = async () => {
    if (!data?.user) return;
    const newRole = data.user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      setData((prev: any) => ({
        ...prev,
        user: { ...prev.user, role: newRole }
      }));
      showDynamicToast({
        title: `نقش به ${newRole} تغییر یافت`,
        type: 'auth'
      });
      if (onUserUpdated) onUserUpdated();
    } catch {
      showDynamicToast({ title: 'خطا در تغییر نقش', type: 'error' });
    }
  };

  const user = data?.user;
  const history: any[] = data?.copied_history || [];
  const memoryProfiles = user?.saved_context_profile_json?.profiles || (user?.saved_context_profile_json ? [user.saved_context_profile_json] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
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
                <span className="text-slate-400 block mb-1">نقش دسترسی:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {user.role}
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

            {/* Quick Actions */}
            <div className="flex items-center gap-3 pt-1">
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
                    <span>مسدود کردن این کاربر</span>
                  </>
                )}
              </button>

              <button
                onClick={handleToggleRole}
                className="pressable px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                {user.role === 'ADMIN' ? 'تبدیل به کاربر عادی' : 'ارتقا به سطح سوپرادمین'}
              </button>
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
                  {memoryProfiles.map((mem: any, idx: number) => (
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
                  {history.map((h: any) => (
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
