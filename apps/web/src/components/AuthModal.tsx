'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, KeyRound, ShieldCheck, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (phone: string, token: string) => void;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [messengerToken, setMessengerToken] = useState<string | null>(null);
  const [timer, setTimer] = useState(180);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'code' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    const handleRequestPasswordSms = async () => {
    setErrorMsg('');
    if (!phone || phone.length < 10) {
      setErrorMsg('برای دریافت کلمه عبور، ابتدا شماره موبایل معتبر را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const altchaPayload = await solveAltcha();
      const res = await fetchFromApi<{ ok: boolean; message?: string }>(
        '/api/v1/identity/request-password',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            altcha_payload: altchaPayload
          })
        }
      );

      if (res && res.ok) {
        showDynamicToast({
          title: 'ارسال پیامک',
          message: res.message || 'کلمه عبور جدید به شماره همراه شما پیامک شد.',
          type: 'auth'
        });
      } else {
        setErrorMsg('ارسال پیامک کلمه عبور با مشکل مواجه شد.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return () => clearInterval(interval);
  }, [step, timer]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const handleRequestPasswordSms = async () => {
    setErrorMsg('');
    if (!phone || phone.length < 10) {
      setErrorMsg('برای دریافت کلمه عبور، ابتدا شماره موبایل معتبر را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const altchaPayload = await solveAltcha();
      const res = await fetchFromApi<{ ok: boolean; message?: string }>(
        '/api/v1/identity/request-password',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            altcha_payload: altchaPayload
          })
        }
      );

      if (res && res.ok) {
        showDynamicToast({
          title: 'ارسال پیامک',
          message: res.message || 'کلمه عبور جدید به شماره همراه شما پیامک شد.',
          type: 'auth'
        });
      } else {
        setErrorMsg('ارسال پیامک کلمه عبور با مشکل مواجه شد.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Simple browser-side Altcha challenge solver
  async function solveAltcha(): Promise<string> {
    try {
      const challengeData = await fetchFromApi<{ challenge: string; salt: string; signature: string }>(
        '/api/v1/identity/altcha-challenge'
      );
      // Solve PoW in JS
      const targetHash = challengeData.challenge;
      const salt = challengeData.salt;
      let solvedNum = 0;

      // Quick worker or loop
      for (let i = 1000; i <= 60000; i++) {
        // Use SubtleCrypto
        const data = new TextEncoder().encode(salt + i);
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        if (hashHex === targetHash) {
          solvedNum = i;
          break;
        }
      }

      const payload = {
        algorithm: 'SHA-256',
        challenge: targetHash,
        number: solvedNum,
        salt: salt,
        signature: challengeData.signature
      };
      return btoa(JSON.stringify(payload));
    } catch {
      return '';
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone || phone.length < 10) {
      setErrorMsg('لطفاً شماره موبایل معتبر ۱۱ رقمی (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const altchaPayload = await solveAltcha();
      const res = await fetchFromApi<{ ok: boolean; messenger_token?: string }>(
        '/api/v1/identity/send-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            altcha_payload: altchaPayload
          })
        }
      );

      if (res.ok) {
        setStep('code');
        setTimer(180);
        if (res.messenger_token) {
          setMessengerToken(res.messenger_token);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ارسال کد تایید';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!code || code.length < 4) {
      setErrorMsg('لطفاً کد تایید ۵ رقمی را کامل وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchFromApi<{ session_token?: string; token?: string; phone?: string; user?: { phone_e164: string } }>(
        '/api/v1/identity/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            code: code.trim()
          })
        }
      );

      const sessionToken = res.session_token || res.token;
      const userPhone = res.phone || res.user?.phone_e164 || phone.trim();

      if (sessionToken) {
        localStorage.setItem('poroshka_session_token', sessionToken);
        localStorage.setItem('poroshka_user_phone', userPhone);
        localStorage.setItem('promptjoo_session_token', sessionToken);
        localStorage.setItem('promptjoo_user_phone', userPhone);
        showDynamicToast({
          title: 'ورود موفقیت‌آمیز',
          message: `خوش آمدید ${userPhone}`,
          type: 'auth'
        });
        onLoginSuccess(userPhone, sessionToken);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'کد وارد شده اشتباه یا منقضی است';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetchFromApi<{ session_token?: string; token?: string; phone?: string; user?: { phone_e164: string } }>(
        '/api/v1/identity/login-password',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            password: password
          })
        }
      );

      const sessionToken = res.session_token || res.token;
      const userPhone = res.phone || res.user?.phone_e164 || phone.trim();

      if (sessionToken) {
        localStorage.setItem('poroshka_session_token', sessionToken);
        localStorage.setItem('poroshka_user_phone', userPhone);
        localStorage.setItem('promptjoo_session_token', sessionToken);
        localStorage.setItem('promptjoo_user_phone', userPhone);
        showDynamicToast({
          title: 'ورود موفقیت‌آمیز',
          message: `خوش آمدید ${userPhone}`,
          type: 'auth'
        });
        onLoginSuccess(userPhone, sessionToken);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'شماره تماس یا کلمه عبور نادرست است';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordSms = async () => {
    setErrorMsg('');
    if (!phone || phone.length < 10) {
      setErrorMsg('برای دریافت کلمه عبور، ابتدا شماره موبایل معتبر را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const altchaPayload = await solveAltcha();
      const res = await fetchFromApi<{ ok: boolean; message?: string }>(
        '/api/v1/identity/request-password',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            altcha_payload: altchaPayload
          })
        }
      );

      if (res && res.ok) {
        showDynamicToast({
          title: 'ارسال پیامک',
          message: res.message || 'کلمه عبور جدید به شماره همراه شما پیامک شد.',
          type: 'auth'
        });
      } else {
        setErrorMsg('ارسال پیامک کلمه عبور با مشکل مواجه شد.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md w-screen h-screen"
    >
      <div className="w-full max-w-md glass-dropdown rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 spring-transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-4 mb-6">
          <button
            onClick={() => { setTab('otp'); setStep('phone'); setErrorMsg(''); }}
            className={`text-xs font-bold pb-2 relative spring-transition ${
              tab === 'otp' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ورود با کد یکبار مصرف (پیامک / پیام‌رسان)
          </button>
          <button
            onClick={() => { setTab('password'); setErrorMsg(''); }}
            className={`text-xs font-bold pb-2 relative spring-transition ${
              tab === 'password' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ورود با کلمه عبور
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
            {errorMsg}
          </div>
        )}

        {tab === 'otp' && step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                شماره تلفن همراه
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>احراز هویت بدون نیاز به کپچای آزاردهنده با سیستم ضداسپم Altcha PoW</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 spring-transition"
            >
              {loading ? 'در حال ارسال کد...' : 'دریافت کد تایید یکبار مصرف'}
            </button>
          </form>
        )}

        {tab === 'otp' && step === 'code' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-xs text-slate-700">
                کد ۵ رقمی ارسال‌شده به شماره <span className="font-bold font-mono" dir="ltr">{phone}</span> را وارد کنید:
              </p>
            </div>

            <div>
              <input
                type="text"
                dir="ltr"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="• • • • •"
                className="w-full text-center tracking-[1em] font-mono text-xl bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>زمان باقی‌مانده: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-blue-600 hover:underline"
              >
                تغییر شماره
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 spring-transition"
            >
              {loading ? 'در حال بررسی...' : 'تایید و ورود به پوروشکا'}
            </button>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                شماره تلفن همراه
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  کلمه عبور
                </label>
                <button
                  type="button"
                  onClick={handleRequestPasswordSms}
                  disabled={loading}
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  ارسال کلمه عبور با پیامک
                </button>
              </div>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 spring-transition"
            >
              {loading ? 'در حال ورود...' : 'ورود با کلمه عبور'}
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400">
                رمز عبور ندارید یا فراموش کرده‌اید؟ شماره خود را وارد کرده و روی «ارسال کلمه عبور با پیامک» کلیک کنید.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
