/**
 * Persian (fa-IR) Text & Digit Normalizer
 * Pure, zero-dependency functions for normalizing Persian text,
 * converting Arabic/Persian digits to ASCII, standardizing ZWNJ,
 * stripping conversational stop-words, and detecting prompt modality.
 */

export type PromptModality =
  | 'image_edit'
  | 'text_to_image'
  | 'text_writing'
  | 'data_structuring'
  | 'video_audio'
  | 'code_tech';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const FARSI_STOP_WORDS = new Set([
  'یک', 'به', 'از', 'در', 'با', 'که', 'برای', 'این', 'آن', 'رو', 'را',
  'میخوام', 'می‌خوام', 'میخواهم', 'لطفا', 'لطفاً', 'برام', 'واسم', 'کن',
  'پرامپت', 'هوش', 'مصنوعی', 'چگونه', 'چطور', 'بهترین', 'بده', 'بنویس',
  'ساخت', 'ایجاد', 'طراحی'
]);

const MODALITY_KEYWORDS: Record<PromptModality, string[]> = {
  image_edit: [
    'ادیت', 'ویرایش', 'عکس', 'تغییر چهره', 'حذف پس زمینه', 'بک گراند',
    'فیلتر', 'رتوش', 'چهره', 'لباس', 'استایل', 'تعویض'
  ],
  text_to_image: [
    'تصویرسازی', 'لوگو', 'بنر', 'پوستر', 'نقاشی', 'کاراکتر', 'تصویر',
    'میدجورنی', 'فلاکس', 'فتورئال', 'تصویر سه بعدی'
  ],
  text_writing: [
    'کپشن', 'مقاله', 'متن', 'ایمیل', 'تولید محتوا', 'بلاگ', 'رزومه',
    'استوری', 'تبلیغات', 'تیتر', 'شعار', 'نامه', 'داستان', 'سناریو'
  ],
  data_structuring: [
    'اکسل', 'جدول', 'فرمول', 'استخراج داده', 'شیت', 'csv', 'json',
    'نمودار', 'تحلیل داده', 'خلاصه سازی جدول', 'فرمول نویسی'
  ],
  video_audio: [
    'ویدیو', 'ریلز', 'پادکست', 'صدا', 'گویندگی', 'تیزر', 'موزیک',
    'افکت صوتی', 'اسکریپت ویدیو', 'یوتیوب'
  ],
  code_tech: [
    'برنامه‌نویسی', 'کد', 'sql', 'پایتون', 'جاوااسکریپت', 'تایپ‌اسکریپت',
    'ریکت', 'باگ', 'الگوریتم', 'ریجکس', 'کوئری', 'html', 'css', 'api'
  ]
};

/**
 * Converts Persian and Arabic digits to ASCII digits (0-9).
 */
export function normalizeDigits(input: string): string {
  if (!input) return '';
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(PERSIAN_DIGITS[i]!, String(i));
    result = result.replaceAll(ARABIC_DIGITS[i]!, String(i));
  }
  return result;
}

/**
 * Normalizes Persian characters (ی/ک unification, ZWNJ trimming, spacing).
 */
export function normalizePersianText(input: string): string {
  if (!input) return '';
  return input
    // Unify Arabic Yeh and Alef Maksura to Persian Yeh
    .replace(/[\u0649\u064A]/g, '\u06CC')
    // Unify Arabic Kaf to Persian Keheh
    .replace(/[\u0643]/g, '\u06A9')
    // Unify Arabic Heh with Yeh above to Persian Heh + ZWNJ + Yeh
    .replace(/\u06C0/g, '\u0647\u200C\u06CC')
    // Standardize Zero-Width Non-Joiner (multiple ZWNJ -> single)
    .replace(/\u200C+/g, '\u200C')
    // Remove ZWNJ at word boundaries
    .replace(/(^\u200C+|\u200C+$)/g, '')
    // Normalize spaces around ZWNJ
    .replace(/\s*\u200C\s*/g, '\u200C')
    // Unify multi-spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes and strips conversational stop-words for search queries.
 */
export function cleanSearchQuery(query: string): string {
  const normalized = normalizeDigits(normalizePersianText(query)).toLowerCase();
  const tokens = normalized.split(/[\s,،.؛;]+/);
  const meaningfulTokens = tokens.filter(t => t.length > 1 && !FARSI_STOP_WORDS.has(t));
  return meaningfulTokens.length > 0 ? meaningfulTokens.join(' ') : normalized;
}

/**
 * Detects the most probable prompt modality from free-form search text.
 * Falls back to 'text_writing' if ambiguous.
 */
export function detectModality(text: string): { modality: PromptModality; confidence: number } {
  const normalized = normalizePersianText(text).toLowerCase();
  let maxScore = 0;
  let bestModality: PromptModality = 'text_writing';

  for (const [modality, keywords] of Object.entries(MODALITY_KEYWORDS) as [PromptModality, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        score += 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestModality = modality;
    }
  }

  const confidence = maxScore > 0 ? Math.min(1.0, maxScore * 0.35) : 0.2;
  return { modality: bestModality, confidence };
}
