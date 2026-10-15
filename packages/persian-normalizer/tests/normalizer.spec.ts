import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeDigits,
  normalizePersianText,
  cleanSearchQuery,
  detectModality
} from '../src/index.ts';

describe('Persian Normalizer Unit Tests', () => {
  it('normalizes Persian and Arabic digits to ASCII', () => {
    assert.strictEqual(normalizeDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
    assert.strictEqual(normalizeDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
    assert.strictEqual(normalizeDigits('کد ۱۲۳ و ٤٥٦'), 'کد 123 و 456');
  });

  it('unifies Arabic Yeh and Kaf to Persian characters', () => {
    assert.strictEqual(normalizePersianText('كتاب علي'), 'کتاب علی');
  });

  it('normalizes and cleans ZWNJ spaces', () => {
    const raw = 'می  ‌  خواهم   کتاب‌  ها';
    const normalized = normalizePersianText(raw);
    assert.ok(normalized.includes('می‌خواهم'));
    assert.ok(normalized.includes('کتاب‌ها'));
  });

  it('cleans conversational stop-words from queries', () => {
    const query = 'لطفا یک پرامپت هوش مصنوعی برای کپشن اینستاگرام بده';
    const cleaned = cleanSearchQuery(query);
    assert.strictEqual(cleaned, 'کپشن اینستاگرام');
  });

  it('detects prompt modalities from keywords', () => {
    const editTest = detectModality('میخوام ادیت عکس و حذف پس زمینه انجام بدم');
    assert.strictEqual(editTest.modality, 'image_edit');
    assert.ok(editTest.confidence > 0.5);

    const codeTest = detectModality('یک کوئری sql پایتون برای باگ بنویس');
    assert.strictEqual(codeTest.modality, 'code_tech');

    const dataTest = detectModality('فرمول اکسل برای استخراج داده جدول');
    assert.strictEqual(dataTest.modality, 'data_structuring');
  });
});
