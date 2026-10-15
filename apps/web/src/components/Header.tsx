'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Sparkles, User, Brain, Menu, X, History } from 'lucide-react';

interface HeaderProps {
  onOpenMemory: () => void;
  onOpenAuth: () => void;
  userPhone?: string | null;
}

export function Header({ onOpenMemory, onOpenAuth, userPhone }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasMemory, setHasMemory] = useState(false);

  useEffect(() => {
    const memory = localStorage.getItem('promptjoo_user_profile');
    if (memory) {
      try {
        const parsed = JSON.parse(memory);
        if (parsed.brand_name || parsed.target_audience) {
          setHasMemory(true);
        }
      } catch {}
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (window.location.search.includes('q=')) {
      window.location.href = '/';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0 pressable-subtle">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 spring-transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              پرامپت‌جو
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                PRO
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">مرجع تخصصی پرامپت هوش مصنوعی</span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در هزاران پرامپت (مثلاً: ادیت فیلم، سناریو استوری، اکسل...)"
            className="w-full bg-white border border-slate-200/90 rounded-full py-2 pr-10 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/50 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Action Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* User's Used Prompts Library */}
          <Link
            href="/my-prompts"
            className="pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100/70"
            title="آرشیو پرامپت‌های استفاده‌شده شما"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>پرامپت‌های من</span>
          </Link>

          {/* Personal Memory Button */}
          <button
            onClick={onOpenMemory}
            className="pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100/70"
            title="شخصی‌سازی خودکار پرامپت‌ها با اطلاعات برند شما"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
            <span>حافظه من</span>
            {hasMemory && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Auth Button */}
          {userPhone ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span dir="ltr">{userPhone}</span>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="pressable flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
            >
              <User className="w-3.5 h-3.5" />
              <span>ورود / عضویت</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="pressable p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-dropdown border-b border-slate-200 px-4 py-4 space-y-3 animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در پرامپت‌ها..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-9 pl-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </form>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/my-prompts"
              onClick={() => setMobileMenuOpen(false)}
              className="pressable flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                پرامپت‌های استفاده‌شده من
              </span>
              <span className="text-[10px] text-blue-600 font-bold">آرشیو من</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMemory();
              }}
              className="pressable flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                تنظیمات حافظه شخصی من
              </span>
              {hasMemory ? (
                <span className="text-[10px] text-emerald-600 font-bold">فعال</span>
              ) : (
                <span className="text-[10px] text-slate-400">تنظیم نشده</span>
              )}
            </button>

            {userPhone ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 text-xs text-slate-700 border border-slate-200">
                <span>حساب کاربری:</span>
                <span dir="ltr">{userPhone}</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="pressable w-full py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white text-center shadow-md shadow-blue-600/20"
              >
                ورود یا ثبت‌نام با شماره موبایل
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
