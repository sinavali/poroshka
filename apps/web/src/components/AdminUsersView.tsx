'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RefreshCw, ChevronLeft, ChevronRight, ShieldCheck, UserCheck, Shield, LogOut } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { AdminUserProfileModal } from './AdminUserProfileModal';
import { StyledSelect } from './StyledSelect';

export interface UserItem {
  id: string;
  phone_e164: string;
  role: 'ADMIN' | 'OPERATOR' | 'USER' | string;
  is_phone_verified: boolean;
  is_blocked: boolean;
  total_copied_prompts: number;
  total_prompt_executions: number;
  created_at: string;
}

interface AdminUsersViewProps {
  currentUserPhone: string;
  userRole: 'ADMIN' | 'OPERATOR';
}

const ROLE_OPTIONS = [
  { value: 'USER', label: 'کاربر عادی' },
  { value: 'OPERATOR', label: 'اپراتور' },
  { value: 'ADMIN', label: 'مدیر ارشد' }
];

export function AdminUsersView({ currentUserPhone, userRole }: AdminUsersViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL search params for persistence on page reload
  const initialPage = Math.max(1, parseInt(searchParams.get('user_page') || '1', 10));
  const initialSearch = searchParams.get('user_q') || '';
  const initialLimit = Math.max(10, parseInt(searchParams.get('user_limit') || '20', 10));

  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState(initialSearch);
  const [userPage, setUserPage] = useState(initialPage);
  const [userLimit, setUserLimit] = useState(initialLimit);
  const [userTotal, setUserTotal] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flushingSessions, setFlushingSessions] = useState(false);

  const handleGlobalSessionFlush = async () => {
    if (!confirm('آیا از خروج اجباری تمامی نشست‌های کاربران در کل سامانه اطمینان دارید؟ تمام کاربران فعال از سیستم خارج خواهند شد (نشست جاری شما حفظ می‌گردد).')) return;
    setFlushingSessions(true);
    try {
      const res = await fetchFromApi<{ ok: boolean; terminated_count: number; message: string }>('/api/v1/admin/sessions/terminate-all-users', {
        method: 'POST'
      });
      showDynamicToast({ title: 'ابطال سراسری نشست‌ها', message: res.message || `${res.terminated_count} نشست لغو شد.`, type: 'success' });
      loadUsers();
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در ابطال نشست‌ها', message: err instanceof Error ? err.message : '', type: 'error' });
    } finally {
      setFlushingSessions(false);
    }
  };

  const updateUrlParams = useCallback((p: number, q: string, lim: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'users');
    if (p > 1) params.set('user_page', String(p));
    else params.delete('user_page');

    if (q.trim()) params.set('user_q', q.trim());
    else params.delete('user_q');

    if (lim !== 20) params.set('user_limit', String(lim));
    else params.delete('user_limit');

    router.replace(`/admin?${params.toString()}`);
  }, [router, searchParams]);

  // Synchronize state when URL search params change (e.g. browser back/forward or reload)
  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get('user_page') || '1', 10));
    const q = searchParams.get('user_q') || '';
    const lim = Math.max(10, parseInt(searchParams.get('user_limit') || '20', 10));

    setUserPage(p);
    setUserSearch(q);
    setUserLimit(lim);
  }, [searchParams]);

  const loadUsers = useCallback(async (page = userPage, search = userSearch, limit = userLimit) => {
    setLoading(true);
    try {
      const qParam = search.trim() ? `&q=${encodeURIComponent(search.trim())}` : '';
      const data = await fetchFromApi<{ users: UserItem[]; total: number; page: number; limit: number }>(
        `/api/v1/admin/users?page=${page}&limit=${limit}${qParam}`
      );
      setUsers(data.users || []);
      setUserTotal(data.total || 0);
      setUserPage(data.page || page);
    } catch (err: unknown) {
      setUsers([]);
      setUserTotal(0);
      showDynamicToast({ 
        title: 'خطا در دریافت لیست کاربران', 
        message: err instanceof Error ? err.message : '', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [userPage, userSearch, userLimit]);

  useEffect(() => {
    loadUsers(userPage, userSearch, userLimit);
  }, [loadUsers, userPage, userSearch, userLimit]);

  const handleToggleBlockUser = async (userId: string, currentBlocked: boolean, userPhone: string) => {
    if (userPhone === currentUserPhone) {
      showDynamicToast({ title: 'نمی‌توانید حساب کاربری جاری خود را مسدود کنید', type: 'error' });
      return;
    }
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_blocked: !currentBlocked })
      });
      showDynamicToast({ title: currentBlocked ? 'کاربر رفع مسدودی شد' : 'کاربر مسدود شد', type: 'success' });
      loadUsers(userPage, userSearch, userLimit);
    } catch (err: unknown) {
      showDynamicToast({ 
        title: 'خطا در تغییر وضعیت کاربر', 
        message: err instanceof Error ? err.message : '', 
        type: 'error' 
      });
    }
  };

  const handleSetUserRole = async (userId: string, targetRole: 'ADMIN' | 'OPERATOR' | 'USER', userPhone: string) => {
    if (userRole !== 'ADMIN') {
      showDynamicToast({ title: 'تنها سوپرادمین مجاز به تغییر نقش کاربر است', type: 'error' });
      return;
    }
    if (userPhone === currentUserPhone) {
      showDynamicToast({ title: 'نمی‌توانید نقش حساب کاربری خود را تنزل دهید', type: 'error' });
      return;
    }
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: targetRole })
      });
      showDynamicToast({ title: `نقش کاربر به ${targetRole} تغییر یافت`, type: 'success' });
      loadUsers(userPage, userSearch, userLimit);
    } catch (err: unknown) {
      showDynamicToast({ 
        title: 'خطا در تغییر نقش کاربر', 
        message: err instanceof Error ? err.message : '', 
        type: 'error' 
      });
    }
  };

  const totalUserPages = Math.max(1, Math.ceil(userTotal / userLimit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            setUserPage(1);
            updateUrlParams(1, userSearch, userLimit);
            loadUsers(1, userSearch, userLimit);
          }} 
          className="relative flex-1 max-w-sm"
        >
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="جستجو با شماره موبایل (+98... یا 09...)"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </form>
        <div className="flex items-center gap-2">
          <div className="w-36">
            <StyledSelect
              size="sm"
              value={String(userLimit)}
              onChange={(val) => {
                const newLimit = Number(val);
                setUserLimit(newLimit);
                setUserPage(1);
                updateUrlParams(1, userSearch, newLimit);
                loadUsers(1, userSearch, newLimit);
              }}
              options={[
                { value: '10', label: '۱۰ در صفحه' },
                { value: '20', label: '۲۰ در صفحه' },
                { value: '50', label: '۵۰ در صفحه' }
              ]}
            />
          </div>
          <button
            onClick={() => loadUsers(userPage, userSearch, userLimit)}
            className="pressable px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>به‌روزرسانی</span>
          </button>
          {userRole === 'ADMIN' && (
            <button
              onClick={handleGlobalSessionFlush}
              disabled={flushingSessions}
              className="pressable px-3 py-2 rounded-xl bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition disabled:opacity-50"
              title="خروج اجباری تمامی نشست‌های فعال کاربران در سراسر سامانه"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{flushingSessions ? 'در حال ابطال...' : 'خروج اجباری تمامی کاربران'}</span>
            </button>
          )}
        </div>
      </div>

      {loading && users.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-medium">در حال دریافت لیست کاربران...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-3xl border border-slate-200/60">
          کاربری با این مشخصات یافت نشد.
        </div>
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/80">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3.5 font-bold">شماره موبایل</th>
                <th className="p-3.5 font-bold">نقش</th>
                <th className="p-3.5 font-bold">وضعیت حساب</th>
                <th className="p-3.5 font-bold">پرامپت‌های کپی‌شده</th>
                <th className="p-3.5 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => {
                const isSelf = u.phone_e164 === currentUserPhone;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-mono" dir="ltr">
                      {u.phone_e164}
                      {isSelf && (
                        <span className="mr-2 text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-sans font-bold">
                          شما
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'OPERATOR' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role === 'ADMIN' ? 'مدیر ارشد' : u.role === 'OPERATOR' ? 'اپراتور' : 'کاربر عادی'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.is_blocked ? (
                        <span className="text-rose-600 font-bold">مسدود شده</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">فعال</span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-blue-600">
                      {u.total_copied_prompts || 0} پرامپت ({u.total_prompt_executions || 0} کپی)
                    </td>
                    <td className="p-3.5 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="pressable px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold hover:bg-blue-100"
                      >
                        پرونده
                      </button>
                      
                      <button
                        onClick={() => handleToggleBlockUser(u.id, u.is_blocked, u.phone_e164)}
                        disabled={isSelf}
                        title={isSelf ? 'نمی‌توانید حساب کاربری خود را مسدود کنید' : undefined}
                        className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isSelf 
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                            : u.is_blocked 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.is_blocked ? 'رفع مسدودی' : 'مسدود'}
                      </button>

                      {userRole === 'ADMIN' && (
                        <div className="w-28 flex-shrink-0" title={isSelf ? 'نمی‌توانید نقش حساب کاربری خود را تغییر دهید' : undefined}>
                          <StyledSelect
                            size="sm"
                            disabled={isSelf}
                            value={u.role}
                            onChange={(r) => handleSetUserRole(u.id, r as 'ADMIN' | 'OPERATOR' | 'USER', u.phone_e164)}
                            options={ROLE_OPTIONS}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Server-Side Pagination Bar */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="font-medium">
              نمایش {((userPage - 1) * userLimit) + 1} تا {Math.min(userPage * userLimit, userTotal)} از مجموع {userTotal.toLocaleString('fa-IR')} کاربر
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (userPage > 1) {
                    const p = userPage - 1;
                    setUserPage(p);
                    updateUrlParams(p, userSearch, userLimit);
                    loadUsers(p, userSearch, userLimit);
                  }
                }}
                disabled={userPage <= 1 || loading}
                className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>قبلی</span>
              </button>
              <span className="font-bold px-2">
                صفحه {userPage.toLocaleString('fa-IR')} از {totalUserPages.toLocaleString('fa-IR')}
              </span>
              <button
                onClick={() => {
                  if (userPage < totalUserPages) {
                    const p = userPage + 1;
                    setUserPage(p);
                    updateUrlParams(p, userSearch, userLimit);
                    loadUsers(p, userSearch, userLimit);
                  }
                }}
                disabled={userPage >= totalUserPages || loading}
                className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold disabled:opacity-40"
              >
                <span>بعدی</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <AdminUserProfileModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onUserUpdated={() => loadUsers(userPage, userSearch, userLimit)}
      />
    </div>
  );
}
