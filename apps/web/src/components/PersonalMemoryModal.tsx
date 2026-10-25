'use client';

import React, { useState, useEffect } from 'react';
import { X, Brain, Check, Sparkles, Plus, Trash2, Edit3, ArrowRight } from 'lucide-react';
import { fetchFromApi, getAuthToken } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { StyledSelect } from './StyledSelect';

export interface MemoryProfile {
  id: string;
  title: string;
  brand_name: string;
  niche_topic: string;
  target_audience: string;
  brand_tone: string;
  call_to_action: string;
}

interface PersonalMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const DEFAULT_PROFILE: MemoryProfile = {
  id: 'default',
  title: 'پروفایل برند اصلی',
  brand_name: '',
  niche_topic: '',
  target_audience: '',
  brand_tone: 'صمیمی و حرفه‌ای',
  call_to_action: ''
};

export function PersonalMemoryModal({ isOpen, onClose, onSaved }: PersonalMemoryModalProps) {
  const [profiles, setProfiles] = useState<MemoryProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [editingProfile, setEditingProfile] = useState<MemoryProfile | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadProfiles = () => {
    try {
      const cached = localStorage.getItem('promptjoo_memory_profiles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles(parsed);
          const activeId = localStorage.getItem('promptjoo_active_memory_id') || parsed[0].id;
          setActiveProfileId(activeId);
          return;
        }
      }
      
      // Legacy single profile fallback
      const single = localStorage.getItem('promptjoo_user_profile');
      if (single) {
        const parsed = JSON.parse(single);
        const initial = [{ ...DEFAULT_PROFILE, ...parsed }];
        setProfiles(initial);
        localStorage.setItem('promptjoo_memory_profiles', JSON.stringify(initial));
      } else {
        setProfiles([DEFAULT_PROFILE]);
      }
    } catch {
      setProfiles([DEFAULT_PROFILE]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      loadProfiles();
      setIsCreatingNew(false);
      setEditingProfile(null);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const persistProfiles = async (newProfiles: MemoryProfile[], activeId: string) => {
    setProfiles(newProfiles);
    setActiveProfileId(activeId);
    localStorage.setItem('promptjoo_memory_profiles', JSON.stringify(newProfiles));
    localStorage.setItem('promptjoo_active_memory_id', activeId);

    // Keep active profile in legacy key for backward compatibility
    const activeObj = newProfiles.find((p) => p.id === activeId) || newProfiles[0];
    if (activeObj) {
      localStorage.setItem('promptjoo_user_profile', JSON.stringify(activeObj));
    }

    // Dispatch update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('promptjoo:memory-updated', { detail: { profiles: newProfiles, activeId } }));
    }

    // Sync to server if authenticated
    const token = getAuthToken();
    if (token) {
      fetchFromApi('/api/v1/identity/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          saved_context_profile_json: {
            active_id: activeId,
            profiles: newProfiles
          }
        })
      }).catch(() => {});
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setLoading(true);

    try {
      let updatedList: MemoryProfile[];
      let targetActiveId = activeProfileId;

      if (isCreatingNew) {
        const newEntry = {
          ...editingProfile,
          id: 'mem_' + Date.now().toString(36),
          title: editingProfile.title.trim() || 'حافظه جدید'
        };
        updatedList = [...profiles, newEntry];
        targetActiveId = newEntry.id;
      } else {
        updatedList = profiles.map((p) => (p.id === editingProfile.id ? editingProfile : p));
      }

      await persistProfiles(updatedList, targetActiveId);

      showDynamicToast({
        title: 'حافظه شخصی ذخیره شد',
        message: `پروفایل «${editingProfile.title}» به‌روزرسانی شد`,
        type: 'memory'
      });

      setEditingProfile(null);
      setIsCreatingNew(false);
      if (onSaved) onSaved();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) {
      showDynamicToast({ title: 'حداقل یک حافظه باید در لیست وجود داشته باشد', type: 'error' });
      return;
    }

    const filtered = profiles.filter((p) => p.id !== id);
    const newActiveId = activeProfileId === id ? filtered[0].id : activeProfileId;
    await persistProfiles(filtered, newActiveId);
    showDynamicToast({ title: 'پروفایل حافظه حذف شد', type: 'memory' });
  };

  const handleSelectActive = (id: string) => {
    persistProfiles(profiles, id);
    showDynamicToast({ title: 'حافظه فعال تغییر کرد', type: 'memory' });
    if (onSaved) onSaved();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in w-screen h-screen"
    >
      <div className="w-full max-w-xl glass-dropdown rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="pressable absolute top-5 left-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              مدیریت حافظه‌های شخصی
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              برای هر کسب‌وکار، برند یا پروژه یک حافظه بسازید و هنگام کپی پرامپت با یک کلیک اعمال کنید.
            </p>
          </div>
        </div>

        {/* View 1: List Mode */}
        {!editingProfile && !isCreatingNew && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-slate-700">پروفایل‌های ثبت‌شده ({profiles.length})</span>
              <button
                onClick={() => {
                  setEditingProfile({
                    id: '',
                    title: `حافظه ${profiles.length + 1}`,
                    brand_name: '',
                    niche_topic: '',
                    target_audience: '',
                    brand_tone: 'صمیمی و حرفه‌ای',
                    call_to_action: ''
                  });
                  setIsCreatingNew(true);
                }}
                className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن حافظه جدید</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {profiles.map((p) => {
                const isActive = p.id === activeProfileId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectActive(p.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{p.title}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                            پیش‌فرض فعال
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        برند: {p.brand_name || 'تعریف نشده'} · مخاطب: {p.target_audience || 'عمومی'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProfile(p);
                          setIsCreatingNew(false);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="ویرایش"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {profiles.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteProfile(p.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-end">
              <button
                onClick={onClose}
                className="pressable px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        )}

        {/* View 2: Create / Edit Form */}
        {(editingProfile || isCreatingNew) && editingProfile && (
          <form onSubmit={handleSaveForm} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                {isCreatingNew ? 'ایجاد حافظه شخصی جدید' : `ویرایش ${editingProfile.title}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(null);
                  setIsCreatingNew(false);
                }}
                className="text-xs text-indigo-600 font-medium flex items-center gap-1"
              >
                <span>بازگشت به لیست</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان حافظه (جهت تشخیص در لیست)</label>
              <input
                type="text"
                required
                value={editingProfile.title}
                onChange={(e) => setEditingProfile({ ...editingProfile, title: e.target.value })}
                placeholder="مثلاً: فروشگاه آنلاین لباس، کانال یوتیوب برنامه‌نویسی"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نام برند یا کسب‌وکار</label>
              <input
                type="text"
                value={editingProfile.brand_name}
                onChange={(e) => setEditingProfile({ ...editingProfile, brand_name: e.target.value })}
                placeholder="مثلاً: دیجی‌کالا، آکادمی وب‌آموز، کافه لاته"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">حوزه فعالیت یا نیچ تخصصی</label>
              <input
                type="text"
                value={editingProfile.niche_topic}
                onChange={(e) => setEditingProfile({ ...editingProfile, niche_topic: e.target.value })}
                placeholder="مثلاً: آموزش هوش مصنوعی، فروش پوشاک زنانه"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">مخاطبان هدف</label>
              <input
                type="text"
                value={editingProfile.target_audience}
                onChange={(e) => setEditingProfile({ ...editingProfile, target_audience: e.target.value })}
                placeholder="مثلاً: مدیران استارتاپ‌ها، نوجوانان ۱۶ تا ۲۵ سال"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">لحن محتوا</label>
                <StyledSelect
                  size="md"
                  value={editingProfile.brand_tone}
                  onChange={(val) => setEditingProfile({ ...editingProfile, brand_tone: val })}
                  options={[
                    { value: 'صمیمی و دوستانه', label: 'صمیمی و دوستانه' },
                    { value: 'رسمی و متخصص', label: 'رسمی و متخصص' },
                    { value: 'انرژیک و پرهیجان', label: 'انرژیک و پرهیجان' },
                    { value: 'طنز و چالش‌برانگیز', label: 'طنز و چالش‌برانگیز' },
                    { value: 'مینیمال و پرمعنا', label: 'مینیمال و پرمعنا' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">دعوت به اقدام پیش‌فرض</label>
                <input
                  type="text"
                  value={editingProfile.call_to_action}
                  onChange={(e) => setEditingProfile({ ...editingProfile, call_to_action: e.target.value })}
                  placeholder="مثلاً: همین الان دایرکت پیام بده"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(null);
                  setIsCreatingNew(false);
                }}
                className="pressable px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'در حال ذخیره...' : 'ذخیره این حافظه'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
