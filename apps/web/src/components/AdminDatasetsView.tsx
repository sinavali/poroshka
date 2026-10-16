'use client';

import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  ArrowDownToLine,
  Plus,
  Code,
  BookOpen,
  Copy,
  Check,
  Sparkles,
  Info
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { AdminPromptCreatorModal } from './AdminPromptCreatorModal';

export function AdminDatasetsView() {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'raw' | 'ai_parser' | 'schema'>('upload');
  const [copiedSample, setCopiedSample] = useState<string | null>(null);
  const [enrichWithLlm, setEnrichWithLlm] = useState(true);

  // AI Semantic Parser Studio state
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiTitleHint, setAiTitleHint] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiSaving, setAiSaving] = useState(false);

  // Pre-parser analysis state
  const [parsedPreview, setParsedPreview] = useState<{
    format: string;
    totalCount: number;
    sampleRows: Array<{ title: string; prompt: string; modality?: string }>;
  } | null>(null);

  const handleAiParse = async () => {
    if (!aiPromptInput.trim()) {
      showDynamicToast({ title: 'لطفاً متن اولیه پرامپت را وارد کنید', type: 'error' });
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetchFromApi<any>('/api/v1/ingestion/parse-llm', {
        method: 'POST',
        body: JSON.stringify({
          raw_template_en: aiPromptInput.trim(),
          title_hint: aiTitleHint.trim() || undefined
        })
      });
      if (res && res.result) {
        setAiResult(res.result);
        showDynamicToast({
          title: res.result.enriched_by_llm ? 'غنی‌سازی هوش مصنوعی با موفقیت انجام شد' : 'استخراج و نرمال‌سازی با موفقیت انجام شد',
          type: 'success'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ارتباط با سرور';
      showDynamicToast({ title: 'خطا در پارس هوش مصنوعی', message: msg, type: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiPrompt = async () => {
    if (!aiResult) return;
    setAiSaving(true);
    try {
      await fetchFromApi('/api/v1/ingestion/prompt', {
        method: 'POST',
        body: JSON.stringify({
          title_fa: aiResult.title_fa,
          short_desc_fa: aiResult.short_desc_fa,
          direct_answer_summary_fa: aiResult.direct_answer_summary_fa,
          category_slug: aiResult.category_slug,
          modality: aiResult.modality,
          template_en: aiResult.template_en,
          slots_schema_json: aiResult.slots_schema_json,
          supported_models: aiResult.supported_models || ['chatgpt', 'gemini'],
          search_keywords_fa: aiResult.search_keywords_fa || []
        })
      });
      showDynamicToast({ title: 'پرامپت با موفقیت در کاتالوگ ذخیره شد', type: 'success' });
      setAiResult(null);
      setAiPromptInput('');
      setAiTitleHint('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره';
      showDynamicToast({ title: 'خطا در ذخیره پرامپت', message: msg, type: 'error' });
    } finally {
      setAiSaving(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open('/api/v1/ingestion/export/csv', '_blank');
  };

  const handleDownloadJson = () => {
    window.open('/api/v1/ingestion/export/json', '_blank');
  };

  const analyzeContent = (content: string, name: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      setParsedPreview(null);
      return;
    }

    try {
      if (name.endsWith('.json') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const first = parsed[0] || {};
          let format = 'Native Promptjoo JSON';
          if (first.act && first.prompt) {
            format = 'Awesome ChatGPT Prompts (JSON)';
          }
          setParsedPreview({
            format,
            totalCount: parsed.length,
            sampleRows: parsed.slice(0, 3).map((r: any) => ({
              title: r.title_fa || r.act || r.title || r.name || 'بدون عنوان',
              prompt: (r.template_en || r.prompt || r.instruction || r.text || '').slice(0, 120),
              modality: r.modality || 'تطبیق خودکار'
            }))
          });
          return;
        }
      }

      // Simple CSV check
      const lines = trimmed.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const header = lines[0].toLowerCase();
        let format = 'Native Promptjoo CSV';
        if (header.includes('act') && header.includes('prompt')) {
          format = 'Awesome ChatGPT Prompts (CSV)';
        } else if (header.includes('title') && header.includes('prompt')) {
          format = 'Universal Prompt Dataset (CSV)';
        }
        setParsedPreview({
          format,
          totalCount: Math.max(0, lines.length - 1),
          sampleRows: lines.slice(1, 4).map((line, idx) => ({
            title: `ردیف ${idx + 1}`,
            prompt: line.slice(0, 120),
            modality: 'تطبیق خودکار'
          }))
        });
      }
    } catch {
      setParsedPreview(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      setSyncResult(null);
      analyzeContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleRawChange = (text: string) => {
    setRawText(text);
    setFileContent(text);
    setFileName('raw_editor.json');
    analyzeContent(text, 'raw_editor.json');
  };

  const handleStartSync = async () => {
    if (!fileContent.trim()) {
      showDynamicToast({ title: 'لطفاً ابتدا فایل دیتاست را انتخاب یا وارد کنید', type: 'error' });
      return;
    }

    setLoading(true);
    setSyncResult(null);

    try {
      let payload: any;
      const trimmed = fileContent.trim();
      if (fileName.endsWith('.json') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        payload = Array.isArray(parsed)
          ? { items: parsed, enrich_with_llm: enrichWithLlm }
          : { ...parsed, enrich_with_llm: enrichWithLlm };
      } else {
        payload = { csv_text: trimmed, enrich_with_llm: enrichWithLlm };
      }

      const res = await fetchFromApi<any>('/api/v1/ingestion/import', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSyncResult(res);
      showDynamicToast({
        title: 'همگام‌سازی با موفقیت انجام شد',
        message: `${res.inserted} مورد جدید، ${res.skipped_duplicates} مورد تکراری`,
        type: 'success'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری دیتاست';
      showDynamicToast({ title: 'خطا در بارگذاری', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSample(label);
    showDynamicToast({ title: 'نمونه کد در کلیپ‌بورد کپی شد', type: 'copy' });
    setTimeout(() => setCopiedSample(null), 2000);
  };

  const SAMPLE_NATIVE_JSON = `[
  {
    "title_fa": "سناریو استوری معرفی محصول",
    "template_en": "You are a master copywriter. Write a 3-part viral Instagram story sequence for {{product}} targeting {{audience}}.",
    "category_slug": "content-writing",
    "modality": "text_writing",
    "short_desc_fa": "قالب اختصاصی استوری برای افزایش تعامل و فروش پیج",
    "slots_schema_json": [
      { "slot_key": "product", "label_fa": "نام محصول", "default_value": "کفش ورزشی", "is_required": true },
      { "slot_key": "audience", "label_fa": "مخاطب هدف", "default_value": "ورزشکاران جوان", "is_required": false }
    ],
    "search_keywords_fa": ["اینستاگرام", "معرفی محصول", "استوری"]
  }
]`;

  const SAMPLE_AWESOME_CSV = `"act","prompt"
"Linux Terminal","I want you to act as a linux terminal. I will type commands and you will reply with what the terminal should show. My first command is {{command}}."
"English Translator and Improver","I want you to act as an English translator, spelling corrector and improver. Detect the language and translate {{text}} into fluent English."
"Cyberpunk Architect","Act as an architectural concept designer. Design a futuristic neon cityscape with {{structure}} in 8k resolution."`;

  const SAMPLE_MINIMAL_CSV = `"title","prompt"
"SQL Optimizer","You are a PostgreSQL database expert. Analyze and optimize the following query: {{query}}."
"Python Refactorer","Act as a senior software engineer. Refactor this code for readability and performance: {{code}}."`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              درون‌ریزی و همگام‌سازی دیتاست‌ها (Dataset Ingestion Studio)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              پشتیبانی از دیتاست‌های آزاد اینترنت (Awesome-ChatGPT, HuggingFace)، فایل‌های CSV، JSON و همگام‌سازی بدون تکرار بین دیتابیس‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="pressable flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن پرامپت تکی</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="pressable flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
            title="دانلود کل پرامپت‌های کاتالوگ با فرمت سازگار با اکسل فارسی"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>خروجی CSV</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="pressable flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
            title="دانلود کل پرامپت‌های کاتالوگ به صورت JSON استاندارد"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-600" />
            <span>خروجی JSON</span>
          </button>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold spring-transition pressable ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>بارگذاری فایل (CSV / JSON / JSONL)</span>
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold spring-transition pressable ${
            activeTab === 'raw'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>ویرایشگر مستقیم کد (JSON Array یا متن CSV)</span>
        </button>
        <button
          onClick={() => setActiveTab('ai_parser')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold spring-transition pressable ${
            activeTab === 'ai_parser'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-indigo-500/25'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>استودیوی هوش مصنوعی (AI Semantic Studio)</span>
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold spring-transition pressable ${
            activeTab === 'schema'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>مستندات و فرمت دیتاست (Schema Guide)</span>
        </button>
      </div>

      {/* TAB 1: FILE UPLOAD */}
      {activeTab === 'upload' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">بارگذاری فایل دیتاست اینترنتی یا لوکال</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              فایل‌های CSV دیتاست‌های معروف گیت‌هاب (مانند <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">f/awesome-chatgpt-prompts</code> با ستون‌های <code className="bg-slate-100 px-1 py-0.5 rounded">act</code> و <code className="bg-slate-100 px-1 py-0.5 rounded">prompt</code>) یا فایل‌های JSON استخراج‌شده را انتخاب کنید.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 spring-transition">
            <input
              type="file"
              id="dataset-file-input"
              accept=".csv,.json,.jsonl,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="dataset-file-input"
              className="pressable inline-flex flex-col items-center justify-center cursor-pointer space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  برای انتخاب فایل کلیک کنید
                </span>
                <p className="text-[11px] text-slate-400">
                  فرمت‌های پشتیبانی‌شده: CSV (سازگار با کاما، نقل‌قول و چندخطی)، JSON Array، JSONL
                </p>
              </div>
            </label>

            {fileName && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 font-mono shadow-xs">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{fileName}</span>
                <span className="text-slate-400">({Math.round(fileContent.length / 1024)} KB)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RAW TEXT EDITOR */}
      {activeTab === 'raw' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 animate-fade-in">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">درج مستقیم متن دیتاست</h4>
            <p className="text-xs text-slate-500">
              می‌توانید مستقیماً متن CSV یا JSON Array کپی‌شده از مخازن اینترنتی را در کادر زیر جایگذاری کنید:
            </p>
          </div>

          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => handleRawChange(e.target.value)}
            dir="ltr"
            placeholder={`"act","prompt"\n"Linux Terminal","I want you to act as a linux terminal. I will type commands and you will reply with what the terminal should show. My first command is {{command}}."\n"Python Developer","Act as a senior Python developer. Optimize the following function: {{code}}."`}
            className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      )}

      {/* TAB 2.5: AI SEMANTIC PARSER STUDIO */}
      {activeTab === 'ai_parser' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  استودیوی اختصاصی پارس و غنی‌سازی هوشمند پرامپت‌ها (AI Semantic Parser Studio)
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                هر پرامپت خام انگلیسی از ردیت، گیت‌هاب یا دیسکورد را جایگذاری کنید تا هوش مصنوعی متغیرها را با ساختار <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600" dir="ltr">{'{{slot}}'}</code> استخراج کرده و عنوان فارسی، تگ‌ها و فیلدهای سئو را بسازد.
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              مدل فعال: Gemini / OpenAI / Heuristic Fallback
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان یا سرنخ نقش (اختیاری):
              </label>
              <input
                type="text"
                value={aiTitleHint}
                onChange={(e) => setAiTitleHint(e.target.value)}
                placeholder="مثال: Senior Python Developer یا Cyberpunk Architect"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                متن خام انگلیسی پرامپت (حتی بدون براکت متغیرها):
              </label>
              <textarea
                rows={6}
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                dir="ltr"
                placeholder="I want you to act as an interviewer. You will ask me technical questions for a senior React engineer position. Ask one question at a time and wait for my answer. My first sentence is 'Hi, I am ready'."
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleAiParse}
              disabled={aiLoading}
              className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-40"
            >
              <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
              <span>{aiLoading ? 'در حال تحلیل هوشمند و استخراج متغیرها...' : 'استخراج متغیرها و محلی‌سازی با هوش مصنوعی (AI Enrich)'}</span>
            </button>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-200 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-950">نتیجه غنی‌سازی هوشمند: {aiResult.title_fa}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800">
                    {aiResult.modality}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-slate-700">
                    امتیاز کیفیت: {aiResult.quality_score}/۱۰
                  </span>
                </div>
              </div>

              {/* Template English */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">قالب پارامتریک بهینه‌شده (English Template):</span>
                <pre className="text-xs font-mono bg-white p-3.5 rounded-2xl border border-indigo-100 text-slate-800 whitespace-pre-wrap" dir="ltr">
                  {aiResult.template_en}
                </pre>
              </div>

              {/* Extracted Slots Schema Table */}
              {Array.isArray(aiResult.slots_schema_json) && aiResult.slots_schema_json.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">
                    متغیرهای استخراج‌شده ({aiResult.slots_schema_json.length} متغیر):
                  </span>
                  <div className="overflow-x-auto rounded-2xl bg-white border border-indigo-100 shadow-2xs">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-indigo-100">
                          <th className="p-2.5">شناسه متغیر (Key)</th>
                          <th className="p-2.5">برچسب فارسی روان</th>
                          <th className="p-2.5">مقدار پیش‌فرض نمونه</th>
                          <th className="p-2.5">الزامی؟</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {aiResult.slots_schema_json.map((s: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-mono text-blue-600 font-bold" dir="ltr">{s.slot_key}</td>
                            <td className="p-2.5 font-medium">{s.label_fa}</td>
                            <td className="p-2.5 text-slate-500">{s.default_value || '—'}</td>
                            <td className="p-2.5">{s.is_required ? <span className="text-emerald-600 font-bold">بله</span> : 'اختیاری'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Descriptions & SEO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-2xl border border-indigo-100">
                  <span className="font-bold text-slate-700 block mb-1">توضیحات فارسی کارت:</span>
                  <p className="text-slate-600 leading-relaxed">{aiResult.short_desc_fa}</p>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-indigo-100">
                  <span className="font-bold text-slate-700 block mb-1">پاسخ مستقیم برای سئو (AIO):</span>
                  <p className="text-slate-600 leading-relaxed">{aiResult.direct_answer_summary_fa}</p>
                </div>
              </div>

              {/* Keywords */}
              {Array.isArray(aiResult.search_keywords_fa) && aiResult.search_keywords_fa.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-700">کلیدواژه‌های سئو:</span>
                  {aiResult.search_keywords_fa.map((kw: string, idx: number) => (
                    <span key={idx} className="text-[11px] bg-white border border-indigo-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Save to Catalog Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveAiPrompt}
                  disabled={aiSaving}
                  className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>{aiSaving ? 'در حال ثبت در کاتالوگ...' : 'افزودن مستقیم این پرامپت به کاتالوگ'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SCHEMA GUIDE & SAMPLES */}
      {activeTab === 'schema' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">ساختار و مشخصات فیلدهای دیتاست (Schema Specification)</h4>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            موتور درون‌ریزی پرامپت‌جو از نگاشت هوشمند فیلدها پشتیبانی می‌کند؛ بنابراین فرقی نمی‌کند نام ستون‌ها استاندارد پرامپت‌جو باشد یا ساختار دیتاست‌های آزاد اینترنت:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">فیلد اصلی</th>
                  <th className="p-3">نام‌های مستعار پذیرفته‌شده (Aliases)</th>
                  <th className="p-3">نوع</th>
                  <th className="p-3">الزامی؟</th>
                  <th className="p-3">توضیحات و رفتار سیستم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-3 font-mono font-bold text-blue-600" dir="ltr">template_en</td>
                  <td className="p-3 font-mono text-[11px]" dir="ltr">prompt, template, instruction, raw_template_en, text</td>
                  <td className="p-3">متن (String)</td>
                  <td className="p-3 font-bold text-emerald-600">بله</td>
                  <td className="p-3">متن اصلی پرامپت. متغیرهای <code className="bg-slate-100 px-1 rounded" dir="ltr">{'{{slot}}'}</code> یا <code className="bg-slate-100 px-1 rounded" dir="ltr">[slot]</code> به صورت خودکار شناسایی می‌شوند.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-slate-800" dir="ltr">title_fa</td>
                  <td className="p-3 font-mono text-[11px]" dir="ltr">act, title, name, role</td>
                  <td className="p-3">متن (String)</td>
                  <td className="p-3 text-slate-400">اختیاری</td>
                  <td className="p-3">عنوان پرامپت. اگر انگلیسی باشد (مانند act در awesome-chatgpt)، سیستم به صورت خودکار پیشوند فارسی به آن اضافه می‌کند.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-slate-800" dir="ltr">category_slug</td>
                  <td className="p-3 font-mono text-[11px]" dir="ltr">category, type</td>
                  <td className="p-3">شناسه دسته</td>
                  <td className="p-3 text-slate-400">اختیاری</td>
                  <td className="p-3">دسته‌بندی (مانند content-writing, code-generation). در صورت خالی بودن، بر اساس متن به طور خودکار تعیین می‌شود.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-slate-800" dir="ltr">modality</td>
                  <td className="p-3 font-mono text-[11px]" dir="ltr">modality</td>
                  <td className="p-3">Enum</td>
                  <td className="p-3 text-slate-400">اختیاری</td>
                  <td className="p-3">یکی از: <code className="text-[10px] bg-slate-100 px-1 rounded">text_writing, code_tech, text_to_image, image_edit, data_structuring, video_audio</code>. در صورت خالی بودن خودکار تشخیص داده می‌شود.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-slate-800" dir="ltr">slots_schema_json</td>
                  <td className="p-3 font-mono text-[11px]" dir="ltr">slots</td>
                  <td className="p-3">JSON Array</td>
                  <td className="p-3 text-slate-400">اختیاری</td>
                  <td className="p-3">آرایه مشخصات متغیرها. در صورت خالی بودن، از روی براکت‌های متن به صورت خودکار استخراج می‌شود.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Copyable Samples */}
          <div className="space-y-4 pt-2">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>نمونه ساختارهای آماده برای کپی و استفاده:</span>
            </h5>

            {/* Sample 1: Awesome ChatGPT Prompts CSV */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">۱. فرمت استاندارد Awesome ChatGPT Prompts (فایل CSV):</span>
                <button
                  onClick={() => copyToClipboard(SAMPLE_AWESOME_CSV, 'awesome_csv')}
                  className="pressable inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  {copiedSample === 'awesome_csv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSample === 'awesome_csv' ? 'کپی شد' : 'کپی نمونه CSV'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-slate-700 overflow-x-auto whitespace-pre">
                {SAMPLE_AWESOME_CSV}
              </pre>
            </div>

            {/* Sample 2: Native Promptjoo JSON */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">۲. فرمت جامع بومی پرامپت‌جو (فایل JSON Array):</span>
                <button
                  onClick={() => copyToClipboard(SAMPLE_NATIVE_JSON, 'native_json')}
                  className="pressable inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  {copiedSample === 'native_json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSample === 'native_json' ? 'کپی شد' : 'کپی نمونه JSON'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-slate-700 overflow-x-auto whitespace-pre">
                {SAMPLE_NATIVE_JSON}
              </pre>
            </div>

            {/* Sample 3: Minimal CSV */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">۳. فرمت ساده جهانی (فایل CSV دو ستونه):</span>
                <button
                  onClick={() => copyToClipboard(SAMPLE_MINIMAL_CSV, 'minimal_csv')}
                  className="pressable inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  {copiedSample === 'minimal_csv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSample === 'minimal_csv' ? 'کپی شد' : 'کپی نمونه CSV ساده'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-slate-700 overflow-x-auto whitespace-pre">
                {SAMPLE_MINIMAL_CSV}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW & SYNC ACTION (Available in Upload and Raw tabs when content exists) */}
      {activeTab !== 'schema' && parsedPreview && (
        <div className="glass-panel rounded-3xl p-6 border border-blue-200 bg-blue-50/20 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                تحلیل و پیش‌نمایش دیتاست: فرمت <span className="text-blue-700 font-mono font-bold">{parsedPreview.format}</span>
              </h4>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              {parsedPreview.totalCount.toLocaleString('fa-IR')} رکورد شناسایی شد
            </span>
          </div>

          {/* Sample rows table */}
          <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200 shadow-xs">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-3 w-1/4">عنوان شناسایی‌شده</th>
                  <th className="p-3 w-2/4">بخشی از متن پرامپت</th>
                  <th className="p-3 w-1/4">دسته‌بندی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {parsedPreview.sampleRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">{row.title}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 truncate max-w-xs" dir="ltr">
                      {row.prompt}...
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {row.modality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Enrichment Option */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  غنی‌سازی و پارس خودکار با هوش مصنوعی (AI Semantic Ingestion)
                </span>
                <span className="text-[11px] text-slate-500 block">
                  استخراج خودکار متغیرها از متون فاقد براکت، ترجمه روان فارسی و ساخت فیلدهای سئو
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={enrichWithLlm}
                onChange={(e) => setEnrichWithLlm(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Sync Trigger Button */}
          <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-slate-500">
              با کلیک روی دکمه زیر، تمامی رکوردها پس از هش‌گذاری و حذف موارد تکراری مستقیماً در کاتالوگ ثبت می‌شوند.
            </p>
            <button
              onClick={handleStartSync}
              disabled={loading}
              className="pressable flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'در حال بررسی و همگام‌سازی...' : `درون‌ریزی ${parsedPreview.totalCount.toLocaleString('fa-IR')} رکورد به کاتالوگ`}</span>
            </button>
          </div>
        </div>
      )}

      {/* SYNC RESULTS REPORT */}
      {syncResult && (
        <div className="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 text-emerald-900 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>نتیجه عملیات: {syncResult.message}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-slate-500 block text-[11px] mb-1">کل ردیف‌های فایل</span>
              <span className="text-xl font-black text-slate-900 font-mono">
                {syncResult.total_processed?.toLocaleString('fa-IR')}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-slate-500 block text-[11px] mb-1">پرامپت‌های جدید ثبت‌شده</span>
              <span className="text-xl font-black text-emerald-600 font-mono">
                {syncResult.inserted?.toLocaleString('fa-IR')}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-slate-500 block text-[11px] mb-1">موارد تکراری (نادیده‌گرفته)</span>
              <span className="text-xl font-black text-slate-600 font-mono">
                {syncResult.skipped_duplicates?.toLocaleString('fa-IR')}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-slate-500 block text-[11px] mb-1">تعداد خطاها</span>
              <span className="text-xl font-black text-rose-600 font-mono">
                {syncResult.error_count?.toLocaleString('fa-IR') || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Single Prompt Creator Modal */}
      <AdminPromptCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
      />
    </div>
  );
}
