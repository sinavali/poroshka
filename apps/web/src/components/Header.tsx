'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Sparkles, User, Brain, Menu, X, ArrowLeft } from 'lucide-react';

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
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0 pressable-subtle">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 spring-transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              پرامپت‌جو
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO
              </span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium">مرجع تخصصی پرامپت هوش مصنوعی</span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در هزاران پرامپت (مثلاً: ادیت فیلم، سناریو استوری، اکسل...)"
            className="w-full bg-slate-900/80 border border-white/10 rounded-full py-2 pr-10 pl-9 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/50 spring-transition"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute left-3 top-2.5 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 spring-transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Action Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Personal Memory Button */}
          <button
            onClick={onOpenMemory}
            className="pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40"
            title="شخصی‌سازی خودکار پرامپت‌ها با اطلاعات برند شما"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>حافظه من</span>
            {hasMemory && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Auth Button */}
          {userPhone ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-white/10 text-xs font-medium text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span dir="ltr">{userPhone}</span>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="pressable flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 border border-blue-400/30"
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
            className="pressable p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-dropdown border-b border-white/10 px-4 py-4 space-y-3 animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در پرامپت‌ها..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl py-2.5 pr-9 pl-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
          </form>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMemory();
              }}
              className="pressable flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
            >
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                تنظیمات حافظه شخصی من
              </span>
              {hasMemory ? (
                <span className="text-[10px] text-emerald-400 font-bold">فعال</span>
              ) : (
                <span className="text-[10px] text-gray-400">تنظیم نشده</span>
              )}
            </button>

            {userPhone ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800 text-xs text-gray-300 border border-white/5">
                <span>حساب کاربری:</span>
                <span dir="ltr">{userPhone}</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="pressable w-full py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white text-center shadow-md shadow-blue-600/30"
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
