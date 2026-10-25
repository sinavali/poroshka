/**
 * High-performance In-Memory Dataset Parser & Validator
 * Supports JSON Array, JSON Lines (JSONL), and RFC 4180 CSV
 */

export interface IngestionRecord {
  template_en?: string;
  prompt?: string;
  template?: string;
  instruction?: string;
  raw_template_en?: string;
  content?: string;
  text?: string;
  title_fa?: string;
  act?: string;
  title?: string;
  name?: string;
  role?: string;
  modality?: string;
  category_slug?: string;
  short_desc_fa?: string;
  description?: string;
  desc?: string;
  direct_answer_summary_fa?: string;
  summary?: string;
  slots_schema_json?: unknown;
  search_keywords_fa?: unknown;
  [key: string]: unknown;
}

export interface ValidationSummary {
  totalLoaded: number;
  validCount: number;
  invalidCount: number;
  totalBatches: number;
  batchSize: number;
  fileSizeBytes: number;
  fileName: string;
  invalidItems: Array<{ index: number; reason: string; sample: string }>;
  sampleRows: Array<{ title: string; prompt: string; modality?: string }>;
}

/**
 * Robust RFC 4180 CSV parser that handles multi-line fields, escaped quotes, and CRLF
 */
export function parseCsvInRam(text: string): IngestionRecord[] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
  }
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const records: IngestionRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx] || '';
    });
    records.push(record as IngestionRecord);
  }
  return records;
}

/**
 * Extracts raw prompt text from various standard keys
 */
export function extractPromptContent(item: IngestionRecord): string {
  return String(
    item.template_en ||
    item.prompt ||
    item.template ||
    item.instruction ||
    item.raw_template_en ||
    item.content ||
    item.text ||
    ''
  ).trim();
}

/**
 * Extract human title from various possible keys
 */
export function extractPromptTitle(item: IngestionRecord): string {
  return String(item.title_fa || item.act || item.title || item.name || item.role || 'بدون عنوان').trim();
}

/**
 * Parses JSON, JSONL, or CSV and validates prompt items in RAM
 */
export function parseAndValidateDataset(
  content: string,
  fileName: string,
  fileSizeBytes: number,
  batchSize = 500
): { summary: ValidationSummary; validRecords: IngestionRecord[] } {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('فایل بارگذاری شده خالی است.');
  }

  let parsedRaw: IngestionRecord[] = [];

  // Try JSON
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const jsonObj = JSON.parse(trimmed);
      if (Array.isArray(jsonObj)) {
        parsedRaw = jsonObj;
      } else if (Array.isArray(jsonObj.items)) {
        parsedRaw = jsonObj.items;
      } else if (Array.isArray(jsonObj.prompts)) {
        parsedRaw = jsonObj.prompts;
      } else {
        parsedRaw = [jsonObj];
      }
    } catch (err: unknown) {
      throw new Error(`خطای پارس JSON: ${err instanceof Error ? err.message : 'ساختار نامعتبر'}`);
    }
  } else {
    // Try JSONL or CSV
    if (trimmed.includes('\n') && trimmed.includes('{') && trimmed.includes('}')) {
      const lines = trimmed.split('\n');
      for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        try {
          parsedRaw.push(JSON.parse(l));
        } catch {
          // Skip invalid JSONL line
        }
      }
    } else {
      parsedRaw = parseCsvInRam(trimmed);
    }
  }

  if (parsedRaw.length === 0) {
    throw new Error('هیچ داده یا سطری در فایل شناسایی نشد.');
  }

  const valid: IngestionRecord[] = [];
  const invalid: ValidationSummary['invalidItems'] = [];

  for (let i = 0; i < parsedRaw.length; i++) {
    const item = parsedRaw[i];
    if (!item || typeof item !== 'object') {
      invalid.push({ index: i + 1, reason: 'سطر آبجکت معتبر نیست', sample: String(item).slice(0, 50) });
      continue;
    }

    const promptTemplate = extractPromptContent(item);
    if (!promptTemplate) {
      invalid.push({
        index: i + 1,
        reason: 'متن پرامپت (template_en/prompt) خالی است',
        sample: JSON.stringify(item).slice(0, 60)
      });
      continue;
    }

    valid.push(item);
  }

  const totalBatches = Math.ceil(valid.length / batchSize);

  const summary: ValidationSummary = {
    totalLoaded: parsedRaw.length,
    validCount: valid.length,
    invalidCount: invalid.length,
    totalBatches,
    batchSize,
    fileSizeBytes,
    fileName,
    invalidItems: invalid,
    sampleRows: valid.slice(0, 4).map((row) => ({
      title: extractPromptTitle(row),
      prompt: extractPromptContent(row).slice(0, 80),
      modality: String(row.modality || 'خودکار')
    }))
  };

  return { summary, validRecords: valid };
}
