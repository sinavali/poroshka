'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PersonalMemoryModal } from '../components/PersonalMemoryModal';
import { AuthModal } from '../components/AuthModal';
import { AdBanner } from '../components/AdBanner';
import { DynamicIslandToast } from '../components/DynamicIslandToast';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  useEffect(() => {
    const phone = localStorage.getItem('promptjoo_user_phone');
    if (phone) setUserPhone(phone);
  }, []);

  return (
    <>
      <DynamicIslandToast />
      <Header
        onOpenMemory={() => setMemoryModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        userPhone={userPhone}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-12">
        {children}
      </main>

      <Footer />

      {/* Sticky Bottom Ad Slot */}
      <AdBanner placementSlot="STICKY_FOOTER_BANNER" />

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
    </>
  );
}
