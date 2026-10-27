import Link from 'next/link';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="glass-panel max-w-md w-full rounded-3xl p-8 border border-slate-200/80 text-center space-y-5 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-xs">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-bold text-blue-600 uppercase tracking-widest">
            خطای ۴۰۴
          </span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            صفحه مورد نظر یافت نشد
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            صفحه‌ای که به دنبال آن هستید حذف شده، تغییر آدرس داده یا وجود ندارد.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="pressable inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20"
          >
            <Home className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی کاتالوگ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
