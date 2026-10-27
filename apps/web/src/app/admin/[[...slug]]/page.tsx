'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { 
  ShieldAlert, BarChart3, Users, Settings, FileText, 
  RefreshCw, ShieldCheck, AlertCircle, TrendingUp, Sliders, LogOut,
  Sparkles, MessageSquare, Database, ChevronLeft, Menu, X, LayoutDashboard
} from 'lucide-react';
import { fetchFromApi } from '../../../lib/api-client';
import { showDynamicToast } from '../../../components/DynamicIslandToast';
import { AdminReportsView } from '../../../components/AdminReportsView';
import { AdminDatasetsView } from '../../../components/AdminDatasetsView';
import { AdminPromptsView } from '../../../components/AdminPromptsView';
import { AdminTicketsView } from '../../../components/AdminTicketsView';
import { AdminUsersView } from '../../../components/AdminUsersView';
import { AdminSettingsView } from '../../../components/AdminSettingsView';
import { AdPlacement } from '../../../components/AdPlacement';

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
    defaultPath: string;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: 'داشبورد و مانیتورینگ',
    items: [
      { id: 'overview', label: 'نمای کلی پلتفرم', icon: BarChart3, defaultPath: '/admin' },
      { id: 'reports', label: 'گزارش‌های تخصصی', icon: FileText, defaultPath: '/admin/reports/velocity' }
    ]
  },
  {
    groupTitle: 'مدیریت محتوا',
    items: [
      { id: 'prompts', label: 'کاتالوگ پرامپت‌ها', icon: Sparkles, defaultPath: '/admin/prompts' },
      { id: 'datasets', label: 'درون‌ریزی و دیتاست', icon: Database, adminOnly: true, defaultPath: '/admin/datasets/upload' }
    ]
  },
  {
    groupTitle: 'عملیات و کاربران',
    items: [
      { id: 'users', label: 'مدیریت کاربران', icon: Users, defaultPath: '/admin/users' },
      { id: 'tickets', label: 'تیکت‌های پشتیبانی', icon: MessageSquare, defaultPath: '/admin/tickets' }
    ]
  },
  {
    groupTitle: 'تنظیمات سیستم',
    items: [
      { id: 'settings', label: 'تنظیمات', icon: Settings, adminOnly: true, defaultPath: '/admin/settings/ads' }
    ]
  }
];

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERATOR'>('ADMIN');
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');

  // Dashboard Overview state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topPrompts, setTopPrompts] = useState<TopPrompt[]>([]);

  // Parse path slug from /admin/[[...slug]]
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug] : [];

  // Determine active tab: /admin/settings/ads -> slug[0] === 'settings'
  const slugTab = slug[0] as AdminTab | undefined;
  const legacyTab = searchParams.get('tab') as AdminTab | undefined;
  const rawTab = slugTab || legacyTab || 'overview';
  const VALID_TABS: AdminTab[] = ['overview', 'prompts', 'tickets', 'users', 'settings', 'reports', 'datasets'];
  const requestedTab: AdminTab = VALID_TABS.includes(rawTab) ? rawTab : 'overview';

  const isOperator = userRole === 'OPERATOR';
  const activeTab: AdminTab = 
    isOperator && (requestedTab === 'settings' || requestedTab === 'datasets')
      ? 'overview'
      : requestedTab;

  // Reports Engine state
  const slugReport = slug[0] === 'reports' && slug[1] ? slug[1] : null;
  const requestedReport = slugReport || searchParams.get('report_type') || 'velocity';
  const [reportType, setReportType] = useState(requestedReport);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (requestedReport && requestedReport !== reportType) {
      setReportType(requestedReport);
    }
  }, [requestedReport, reportType]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login credentials
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleTabChange = useCallback((tab: AdminTab) => {
    setMobileMenuOpen(false);
    if (tab === 'overview') {
      router.push('/admin');
    } else if (tab === 'settings') {
      router.push('/admin/settings/ads');
    } else if (tab === 'datasets') {
      router.push('/admin/datasets/upload');
    } else if (tab === 'reports') {
      router.push(`/admin/reports/${reportType || 'velocity'}`);
    } else {
      router.push(`/admin/${tab}`);
    }
  }, [router, reportType]);

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
    <div className="space-y-6 pb-20 lg:pb-8" dir="rtl">
      {/* Top Admin Ad Placements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <AdPlacement slot="admin_top_1" />
        <AdPlacement slot="admin_top_2" />
        <AdPlacement slot="admin_top_3" />
      </div>

      {/* Top Bar for Desktop & Mobile Toggle */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            aria-label="منوی ناوبری مدیریت"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-base font-black text-slate-900 tracking-tight">کنترل‌پنل مدیریت پوروشکا</h1>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${isOperator ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
              {isOperator ? 'اپراتور' : 'مدیر ارشد'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUserPhone && (
            <span className="hidden sm:inline-block text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
              {currentUserPhone}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 spring-transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* SIDEBAR NAVIGATION */}
        <aside className={`lg:col-span-1 space-y-4 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="glass-panel rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.groupTitle} className="space-y-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-2">{group.groupTitle}</h4>
                {group.items.map((item) => {
                  if (item.adminOnly && isOperator) return null;
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold spring-transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${isActive ? 'translate-x-0 opacity-100' : 'opacity-0 -translate-x-1'}`} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">دیده‌بانی و وضعیت لحظه‌ای سیستم</h2>
                  <p className="text-xs text-slate-500">شاخص‌های کلیدی عملکرد و سلامت کلی پوروشکا</p>
                </div>
                <button
                  type="button"
                  onClick={loadAdminOverview}
                  disabled={loading}
                  className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                  <span>تازه‌سازی آمار</span>
                </button>
              </div>

              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-[11px] font-bold text-slate-500">کل پرامپت‌ها</p>
                    <p className="text-xl font-black text-slate-900 font-mono">{Number(stats.prompts_count).toLocaleString('fa-IR')}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">موجود در پایگاه‌داده</p>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-[11px] font-bold text-slate-500">منتشر شده</p>
                    <p className="text-xl font-black text-emerald-600 font-mono">{Number(stats.published_count).toLocaleString('fa-IR')}</p>
                    <p className="text-[10px] text-slate-400 font-medium">قابل مشاهده عمومی</p>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-[11px] font-bold text-slate-500">مجموع کپی‌ها</p>
                    <p className="text-xl font-black text-blue-600 font-mono">{Number(stats.total_copies).toLocaleString('fa-IR')}</p>
                    <p className="text-[10px] text-blue-500 font-medium">تعامل موفق کاربران</p>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-[11px] font-bold text-slate-500">کاربران ثبت‌نامی</p>
                    <p className="text-xl font-black text-purple-600 font-mono">{Number(stats.total_users).toLocaleString('fa-IR')}</p>
                    <p className="text-[10px] text-slate-400 font-medium">دارای حساب کاربری</p>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 col-span-2 sm:col-span-1">
                    <p className="text-[11px] font-bold text-slate-500">نشست‌های فعال</p>
                    <p className="text-xl font-black text-indigo-600 font-mono">{Number(stats.active_sessions).toLocaleString('fa-IR')}</p>
                    <p className="text-[10px] text-indigo-500 font-medium">نشست معتبر ۳۰ روزه</p>
                  </div>
                </div>
              )}

              {/* Top Prompts Leaderboard */}
              {topPrompts.length > 0 && (
                <div className="glass-panel rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black text-slate-800">محبوب‌ترین پرامپت‌ها بر اساس نرخ تعامل</h3>
                  </div>
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
                router.push(`/admin/reports/${type}`);
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
