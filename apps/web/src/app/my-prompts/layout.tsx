import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'پرامپت‌های من | پوروشکا',
  description: 'آرشیو پرامپت‌های کپی‌شده و شخصی‌سازی‌شده کاربر در پوروشکا؛ سازماندهی دسته‌بندی‌های شخصی و مدیریت قالب‌های هوش مصنوعی.',
  alternates: {
    canonical: 'https://poroshka.ir/my-prompts',
  },
  openGraph: {
    title: 'پرامپت‌های من | پوروشکا',
    description: 'آرشیو پرامپت‌های کپی‌شده و شخصی‌سازی‌شده کاربر در پوروشکا؛ سازماندهی دسته‌بندی‌های شخصی و مدیریت قالب‌های هوش مصنوعی.',
    url: 'https://poroshka.ir/my-prompts',
    siteName: 'پوروشکا',
    locale: 'fa_IR',
    type: 'website',
  },
};

export default function MyPromptsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
