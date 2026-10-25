'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ShieldAlert, BarChart3, Users, Settings, FileText, 
  RefreshCw, ShieldCheck, AlertCircle, TrendingUp, Sliders, LogOut,
  Sparkles, MessageSquare, Database, ChevronLeft, Menu, X, LayoutDashboard
} from 'lucide-react';
import { fetchFromApi } from '../../lib/api-client';
import { showDynamicToast } from '../../components/DynamicIslandToast';
import { AdminReportsView } from '../../components/AdminReportsView';
import { AdminDatasetsView } from '../../components/AdminDatasetsView';
import { AdminPromptsView } from '../../components/AdminPromptsView';
import { AdminTicketsView } from '../../components/AdminTicketsView';
import { AdminUsersView } from '../../components/AdminUsersView';
import { AdminSettingsView } from '../../components/AdminSettingsView';
import { AdPlacement } from '../../components/AdPlacement';

export type AdminTab = 'overview' | 'prompts' | 'tickets' | 'users' | 'settings' | 'reports' | 'datasets';

interface AdminStats {
  prompts_count: number;
  published_count: number;
  total_copies: number;
  total_users: number;
  active_sessions: number;
}

interface TopPrompt {
  id: string;
  title_fa: string;
  modality: string;
  copy_count: number;
}

interface NavGroup {
  groupTitle: string;
  items: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: 'داشبورد و مانیتورینگ',
    items: [
      { id: 'overview', label: 'نمای کلی پلتفرم', icon: BarChart3 },
      { id: 'reports', label: 'گزارش‌های تخصصی', icon: FileText }
    ]
  },
  {
    groupTitle: 'مدیریت محتوا',
    items: [
      { id: 'prompts', label: 'کاتالوگ پرامپت‌ها', icon: Sparkles },
      { id: 'datasets', label: 'درون‌ریزی و دیتاست', icon: Database, adminOnly: true }
    ]
  },
  {
    groupTitle: 'عملیات و کاربران',
    items: [
      { id: 'users', label: 'مدیریت کاربران', icon: Users },
      { id: 'tickets', label: 'تیکت‌های پشتیبانی', icon: MessageSquare }
    ]
  },
  {
    groupTitle: 'تنظیمات سیستم',
    items: [
      { id: 'settings', label: 'تنظیمات', icon: Settings, adminOnly: true }
    ]
  }
];

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERATOR'>('ADMIN');
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');

  // Dashboard Overview state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topPrompts, setTopPrompts] = useState<TopPrompt[]>([]);

  // Reports Engine state
  const requestedReport = searchParams.get('report_type') || 'velocity';
  const [reportType, setReportType] = useState(requestedReport);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (requestedReport && requestedReport !== reportType) {
      setReportType(requestedReport);
    }
  }, [requestedReport, reportType]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login credentials
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Current tab from URL search param
  const requestedTab = (searchParams.get('tab') || 'overview') as AdminTab;
  const isOperator = userRole === 'OPERATOR';
  const activeTab: AdminTab = 
    isOperator && (requestedTab === 'settings' || requestedTab === 'datasets')
      ? 'overview'
      : requestedTab;

  const handleTabChange = useCallback((tab: AdminTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/admin?${params.toString()}`);
    setMobileMenuOpen(false);
  }, [router, searchParams]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('poroshka_admin_token');
    localStorage.removeItem('promptjoo_admin_token');
    localStorage.removeItem('poroshka_session_token');
    localStorage.removeItem('promptjoo_session_token');
    setAdminToken('');
    setIsAuthenticated(false);
    setStats(null);
    setReportData(null);
    setError('');
    showDynamicToast({ title: 'از پنل مدیریت خارج شدید', type: 'auth' });
  }, []);

  const checkAuthError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('401') || msg.includes('403') || msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      setError('نشست کاربری شما منقضی یا سطح دسترسی نامعتبر است. لطفاً مجدداً وارد شوید.');
    } else {
      setError(msg || 'خطا در برقراری ارتباط با سرور');
    }
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetchFromApi<{ 
        token?: string; 
        session_token?: string; 
        user?: { id: string; role: string; phone_e164: string } 
      }>(
        '/api/v1/identity/login-password',
        {
          method: 'POST',
          body: JSON.stringify({ phone: phone.trim(), password })
        }
      );
      const token = res.token || res.session_token;
      if (!token) throw new Error('توکن احراز هویت دریافت نشد');
      if (!res.user || !['ADMIN', 'OPERATOR'].includes(res.user.role)) {
        throw new Error('این حساب کاربری دسترسی مدیریتی یا اپراتوری ندارد.');
      }

      localStorage.setItem('poroshka_admin_token', token);
      localStorage.setItem('promptjoo_admin_token', token);
      localStorage.setItem('poroshka_session_token', token);
      localStorage.setItem('promptjoo_session_token', token);
      setAdminToken(token);
      setUserRole(res.user.role as 'ADMIN' | 'OPERATOR');
      setCurrentUserPhone(res.user.phone_e164);
      setIsAuthenticated(true);
      showDynamicToast({ title: 'ورود موفق به پنل مدیریت', type: 'auth' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در احراز هویت');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFromApi<{
        stats: AdminStats;
        top_prompts: TopPrompt[];
      }>('/api/v1/admin/overview');
      setStats(data.stats);
      setTopPrompts(data.top_prompts || []);
    } catch (err: unknown) {
      checkAuthError(err);
    } finally {
      setLoading(false);
    }
  }, [checkAuthError]);

  const loadReport = useCallback(async (type: string) => {
    setLoading(true);
    setReportData(null);
    setError('');
    try {
      const data = await fetchFromApi<Record<string, unknown>>(`/api/v1/admin/reports/${type}`);
      setReportData(data);
    } catch (err: unknown) {
      setReportData(null);
      checkAuthError(err);
    } finally {
      setLoading(false);
    }
  }, [checkAuthError]);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Initial session restoration & role verification
  useEffect(() => {
    const cached = localStorage.getItem('poroshka_admin_token') ||
      localStorage.getItem('promptjoo_admin_token') ||
      localStorage.getItem('poroshka_session_token') ||
      localStorage.getItem('promptjoo_session_token');
    if (cached) {
      setAdminToken(cached);
      fetchFromApi<{ user: { id: string; role: string; phone_e164: string } }>('/api/v1/admin/me')
        .then((res) => {
          if (res.user && ['ADMIN', 'OPERATOR'].includes(res.user.role)) {
            setUserRole(res.user.role as 'ADMIN' | 'OPERATOR');
            setCurrentUserPhone(res.user.phone_e164);
            setIsAuthenticated(true);
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          handleLogout();
        })
        .finally(() => {
          setIsCheckingAuth(false);
        });
    } else {
      setIsCheckingAuth(false);
    }
  }, [handleLogout]);

  // Load tab-specific data when active tab changes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'overview') loadAdminOverview();
    if (activeTab === 'reports') loadReport(reportType);
  }, [activeTab, isAuthenticated, loadAdminOverview, loadReport, reportType]);

  if (isCheckingAuth) {
    return (
      <div className="max-w-md mx-auto py-24 flex flex-col items-center justify-center space-y-4" dir="rtl">
        <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-medium">در حال بررسی نشست مدیریت...</p>
      </div>
    );
  }

  // Not authenticated: Login form
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 animate-scale-in" dir="rtl">
        <div className="glass-panel rounded-3xl p-8 border border-slate-200/90 shadow-xl space-y-6 bg-white/90">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">ورود به کنترل‌پنل مدیریت پوروشکا</h1>
            <p className="text-xs text-slate-500">دسترسی اختصاصی مدیران و اپراتورهای ارشد سامانه</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره همراه</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+98912..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-800"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کلمه عبور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800"
                dir="ltr"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="pressable w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'در حال بررسی...' : 'ورود امن به کنترل‌پنل'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2" dir="rtl">
      <h1 className="sr-only">کنترل‌پنل مدیریت پوروشکا</h1>
      {/* Top Mobile Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-sm font-black text-slate-900">کنترل‌پنل مدیریت</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
            {userRole === 'ADMIN' ? 'مدیر ارشد' : 'اپراتور'}
          </span>
          <button onClick={handleLogout} className="p-2 rounded-xl text-rose-600 hover:bg-rose-50">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Level Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* TWO-LEVEL SIDEBAR (Desktop) */}
        <aside className={`w-full lg:w-64 lg:flex-shrink-0 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-6 sticky top-6 bg-white/95">
            {/* User & Role Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black text-slate-900">
                    {userRole === 'ADMIN' ? 'مدیر ارشد سامانه' : 'اپراتور سامانه'}
                  </span>
                </div>
                {currentUserPhone && (
                  <span className="text-[10px] font-mono text-slate-500 block" dir="ltr">
                    {currentUserPhone}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="خروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Level 1 & 2 Groups */}
            <nav className="space-y-5">
              {NAV_GROUPS.map((group, gIdx) => {
                const visibleItems = group.items.filter((item) => !(isOperator && item.adminOnly));
                if (visibleItems.length === 0) return null;

                return (
                  <div key={gIdx} className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 px-3 tracking-wider">
                      {group.groupTitle}
                    </span>
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`pressable w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                              <span>{item.label}</span>
                            </div>
                            {isActive && <ChevronLeft className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          {/* Admin Header Banners (3 distinct placements) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <AdPlacement slot="admin_top_1" className="!my-0" />
            <AdPlacement slot="admin_top_2" className="!my-0" />
            <AdPlacement slot="admin_top_3" className="!my-0" />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700 font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={handleLogout}
                className="pressable px-3 py-1 rounded-xl bg-white border border-rose-200 text-rose-600 font-bold hover:bg-rose-50"
              >
                ورود مجدد
              </button>
            </div>
          )}

          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {loading && !stats && (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">در حال بارگذاری شاخص‌های داشبورد...</p>
                </div>
              )}

              {!loading && !stats && !error && (
                <div className="text-center py-12 text-slate-400 text-xs space-y-3">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>داده‌ای برای نمایش در نمای کلی یافت نشد.</p>
                  <button
                    onClick={loadAdminOverview}
                    className="pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تلاش مجدد</span>
                  </button>
                </div>
              )}

              {stats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500 block mb-1">کل پرامپت‌ها</span>
                      <span className="text-2xl font-black text-slate-900">{stats.prompts_count.toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] text-emerald-600 block mt-1 font-bold">
                        {stats.published_count.toLocaleString('fa-IR')} پرامپت فعال
                      </span>
                    </div>
                    <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500 block mb-1">مجموع کپی‌ها</span>
                      <span className="text-2xl font-black text-blue-600">{Number(stats.total_copies || 0).toLocaleString('fa-IR')}</span>
                    </div>
                    <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500 block mb-1">کاربران پلتفرم</span>
                      <span className="text-2xl font-black text-emerald-600">{stats.total_users.toLocaleString('fa-IR')}</span>
                    </div>
                    <div className="glass-panel rounded-3xl p-5 border border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500 block mb-1">نشست‌های فعال</span>
                      <span className="text-2xl font-black text-indigo-600">{stats.active_sessions.toLocaleString('fa-IR')}</span>
                    </div>
                  </div>

                  {/* Top Prompts */}
                  <div className="glass-panel rounded-3xl p-6 border border-slate-200/80">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      محبوب‌ترین پرامپت‌های کاتالوگ
                    </h3>
                    {topPrompts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">پرامپتی برای نمایش یافت نشد.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {topPrompts.map((p) => (
                          <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{p.title_fa}</span>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span className="font-mono">{p.modality}</span>
                              <span className="font-bold text-blue-600">{Number(p.copy_count).toLocaleString('fa-IR')} کپی</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. PROMPTS TAB */}
          {activeTab === 'prompts' && <AdminPromptsView />}

          {/* 3. TICKETS TAB */}
          {activeTab === 'tickets' && <AdminTicketsView currentUserRole={userRole} />}

          {/* 4. USERS TAB */}
          {activeTab === 'users' && (
            <AdminUsersView 
              currentUserPhone={currentUserPhone}
              userRole={userRole}
            />
          )}

          {/* 5. SETTINGS TAB (Superadmin Only) */}
          {activeTab === 'settings' && !isOperator && (
            <AdminSettingsView isOperator={isOperator} />
          )}

          {/* 6. REPORTS TAB */}
          {activeTab === 'reports' && (
            <AdminReportsView
              reportType={reportType}
              reportData={reportData}
              loading={loading}
              onSelectReport={(type) => {
                setReportType(type);
                const params = new URLSearchParams(searchParams.toString());
                params.set('tab', 'reports');
                params.set('report_type', type);
                router.replace(`/admin?${params.toString()}`);
                loadReport(type);
              }}
              onRefresh={() => loadReport(reportType)}
            />
          )}

          {/* 7. DATASETS TAB (Superadmin Only) */}
          {activeTab === 'datasets' && !isOperator && <AdminDatasetsView />}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVBAR FOR ADMIN */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200/90 py-2 px-3 shadow-xl flex items-center justify-around"
        dir="rtl"
      >
        <button
          onClick={() => handleTabChange('overview')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl ${activeTab === 'overview' ? 'text-blue-600 font-black' : 'text-slate-500'}`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">داشبورد</span>
        </button>

        <button
          onClick={() => handleTabChange('prompts')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl ${activeTab === 'prompts' ? 'text-blue-600 font-black' : 'text-slate-500'}`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">پرامپت‌ها</span>
        </button>

        <button
          onClick={() => handleTabChange('tickets')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl ${activeTab === 'tickets' ? 'text-blue-600 font-black' : 'text-slate-500'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">تیکت‌ها</span>
        </button>

        {!isOperator && (
          <button
            onClick={() => handleTabChange('datasets')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl ${activeTab === 'datasets' ? 'text-blue-600 font-black' : 'text-slate-500'}`}
          >
            <Database className="w-5 h-5" />
            <span className="text-[10px]">دیتاست</span>
          </button>
        )}

        {!isOperator && (
          <button
            onClick={() => handleTabChange('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl ${activeTab === 'settings' ? 'text-blue-600 font-black' : 'text-slate-500'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">تنظیمات</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center space-y-3" dir="rtl">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-medium">در حال بارگذاری کنترل‌پنل مدیریت...</p>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
