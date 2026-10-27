'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bookmark, MessageSquare, HelpCircle, Sparkles } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PersonalMemoryModal } from '../components/PersonalMemoryModal';
import { AuthModal } from '../components/AuthModal';
import { UserTicketsModal } from '../components/UserTicketsModal';
import { AdPlacement } from '../components/AdPlacement';
import { PersistentAdPool } from '../components/PersistentAdPool';
import { DynamicIslandToast } from '../components/DynamicIslandToast';
import { PublicSettingsProvider } from '../lib/public-settings';
import { triggerYektanetSpaReset } from '../lib/persistent-ad-pool';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [ticketsModalOpen, setTicketsModalOpen] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  useEffect(() => {
    const phone = localStorage.getItem('poroshka_user_phone') || localStorage.getItem('promptjoo_user_phone');
    if (phone) setUserPhone(phone);

    const handleOpenTickets = () => setTicketsModalOpen(true);
    const handleOpenMemory = () => setMemoryModalOpen(true);
    window.addEventListener('poroshka:open-tickets', handleOpenTickets);
    window.addEventListener('poroshka:open-memory', handleOpenMemory);
    window.addEventListener('promptjoo:open-tickets', handleOpenTickets);
    window.addEventListener('promptjoo:open-memory', handleOpenMemory);
    return () => {
      window.removeEventListener('poroshka:open-tickets', handleOpenTickets);
      window.removeEventListener('poroshka:open-memory', handleOpenMemory);
      window.removeEventListener('promptjoo:open-tickets', handleOpenTickets);
      window.removeEventListener('promptjoo:open-memory', handleOpenMemory);
    };
  }, []);

  useEffect(() => {
    // Re-evaluate and trigger Yektanet ad placements on Next.js SPA client-side route changes
    triggerYektanetSpaReset();
  }, [pathname]);

  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <PublicSettingsProvider>
      <DynamicIslandToast />
      <PersistentAdPool />
      {!isAdminPage && <AdPlacement slot="header_top" />}
      {!isAdminPage && (
        <Header
          onOpenMemory={() => setMemoryModalOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          userPhone={userPhone}
        />
      )}

      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${isAdminPage ? 'pb-24 lg:pb-12' : 'pb-28 sm:pb-12'}`}>
        {children}
      </main>

      {!isAdminPage && <Footer />}

      {/* MOBILE BOTTOM NAVIGATION BAR FOR NORMAL USERS */}
      {!isAdminPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200/90 py-2 px-3 shadow-xl flex items-center justify-around"
          dir="rtl"
        >
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              pathname === '/'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${pathname === '/' ? 'bg-blue-50' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px]">خانه</span>
          </Link>

          <Link
            href="/my-prompts"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              pathname === '/my-prompts'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${pathname === '/my-prompts' ? 'bg-blue-50' : ''}`}>
              <Bookmark className="w-5 h-5" />
            </div>
            <span className="text-[10px]">پرامپت‌های من</span>
          </Link>

          <button
            onClick={() => setTicketsModalOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-slate-500 hover:text-slate-800 font-medium transition-all"
          >
            <div className="p-1 rounded-xl hover:bg-slate-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[10px]">پشتیبانی</span>
          </button>

          <Link
            href="/faq"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              pathname === '/faq'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${pathname === '/faq' ? 'bg-blue-50' : ''}`}>
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px]">راهنما</span>
          </Link>
        </nav>
      )}

      {/* Modals */}
      <PersonalMemoryModal
        isOpen={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(phone) => setUserPhone(phone)}
      />

      <UserTicketsModal
        isOpen={ticketsModalOpen}
        onClose={() => setTicketsModalOpen(false)}
        onRequireLogin={() => setAuthModalOpen(true)}
      />
    </PublicSettingsProvider>
  );
}
