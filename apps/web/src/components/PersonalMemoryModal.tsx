'use client';

import React, { useState, useEffect } from 'react';
import { X, Brain, Check, Sparkles } from 'lucide-react';
import { fetchFromApi, getAuthToken } from '../lib/api-client';

interface PersonalMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function PersonalMemoryModal({ isOpen, onClose, onSaved }: PersonalMemoryModalProps) {
  const [formData, setFormData] = useState({
    brand_name: '',
    niche_topic: '',
    target_audience: '',
    brand_tone: 'صمیمی و حرفه‌ای',
    call_to_action: ''
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cached = localStorage.getItem('promptjoo_user_profile');
      if (cached) {
        try {
          setFormData(JSON.parse(cached));
        } catch {
          // Ignore
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      localStorage.setItem('promptjoo_user_profile', JSON.stringify(formData));

      // If user is logged in, sync to server
      const token = getAuthToken();
      if (token) {
        await fetchFromApi('/api/v1/identity/profile', {
          method: 'PUT',
          body: JSON.stringify({ saved_context_profile: formData })
        }).catch(() => {});
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (onSaved) onSaved();
        onClose();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-dropdown rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-slate-800 spring-transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              حافظه شخصی من (Personal Memory)
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-gray-400">
              این اطلاعات یک‌بار وارد شده و به صورت خودکار در تمام پرامپت‌ها جایگذاری می‌شود.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              نام برند یا کسب‌وکار (Brand Name)
            </label>
            <input
              type="text"
              value={formData.brand_name}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              placeholder="مثلاً: دیجی‌کالا، آکادمی وب‌آموز، کافه لاته"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              حوزه فعالیت یا نیچ تخصصی (Niche Topic)
            </label>
            <input
              type="text"
              value={formData.niche_topic}
              onChange={(e) => setFormData({ ...formData, niche_topic: e.target.value })}
              placeholder="مثلاً: آموزش سئو و هوش مصنوعی، فروش پوشاک زنانه"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              مخاطبان هدف (Target Audience)
            </label>
            <input
              type="text"
              value={formData.target_audience}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              placeholder="مثلاً: مدیران استارتاپ‌ها، نوجوانان ۱۶ تا ۲۵ سال، مادران شاغل"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                لحن برند (Brand Tone)
              </label>
              <select
                value={formData.brand_tone}
                onChange={(e) => setFormData({ ...formData, brand_tone: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="صمیمی و دوستانه">صمیمی و دوستانه</option>
                <option value="رسمی و متخصص">رسمی و متخصص</option>
                <option value="انرژیک و پرهیجان">انرژیک و پرهیجان</option>
                <option value="طنز و چالش‌برانگیز">طنز و چالش‌برانگیز</option>
                <option value="مینیمال و پرمعنا">مینیمال و پرمعنا</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                دعوت به اقدام پیش‌فرض (CTA)
              </label>
              <input
                type="text"
                value={formData.call_to_action}
                onChange={(e) => setFormData({ ...formData, call_to_action: e.target.value })}
                placeholder="مثلاً: همین الان دایرکت پیام بده"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white spring-transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg spring-transition ${
                savedSuccess
                  ? 'bg-emerald-600'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>با موفقیت ذخیره شد</span>
                </>
              ) : (
                <span>ذخیره حافظه شخصی</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
