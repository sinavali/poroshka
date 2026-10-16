import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from './AppShell';

export const metadata: Metadata = {
  title: 'پرامپت‌جو — مرجع تخصصی پرامپت‌های مهندسی‌شده هوش مصنوعی',
  description: 'کامل‌ترین آرشیو پرامپت‌های تست‌شده ChatGPT، Midjourney، Gemini و Claude برای تولید محتوا، تصویرسازی، برنامه‌نویسی و اکسل با هزینه صفر توکن هوش مصنوعی در ایران.',
  keywords: ['پرامپت', 'پرامپت هوش مصنوعی', 'پرامپت ChatGPT', 'پرامپت میدجورنی', 'تولید محتوا', 'ادیت عکس', 'پرامپت فارسی'],
  authors: [{ name: 'Promptjoo Team' }],
  metadataBase: new URL('https://promptjoo.ir'),
  openGraph: {
    title: 'پرامپت‌جو — مرجع تخصصی پرامپت‌های هوش مصنوعی',
    description: 'کپی سریع و شخصی‌سازی هوشمند پرامپت‌های کاربردی هوش مصنوعی',
    url: 'https://promptjoo.ir',
    siteName: 'پرامپت‌جو',
    locale: 'fa_IR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'پرامپت‌جو — مرجع تخصصی پرامپت‌های هوش مصنوعی',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'پرامپت‌جو — پرامپت‌های مهندسی‌شده هوش مصنوعی',
    description: 'کامل‌ترین آرشیو پرامپت‌های کاربردی برای بازار ایران',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body className="min-h-screen flex flex-col justify-between">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
