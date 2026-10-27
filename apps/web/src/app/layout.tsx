import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from './AppShell';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poroshka.ir';

export const metadata: Metadata = {
  title: 'پوروشکا | مرجع تخصصی پرامپت‌های مهندسی‌شده هوش مصنوعی',
  description: 'کامل‌ترین آرشیو پرامپت‌های تست‌شده هوش مصنوعی (ChatGPT، Midjourney، Claude، Gemini و DeepSeek) با کپی سریع و هزینه صفر توکن در ایران.',
  keywords: ['پوروشکا', 'پرامپت', 'پرامپت هوش مصنوعی', 'پرامپت ChatGPT', 'پرامپت میدجورنی', 'پرامپت کلود', 'تولید محتوا', 'ادیت عکس', 'پرامپت فارسی'],
  authors: [{ name: 'Poroshka Team' }],
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 150'><defs><linearGradient id='a' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%232864F0'/><stop offset='1' stop-color='%237548F5'/></linearGradient></defs><path fill='url(%23a)' fill-rule='evenodd' d='M44 12C24 12 12 26 12 44L12 74C12 92 26 104 44 104L52 104C88 104 118 88 118 56L118 44C118 26 104 12 86 12ZM50 42L84 36C92 34.5 98 40 98 48L98 54C98 66 86 74 70 76L56 78C50 79 46 75 46 69L46 50C46 46 47 43 50 42Z'/><rect x='40' y='112' width='22' height='22' rx='4' transform='rotate(45 51 123)' fill='%2310265D'/><path fill='%23FFB51B' d='M120 2C122.2 12.4 126.6 16.8 137 19C126.6 21.2 122.2 25.6 120 36C117.8 25.6 113.4 21.2 103 19C113.4 16.8 117.8 12.4 120 2Z'/></svg>",
  },
  openGraph: {
    title: 'پوروشکا | کتابخانه پرامپت‌های آماده، نتایج واقعی',
    description: 'انتخاب پرامپت‌های آماده و تست‌شده هوش مصنوعی برای خلق محتوا، ادیت تصویر و کدنویسی؛ شخصی‌سازی سریع مقادیر و کپی رایگان در پلتفرم پوروشکا.',
    url: baseUrl,
    siteName: 'پوروشکا',
    locale: 'fa_IR',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/api/og?title=${encodeURIComponent('پوروشکا | کتابخانه پرامپت‌های آماده هوش مصنوعی')}&badge=${encodeURIComponent('همیشه رایگان')}`,
        width: 1200,
        height: 630,
        type: 'image/svg+xml',
        alt: 'پوروشکا — مرجع تخصصی پرامپت‌های هوش مصنوعی',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'پوروشکا | پرامپت‌های مهندسی‌شده هوش مصنوعی',
    description: 'کامل‌ترین آرشیو پرامپت‌های کاربردی برای بازار ایران با کپی رایگان',
    images: [`${baseUrl}/api/og?title=${encodeURIComponent('پوروشکا | مرجع تخصصی پرامپت هوش مصنوعی')}`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <head>
        {/* Ahrefs Analytics */}
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="/Opk595JFwlHwQhZaAUBPw"
          async
        />
        {/* Yektanet Analytics & Native Ad Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(e,t,n){e.yektanetAnalyticsObject=n,e[n]=e[n]||function(){e[n].q.push(arguments)},e[n].q=e[n].q||[];var a=t.getElementsByTagName("head")[0],r=new Date,c="https://cdn.yektanet.com/superscript-v2/KGu5iqrB/native-48980/yn_pub.js?v="+r.getFullYear().toString()+"0"+r.getMonth()+"0"+r.getDate()+"0"+r.getHours(),s=t.createElement("link");s.rel="preload",s.as="script",s.href=c,a.appendChild(s);var l=t.createElement("script");l.async=!0,l.src=c,a.appendChild(l);}(window,document,"yektanet");`
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col justify-between bg-white text-[#10265D]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
