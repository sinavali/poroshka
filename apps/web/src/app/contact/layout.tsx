import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تماس با ما و پشتیبانی | پوروشکا',
  description: 'راه‌های ارتباطی، شماره تماس و ایمیل رسمی پشتیبانی پلتفرم پوروشکا برای پاسخگویی به سوالات و راهنمایی پرامپت‌های مهندسی‌شده.',
  alternates: {
    canonical: 'https://poroshka.ir/contact',
  },
  openGraph: {
    title: 'تماس با ما و پشتیبانی | پوروشکا',
    description: 'راه‌های ارتباطی، شماره تماس و ایمیل رسمی پشتیبانی پلتفرم پوروشکا برای پاسخگویی به سوالات و راهنمایی پرامپت‌های مهندسی‌شده.',
    url: 'https://poroshka.ir/contact',
    siteName: 'پوروشکا',
    locale: 'fa_IR',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
