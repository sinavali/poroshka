'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, BarChart3, Users, Settings, FileText, ToggleLeft, ToggleRight, 
  Check, RefreshCw, Search, ShieldCheck, UserCheck, UserX, AlertCircle, TrendingUp, Sliders
} from 'lucide-react';
import { fetchFromApi } from '../../lib/api-client';
import { showDynamicToast } from '../../components/DynamicIslandToast';
import { AdminReportsView } from '../../components/AdminReportsView';

interface SystemSettingItem {
  id: string;
  setting_key: string;
  category: string;
  description_fa: string;
  setting_value: Record<string, unknown>;
  updated_at: string;
}

interface UserItem {
  id: string;
  phone_e164: string;
  role: string;
  is_phone_verified: boolean;
  is_blocked: boolean;
  total_copied_prompts: number;
  total_prompt_executions: number;
  created_at: string;
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'reports' | 'prompts'>('overview');
  
  // Dashboard Overview state
  const [stats, setStats] = useState<any>(null);
  const [adConfigs, setAdConfigs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [topPrompts, setTopPrompts] = useState<any[]>([]);
  
  // User Management state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  // Settings Management state
  const [settingsList, setSettingsList] = useState<SystemSettingItem[]>([]);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  
  // Reports Engine state
  const [reportType, setReportType] = useState('velocity');
  const [reportData, setReportData] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login credentials
  const [phone, setPhone] = useState('09000000000');
  const [password, setPassword] = useState('promptjoo123456');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetchFromApi<{ token?: string; session_token?: string; user?: { role: string } }>(
        '/api/v1/identity/login-password',
        {
          method: 'POST',
          body: JSON.stringify({ phone: phone.trim(), password })
        }
      );
      const token = res.token || res.session_token;
      if (!token) throw new Error('توکن احراز هویت دریافت نشد');
      if (res.user?.role !== 'ADMIN') throw new Error('این حساب کاربری دسترسی سوپرادمین ندارد');
      localStorage.setItem('promptjoo_admin_token', token);
      localStorage.setItem('promptjoo_session_token', token);
      setAdminToken(token);
      setIsAuthenticated(true);
      showDynamicToast({ title: 'ورود موفق به پنل مدیریت', type: 'auth' });
      await loadAdminOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در احراز هویت ادمین');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFromApi<any>('/api/v1/admin/overview');
      setStats(data.stats);
      setAdConfigs(data.ad_configs || []);
      setLogs(data.recent_logs || []);
      setTopPrompts(data.top_prompts || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'دسترسی مجاز نیست یا خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const url = userSearch ? `/api/v1/admin/users?q=${encodeURIComponent(userSearch)}` : '/api/v1/admin/users';
      const data = await fetchFromApi<{ users: UserItem[] }>(url);
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchFromApi<SystemSettingItem[]>('/api/v1/admin/settings');
      setSettingsList(data || []);
      const initialMap: Record<string, string> = {};
      for (const s of data) {
        initialMap[s.setting_key] = JSON.stringify(s.setting_value, null, 2);
      }
      setEditingSettings(initialMap);
    } catch {
      setSettingsList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (type: string) => {
    setLoading(true);
    try {
      const data = await fetchFromApi<any>(`/api/v1/admin/reports/${type}`);
      setReportData(data);
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlockUser = async (userId: string, currentBlocked: boolean) => {
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_blocked: !currentBlocked })
      });
      showDynamicToast({ title: currentBlocked ? 'کاربر رفع مسدودی شد' : 'کاربر مسدود شد', type: 'success' });
      loadUsers();
    } catch {
      showDynamicToast({ title: 'خطا در تغییر وضعیت کاربر', type: 'error' });
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await fetchFromApi(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      showDynamicToast({ title: `نقش کاربر به ${newRole} تغییر یافت`, type: 'success' });
      loadUsers();
    } catch {
      showDynamicToast({ title: 'خطا در تغییر نقش کاربر', type: 'error' });
    }
  };

  const handleSaveSetting = async (key: string) => {
    try {
      const parsedValue = JSON.parse(editingSettings[key] || '{}');
      await fetchFromApi(`/api/v1/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ setting_value: parsedValue })
      });
      showDynamicToast({ title: 'تنظیمات با موفقیت ذخیره شد', type: 'success' });
    } catch (err: unknown) {
      showDynamicToast({ title: 'فرمت JSON نامعتبر است', type: 'error' });
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('promptjoo_admin_token');
    if (cached) {
      setAdminToken(cached);
      setIsAuthenticated(true);
      loadAdminOverview();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'overview') loadAdminOverview();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'settings') loadSettings();
    if (activeTab === 'reports') loadReport(reportType);
  }, [activeTab, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16">
        <div className="glass-panel rounded-3xl p-8 border border-slate-200/90 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">ورود به پنل مدیریت پرامپت‌جو</h2>
              <p className="text-xs text-slate-500">احراز هویت سطح سوپرادمین</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره موبایل ادمین</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کلمه عبور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="pressable w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20"
            >
              {loading ? 'در حال بررسی...' : 'ورود به پنل ادمین'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-4 h-4" />
            مرکز کنترل و نظارت سیستم
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            داشبورد مدیریت و گزارش‌های جامع
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/80 rounded-2xl overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pressable px-3.5 py-1.5 rounded-xl spring-transition whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            نمای کلی
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pressable px-3.5 py-1.5 rounded-xl spring-transition whitespace-nowrap ${
              activeTab === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            گزارش‌های تخصصی
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pressable px-3.5 py-1.5 rounded-xl spring-transition whitespace-nowrap ${
              activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مدیریت کاربران
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pressable px-3.5 py-1.5 rounded-xl spring-transition whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تنظیمات متغیرها
          </button>
        </div>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-500 block mb-1">کل پرامپت‌ها</span>
              <span className="text-2xl font-black text-slate-900">{stats.prompts_count}</span>
            </div>
            <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-500 block mb-1">مجموع کپی‌ها</span>
              <span className="text-2xl font-black text-blue-600">{stats.total_copies?.toLocaleString('fa-IR')}</span>
            </div>
            <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-500 block mb-1">کاربران ثبت‌نامی</span>
              <span className="text-2xl font-black text-emerald-600">{stats.total_users}</span>
            </div>
            <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-500 block mb-1">نشست‌های فعال</span>
              <span className="text-2xl font-black text-indigo-600">{stats.active_sessions}</span>
            </div>
          </div>

          {/* Top Prompts */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              محبوب‌ترین پرامپت‌های کاتالوگ
            </h3>
            <div className="divide-y divide-slate-100">
              {topPrompts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{p.title_fa}</span>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="font-mono">{p.modality}</span>
                    <span className="font-bold text-blue-600">{p.copy_count} کپی</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. USERS MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="جستجو با شماره موبایل..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs text-slate-800"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
            <button
              onClick={loadUsers}
              className="pressable px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              به‌روزرسانی لیست
            </button>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/80">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-3.5 font-bold">شماره موبایل</th>
                  <th className="p-3.5 font-bold">نقش</th>
                  <th className="p-3.5 font-bold">وضعیت حساب</th>
                  <th className="p-3.5 font-bold">پرامپت‌های استفاده‌شده</th>
                  <th className="p-3.5 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-mono" dir="ltr">{u.phone_e164}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.is_blocked ? (
                        <span className="text-red-600 font-bold">مسدود شده</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">فعال</span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-blue-600">
                      {u.total_copied_prompts || 0} پرامپت ({u.total_prompt_executions || 0} کپی)
                    </td>
                    <td className="p-3.5 flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBlockUser(u.id, u.is_blocked)}
                        className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          u.is_blocked ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {u.is_blocked ? 'رفع مسدودی' : 'مسدود کردن'}
                      </button>
                      <button
                        onClick={() => handleToggleUserRole(u.id, u.role)}
                        className="pressable px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200"
                      >
                        {u.role === 'ADMIN' ? 'تبدیل به کاربر عادی' : 'ارتقا به ادمین'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SETTINGS MANAGEMENT TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settingsList.map((item) => (
              <div key={item.id} className="glass-panel rounded-3xl p-6 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 uppercase font-mono">{item.setting_key}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{item.category}</span>
                </div>
                <p className="text-xs text-slate-600">{item.description_fa}</p>
                <textarea
                  rows={6}
                  value={editingSettings[item.setting_key] || ''}
                  onChange={(e) => setEditingSettings({ ...editingSettings, [item.setting_key]: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-slate-800"
                  dir="ltr"
                />
                <button
                  onClick={() => handleSaveSetting(item.setting_key)}
                  className="pressable px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm shadow-blue-600/20"
                >
                  ذخیره این تنظیم
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. REPORTS TAB */}
      {activeTab === 'reports' && (
        <AdminReportsView
          reportType={reportType}
          reportData={reportData}
          loading={loading}
          onSelectReport={(type) => {
            setReportType(type);
            loadReport(type);
          }}
          onRefresh={() => loadReport(reportType)}
        />
      )}
    </div>
  );
}
