'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, BarChart3, Radio, FileText, ToggleLeft, ToggleRight, Check, RefreshCw } from 'lucide-react';
import { fetchFromApi } from '../../lib/api-client';

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<{
    prompts_count: number;
    published_count: number;
    total_copies: number;
    total_views: number;
  } | null>(null);
  const [adConfigs, setAdConfigs] = useState<Array<{
    id: string;
    placement_slot: string;
    provider: string;
    zone_id: string;
    is_active: boolean;
  }>>([]);
  const [logs, setLogs] = useState<Array<{
    method: string;
    path: string;
    status: number;
    duration_ms: number;
    ip?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginMode, setLoginMode] = useState<'credentials' | 'token'>('credentials');
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
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در احراز هویت ادمین';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminToken.trim()) {
      localStorage.setItem('promptjoo_admin_token', adminToken.trim());
      localStorage.setItem('promptjoo_session_token', adminToken.trim());
      setIsAuthenticated(true);
      loadAdminData();
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFromApi<{
        stats: { prompts_count: number; published_count: number; total_copies: number; total_views: number };
        ad_configs: Array<{ id: string; placement_slot: string; provider: string; zone_id: string; is_active: boolean }>;
        recent_logs: Array<{ method: string; path: string; status: number; duration_ms: number; ip?: string }>;
      }>('/api/v1/admin/overview');
      setStats(data.stats);
      setAdConfigs(data.ad_configs);
      setLogs(data.recent_logs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'دسترسی مجاز نیست یا خطا در دریافت اطلاعات';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('promptjoo_admin_token');
    if (cached) {
      setAdminToken(cached);
      setIsAuthenticated(true);
      loadAdminData();
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16">
        <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">ورود به پنل مدیریت پرامپت‌جو</h2>
              <p className="text-xs text-gray-400">نیازمند توکن احراز هویت سطح سوپرادمین</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 text-xs">
            <button
              type="button"
              onClick={() => { setLoginMode('credentials'); setError(''); }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                loginMode === 'credentials' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              شماره و رمز عبور
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('token'); setError(''); }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                loginMode === 'token' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              توکن نشست (Token)
            </button>
          </div>

          {loginMode === 'credentials' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">شماره موبایل ادمین</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  placeholder="09000000000"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">رمز عبور سوپرادمین</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  placeholder="رمز عبور..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                ورود به پنل مدیریت
              </button>
            </form>
          ) : (
            <form onSubmit={handleTokenLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">توکن دسترسی ادمین (Bearer Token)</label>
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  dir="ltr"
                  placeholder="Bearer Token..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-lg shadow-blue-600/30 transition-all"
              >
                ورود با توکن
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white">کنسول مدیریت و مانیتورینگ پرامپت‌جو</h1>
          <p className="text-xs text-gray-400">نظارت بر ترافیک شبکه، فضاهای تبلیغاتی یکتانت/تپسل و رویدادهای سیستم</p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>بروزرسانی داده‌ها</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-gray-400">تعداد کل پرامپت‌ها</span>
            <div className="text-2xl font-black text-white font-mono">{stats.prompts_count}</div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-gray-400">پرامپت‌های منتشرشده</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats.published_count}</div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-gray-400">مجموع دفعات کپی</span>
            <div className="text-2xl font-black text-blue-400 font-mono">{stats.total_copies?.toLocaleString('fa-IR')}</div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-gray-400">مجموع بازدیدها</span>
            <div className="text-2xl font-black text-purple-400 font-mono">{stats.total_views?.toLocaleString('fa-IR')}</div>
          </div>
        </div>
      )}

      {/* Ad Zones Manager */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">پیکربندی جایگاه‌های تبلیغاتی یکتانت و تپسل</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="pb-3">شناسه اسلات</th>
                <th className="pb-3">سرویس‌دهنده</th>
                <th className="pb-3">Zone ID</th>
                <th className="pb-3">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              {adConfigs.map((ad) => (
                <tr key={ad.id} className="hover:bg-white/5">
                  <td className="py-3 font-mono text-[11px]">{ad.placement_slot}</td>
                  <td className="py-3 uppercase font-semibold">{ad.provider}</td>
                  <td className="py-3 font-mono text-[11px]">{ad.zone_id}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      فعال
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embedded SQLite Request Logs */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">لاگ‌های درخواست‌های زنده (ذخیره‌شده در SQLite محلی)</h3>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="pb-2">متد</th>
                <th className="pb-2">مسیر (Path)</th>
                <th className="pb-2">وضعیت</th>
                <th className="pb-2">مدت زمان</th>
                <th className="pb-2">IP کلاینت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px] text-gray-300">
              {logs.map((log, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="py-2 text-blue-400">{log.method}</td>
                  <td className="py-2 text-gray-200 truncate max-w-xs">{log.path}</td>
                  <td className={`py-2 ${log.status >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {log.status}
                  </td>
                  <td className="py-2">{log.duration_ms?.toFixed(1)}ms</td>
                  <td className="py-2 text-gray-500">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
