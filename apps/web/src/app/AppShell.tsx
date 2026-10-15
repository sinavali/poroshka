'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { PersonalMemoryModal } from '../components/PersonalMemoryModal.tsx';
import { AuthModal } from '../components/AuthModal.tsx';
import { AdBanner } from '../components/AdBanner.tsx';

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
      <Header
        onOpenMemory={() => setMemoryModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        userPhone={userPhone}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
