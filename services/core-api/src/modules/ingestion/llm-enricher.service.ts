import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import { detectModality } from '@promptjoo/persian-normalizer';

export type SupportedProvider = 'avalai' | 'openai' | 'anthropic' | 'google' | 'custom';

export interface LlmEnrichmentResult {
  template_en: string;
  title_fa: string;
  short_desc_fa: string;
  direct_answer_summary_fa: string;
  modality: 'text_writing' | 'code_tech' | 'text_to_image' | 'image_edit' | 'data_structuring' | 'video_audio';
  category_slug: string;
  supported_models: string[];
  slots_schema_json: Array<{
    slot_key: string;
    label_fa: string;
    default_value: string;
    is_required: boolean;
  }>;
  search_keywords_fa: string[];
  quality_score: number;
  enriched_by_llm: boolean;
  model_used?: string;
}

export interface LlmProviderConfig {
  provider: SupportedProvider;
  api_key: string;
  base_url?: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  timeout_seconds?: number;
  is_active?: boolean;
}

export function getDefaultModel(provider: SupportedProvider): string {
  switch (provider) {
    case 'avalai': return 'deepseek-v4.1-flash';
    case 'openai': return 'gpt-4o-mini';
    case 'anthropic': return 'claude-3-5-sonnet-latest';
    case 'google': return 'gemini-1.5-flash';
    case 'custom': return 'custom-model';
    default: return 'deepseek-v4.1-flash';
  }
}

export function getDefaultBaseUrl(provider: SupportedProvider): string {
  switch (provider) {
    case 'avalai': return 'https://api.avalai.ir/v1';
    case 'openai': return 'https://api.openai.com/v1';
    case 'anthropic': return 'https://api.anthropic.com/v1';
    case 'google': return 'https://generativelanguage.googleapis.com/v1beta';
    case 'custom': return 'http://localhost:11434/v1';
    default: return 'https://api.avalai.ir/v1';
  }
}

/**
 * Retrieve LLM Provider configuration from system_settings or environment variables.
 */
export async function getLlmConfig(): Promise<LlmProviderConfig | null> {
  try {
    const res = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'llm_provider_config' LIMIT 1"
    );
    if (res.rows.length > 0 && res.rows[0].setting_value) {
      const val = res.rows[0].setting_value;
      const validProviders: SupportedProvider[] = ['avalai', 'openai', 'anthropic', 'google', 'custom'];
      const provider: SupportedProvider = validProviders.includes(val.provider) ? val.provider : 'avalai';
      const apiKey = val.api_key || process.env.AVALAI_API_KEY || '';
      const temperature = typeof val.temperature === 'number' ? val.temperature : 0.2;
      const maxTokens = typeof val.max_tokens === 'number' && val.max_tokens > 0 ? val.max_tokens : 4000;
      const timeoutSeconds = typeof val.timeout_seconds === 'number' && val.timeout_seconds > 0 ? val.timeout_seconds : 60;
      return {
        provider,
        api_key: apiKey,
        base_url: val.base_url || '',
        model: val.model || getDefaultModel(provider),
        temperature,
        max_tokens: maxTokens,
        timeout_seconds: timeoutSeconds,
        is_active: val.is_active !== false && (apiKey.length > 0 || Boolean(val.base_url) || provider === 'custom')
      };
    }
  } catch (err) {
    logger.warn({ err }, 'Could not read llm_provider_config from database, checking environment');
  }

  return {
    provider: 'avalai',
    api_key: process.env.AVALAI_API_KEY || '',
    base_url: 'https://api.avalai.ir/v1',
    model: 'deepseek-v4.1-flash',
    temperature: 0.2,
    max_tokens: 4000,
    timeout_seconds: 60,
    is_active: true
  };
}

/**
 * Save LLM Provider configuration to system_settings.
 */
export async function saveLlmConfig(config: LlmProviderConfig): Promise<void> {
  await pool.query(
    `INSERT INTO system_settings (setting_key, category, description_fa, setting_value, updated_at)
     VALUES ('llm_provider_config', 'ai_engines', 'تنظیمات موتورهای هوش مصنوعی پردازش پرامپت', $1, NOW())
     ON CONFLICT (setting_key) DO UPDATE
     SET setting_value = $1, updated_at = NOW()`,
    [JSON.stringify(config)]
  );
}

/**
 * Heuristic fallback when LLM is unavailable or unconfigured.
 */
export function heuristicEnrich(rawTemplate: string, rawTitle?: string): LlmEnrichmentResult {
  let template = rawTemplate.trim();

  // Convert [slot] and <slot> to {{slot}}
  template = template.replace(/\[([a-zA-Z0-9_\s]{2,40})\]/g, (_, match) => {
    return `{{${match.trim().toLowerCase().replace(/[\s-]+/g, '_')}}}`;
  });
  template = template.replace(/<([a-zA-Z0-9_\s]{2,40})>/g, (_, match) => {
    return `{{${match.trim().toLowerCase().replace(/[\s-]+/g, '_')}}}`;
  });

  // Extract slots
  const matches = [...template.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
  const uniqueKeys = Array.from(new Set(matches.map(m => m[1])));
  const slots_schema_json = uniqueKeys.map(k => ({
    slot_key: k,
    label_fa: k.replace(/_/g, ' '),
    default_value: '',
    is_required: true
  }));

  // Persian title normalization
  let title_fa = (rawTitle || '').trim();
  if (!title_fa) {
    title_fa = template.slice(0, 50).trim();
  } else if (/^[a-zA-Z0-9\s\-_.,/]+$/.test(title_fa)) {
    title_fa = `شبیه‌ساز و پرامپت ${title_fa}`;
  }

  // Modality & Category
  const detected = detectModality(title_fa + ' ' + template);
  const modality = (detected.modality || 'text_writing') as LlmEnrichmentResult['modality'];
  const categoryMap: Record<string, string> = {
    text_writing: 'content-writing',
    code_tech: 'coding-tech',
    text_to_image: 'image-generation',
    image_edit: 'photo-editing',
    data_structuring: 'excel-data',
    video_audio: 'reels-voice'
  };

  return {
    template_en: template,
    title_fa,
    short_desc_fa: `${title_fa} — پرامپت بهینه‌سازی‌شده برای دریافت بهترین خروجی از هوش مصنوعی.`,
    direct_answer_summary_fa: `پرامپت مهندسی‌شده ${title_fa} با قابلیت شخصی‌سازی متغیرها برای کاربران.`,
    modality,
    category_slug: categoryMap[modality] || 'content-writing',
    supported_models: ['chatgpt', 'gemini', 'claude'],
    slots_schema_json,
    search_keywords_fa: [title_fa, 'پرامپت', 'هوش مصنوعی'],
    quality_score: 7,
    enriched_by_llm: false
  };
}

/**
 * Universal LLM caller supporting Custom endpoints, OpenAI, Gemini, Anthropic, OpenRouter, DeepSeek, Groq, Ollama.
 */
export async function callLlmRaw(
  config: LlmProviderConfig,
  promptText: string,
  systemText: string,
  forceJsonObject = true,
  customTimeoutMs?: number,
  customMaxTokens?: number
): Promise<string> {
  const timeoutMs = customTimeoutMs || (config.timeout_seconds && config.timeout_seconds > 0 ? config.timeout_seconds * 1000 : undefined) || 60000;
  const effectiveMaxTokens = customMaxTokens || (config.max_tokens && config.max_tokens > 0 ? config.max_tokens : 4000);
  const customBase = config.base_url?.trim() || getDefaultBaseUrl(config.provider);
  const modelName = config.model || getDefaultModel(config.provider);
  const apiKey = (config.api_key || '').trim();

  // 1. Anthropic Claude Official Messages API
  if (config.provider === 'anthropic') {
    const endpoint = customBase.endsWith('/messages') ? customBase : `${customBase.replace(/\/+$/, '')}/messages`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    const reqBody = {
      model: modelName,
      system: systemText,
      messages: [{ role: 'user', content: promptText }],
      temperature: config.temperature ?? 0.2,
      max_tokens: effectiveMaxTokens
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Anthropic API HTTP ${res.status}: ${errorText}`);
    }
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    return data?.content?.map((c) => c.text || '').join('') || '';
  }

  // 2. Google AI Studio (Gemini generateContent API)
  if (config.provider === 'google') {
    const cleanBase = customBase.replace(/\/+$/, '');
    const endpoint = `${cleanBase}/models/${modelName}:generateContent?key=${apiKey}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const reqBody = {
      system_instruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: config.temperature ?? 0.2,
        maxOutputTokens: effectiveMaxTokens,
        ...(forceJsonObject ? { responseMimeType: 'application/json' } : {})
      }
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Google AI Studio HTTP ${res.status}: ${errorText}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  }

  // 3. OpenAI-Compatible API (OpenAI, AvalAI, Custom, Ollama, OpenRouter)
  let endpoint = '';
  if (customBase.endsWith('/chat/completions')) {
    endpoint = customBase;
  } else {
    endpoint = `${customBase.replace(/\/+$/, '')}/chat/completions`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey.length > 0) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const reqBody: Record<string, unknown> = {
    model: modelName,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: promptText }
    ],
    temperature: config.temperature ?? 0.2,
    max_tokens: effectiveMaxTokens
  };

  if (forceJsonObject) {
    reqBody.response_format = { type: 'json_object' };
  }

  let res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(reqBody),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!res.ok && (res.status === 400 || res.status === 422) && forceJsonObject) {
    const errorText = await res.text();
    if (/response_format|json_object|unsupported|format|schema/i.test(errorText)) {
      delete reqBody.response_format;
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
        signal: AbortSignal.timeout(timeoutMs)
      });
    } else {
      throw new Error(`LLM API HTTP ${res.status}: ${errorText}`);
    }
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM API HTTP ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Test connectivity with an LLM provider configuration.
 */
export async function testLlmConnection(config: LlmProviderConfig): Promise<{
  ok: boolean;
  latency_ms: number;
  provider: string;
  model: string;
  message: string;
  reply_preview?: string;
  error?: string;
}> {
  const start = Date.now();
  try {
    const testSystem = 'You are an API health verification bot. You must respond strictly with valid JSON: {"status": "ok", "message": "Connection verified"}.';
    const testPrompt = 'Respond with JSON {"status": "ok", "message": "Connection verified"}';
    const rawReply = await callLlmRaw(config, testPrompt, testSystem, false);
    const latency_ms = Date.now() - start;

    return {
      ok: true,
      latency_ms,
      provider: config.provider,
      model: config.model,
      message: 'اتصال به ارائه‌دهنده هوش مصنوعی با موفقیت برقرار شد.',
      reply_preview: rawReply.slice(0, 150)
    };
  } catch (err: unknown) {
    const latency_ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, provider: config.provider }, 'LLM connection test failed');
    return {
      ok: false,
      latency_ms,
      provider: config.provider,
      model: config.model,
      message: 'برقراری ارتباط با ارائه‌دهنده با خطا مواجه شد.',
      error: msg
    };
  }
}

/**
 * Robust JSON extraction handling markdown code blocks, reasoning traces (<think>...</think>),
 * and unescaped trailing characters.
 */
export function extractJson<T = unknown>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip <think>...</think> reasoning traces if present
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 1. Priority 1: Direct JSON parse (fast-path; avoids corrupting internal markdown code fences)
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Proceed to fence and boundary stripping
  }

  // 2. Outermost markdown code block fence (only if the whole string is wrapped in ```...```)
  if (cleaned.startsWith('```')) {
    const lastFence = cleaned.lastIndexOf('```');
    if (lastFence > 3) {
      const firstNewline = cleaned.indexOf('\n');
      const inner = cleaned.slice(firstNewline + 1, lastFence).trim();
      try {
        return JSON.parse(inner) as T;
      } catch {
        cleaned = inner;
      }
    }
  }

  // 3. Find outermost JSON object or array
  const firstCurly = cleaned.indexOf('{');
  const lastCurly = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  let candidate = '';
  if (firstBracket !== -1 && lastBracket > firstBracket && (firstCurly === -1 || firstBracket < firstCurly)) {
    candidate = cleaned.slice(firstBracket, lastBracket + 1);
  } else if (firstCurly !== -1 && lastCurly > firstCurly) {
    candidate = cleaned.slice(firstCurly, lastCurly + 1);
  } else if (firstBracket !== -1 && lastBracket > firstBracket) {
    candidate = cleaned.slice(firstBracket, lastBracket + 1);
  }

  if (candidate) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Repair trailing commas and non-printable control characters
      const repaired = candidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
      return JSON.parse(repaired) as T;
    }
  }

  throw new Error(`Failed to extract valid JSON from LLM output: ${cleaned.slice(0, 160)}...`);
}

/**
 * Normalizes [slot_name] and <slot_name> to standard {{slot_name}} syntax.
 */
export function normalizeTemplateSlots(rawTemplate: string): string {
  let template = rawTemplate;
  template = template.replace(/\[([a-zA-Z0-9_\s]{2,40})\]/g, (_, match) => {
    return `{{${match.trim().toLowerCase().replace(/[\s-]+/g, '_')}}}`;
  });
  template = template.replace(/<([a-zA-Z0-9_\s]{2,40})>/g, (_, match) => {
    return `{{${match.trim().toLowerCase().replace(/[\s-]+/g, '_')}}}`;
  });
  return template;
}

/**
 * Extracts slot keys from {{slot_key}} in template.
 */
export function extractSlotsFromTemplate(template: string): Array<{
  slot_key: string;
  label_fa: string;
  default_value: string;
  is_required: boolean;
}> {
  const matches = [...template.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
  const uniqueKeys = Array.from(new Set(matches.map((m) => m[1])));
  return uniqueKeys.map((k) => ({
    slot_key: k,
    label_fa: k.replace(/_/g, ' '),
    default_value: '',
    is_required: true
  }));
}

function reconcileSlots(
  template: string,
  llmSlots?: Array<{ slot_key?: string; label_fa?: string; default_value?: string; is_required?: boolean }>
): Array<{ slot_key: string; label_fa: string; default_value: string; is_required: boolean }> {
  const templateSlots = extractSlotsFromTemplate(template);
  const llmMap = new Map<string, { label_fa?: string; default_value?: string; is_required?: boolean }>();
  if (Array.isArray(llmSlots)) {
    for (const s of llmSlots) {
      if (s?.slot_key) {
        llmMap.set(s.slot_key.trim().toLowerCase(), s);
      }
    }
  }

  return templateSlots.map((ts) => {
    const fromLlm = llmMap.get(ts.slot_key);
    return {
      slot_key: ts.slot_key,
      label_fa: fromLlm?.label_fa?.trim() || ts.label_fa,
      default_value: fromLlm?.default_value?.trim() || '',
      is_required: fromLlm?.is_required !== false
    };
  });
}

/**
 * Main LLM Parser & Semantic Enricher for a single prompt.
 */
export async function enrichPromptWithLlm(
  rawTemplate: string,
  rawTitle?: string,
  overrideConfig?: LlmProviderConfig,
  allowHeuristicFallback = true
): Promise<LlmEnrichmentResult> {
  const config = overrideConfig || (await getLlmConfig());

  // If no LLM provider or key is active, use deterministic heuristics
  if (!config || !config.is_active || (!config.api_key && config.provider !== 'custom')) {
    if (!allowHeuristicFallback) {
      throw new Error('تنظیمات مدل هوش مصنوعی فعال نیست یا کلید/آدرس سرور پیکربندی نشده است.');
    }
    logger.info('No active LLM configuration found; applying deterministic heuristic enrichment');
    return heuristicEnrich(rawTemplate, rawTitle);
  }

  const systemInstruction = `You are Promptjoo's principal Prompt Engineer and Iranian Persian localization expert.
Your job is to parse and convert raw, potentially unstructured prompts into production-grade parametric prompt templates for Promptjoo.

CRITICAL QUALITY DIRECTIVE:
All prompts MUST be SUBJECT-AGNOSTIC and REUSABLE parametric templates.
- VALID EXAMPLE: "Edit product photo to high-end studio shot on marble background with reflections" -> Subject-agnostic, works for any product.
- INVALID EXAMPLE: "Cinematic portrait of a software engineer in modern office with soft window light" -> Too specific, single instance, not a reusable template.
If the input prompt is hyper-specific or describes a single one-off subject, YOU MUST GENERALIZE IT by extracting the specific subject into a slot variable {{subject}} or generalizing the instructions so it becomes a reusable, subject-agnostic template applicable to any user topic or subject.

Requirements:
1. "template_en": The optimized prompt template in English. Identify any hardcoded topics, code, text samples, or roles and convert them into parametric slots using syntax {{slot_name}} with clean snake_case names. Preserve the core instruction tone.
2. "title_fa": A natural, professional, catchy Iranian Persian title (Tehran dialect, fluent, informal yet professional). Never produce robotic literal translations.
3. "short_desc_fa": A concise 1-2 sentence Persian description explaining what this prompt accomplishes and the benefit for the user.
4. "direct_answer_summary_fa": A 1-sentence Persian summary for SEO and card snippets.
5. "modality": Exactly one of: ["text_writing", "code_tech", "text_to_image", "image_edit", "data_structuring", "video_audio"].
6. "category_slug": Exactly one of: ["content-writing", "coding-tech", "image-generation", "photo-editing", "excel-data", "reels-voice"].
7. "supported_models": Array of recommended models from ["chatgpt", "gemini", "claude", "midjourney"].
8. "slots_schema_json": Array of objects for EVERY {{slot_name}} in "template_en":
   - "slot_key": matching the exact name in {{slot_name}}
   - "label_fa": natural Persian label (e.g. "موضوع مقاله", "زبان برنامه‌نویسی", "متن اولیه")
   - "default_value": a helpful, realistic sample value in Persian or English suitable for the slot
   - "is_required": boolean (true for essential inputs)
9. "search_keywords_fa": Array of 4 to 6 relevant Persian keywords for search discovery.
10. "quality_score": Integer from 1 to 10 evaluating utility and clarity.

Respond STRICTLY with a valid JSON object matching this schema without any markdown backticks or explanations.`;

  const userPrompt = `Parse and enrich this prompt:
Title/Act hint: "${rawTitle || ''}"
Raw Content: "${rawTemplate}"`;

  try {
    const rawJsonResponse = await callLlmRaw(config, userPrompt, systemInstruction, true);
    const parsed = extractJson<Record<string, unknown>>(rawJsonResponse);

    const rawTmpl = typeof parsed.template_en === 'string' ? parsed.template_en : rawTemplate;
    const normalizedTemplate = normalizeTemplateSlots(rawTmpl);
    const slots = reconcileSlots(
      normalizedTemplate,
      Array.isArray(parsed.slots_schema_json) ? (parsed.slots_schema_json as Array<Record<string, unknown>>) : undefined
    );

    const validCategories = new Set([
      'content-writing',
      'coding-tech',
      'image-generation',
      'photo-editing',
      'excel-data',
      'reels-voice'
    ]);
    const catSlug = typeof parsed.category_slug === 'string' && validCategories.has(parsed.category_slug)
      ? parsed.category_slug
      : 'content-writing';

    return {
      template_en: normalizedTemplate,
      title_fa: (typeof parsed.title_fa === 'string' && parsed.title_fa.trim()) ? parsed.title_fa.trim() : (rawTitle || 'پرامپت اختصاصی'),
      short_desc_fa: typeof parsed.short_desc_fa === 'string' ? parsed.short_desc_fa : '',
      direct_answer_summary_fa: typeof parsed.direct_answer_summary_fa === 'string' ? parsed.direct_answer_summary_fa : '',
      modality: (parsed.modality as LlmEnrichmentResult['modality']) || 'text_writing',
      category_slug: catSlug,
      supported_models: Array.isArray(parsed.supported_models) ? (parsed.supported_models as string[]) : ['chatgpt', 'gemini'],
      slots_schema_json: slots,
      search_keywords_fa: Array.isArray(parsed.search_keywords_fa) ? (parsed.search_keywords_fa as string[]) : [],
      quality_score: typeof parsed.quality_score === 'number' ? parsed.quality_score : 8,
      enriched_by_llm: true,
      model_used: `${config.provider}:${config.model}`
    };
  } catch (err: unknown) {
    if (!allowHeuristicFallback) {
      throw err;
    }
    logger.warn({ err, provider: config.provider, model: config.model }, 'LLM Enrichment call failed; falling back to deterministic heuristic parsing');
    return heuristicEnrich(rawTemplate, rawTitle);
  }
}

export interface BatchPromptInput {
  id: string;
  template_en: string;
  title_fa?: string;
}

export interface BatchPromptOutput extends LlmEnrichmentResult {
  id: string;
}

/**
 * High-Throughput Multi-Prompt Batch Enricher.
 * Packages multiple prompts into a single LLM request with structured JSON array output,
 * with automatic slot reconciliation and individual item fallback.
 */
export async function enrichPromptBatchWithLlm(
  prompts: BatchPromptInput[],
  overrideConfig?: LlmProviderConfig,
  allowHeuristicFallback = false
): Promise<BatchPromptOutput[]> {
  if (prompts.length === 0) return [];

  const config = overrideConfig || (await getLlmConfig());

  if (!config || !config.is_active || (!config.api_key && config.provider !== 'custom')) {
    if (!allowHeuristicFallback) {
      throw new Error('تنظیمات مدل هوش مصنوعی فعال نیست یا کلید/آدرس سرور پیکربندی نشده است.');
    }
    return prompts.map((p) => ({
      id: p.id,
      ...heuristicEnrich(p.template_en, p.title_fa)
    }));
  }

  // Optimize: single prompt directly uses single enricher without array framing overhead
  if (prompts.length === 1) {
    const single = await enrichPromptWithLlm(prompts[0].template_en, prompts[0].title_fa, config, allowHeuristicFallback);
    return [{ id: prompts[0].id, ...single }];
  }

  const systemInstruction = `You are Promptjoo's principal Prompt Engineer and Iranian Persian localization expert.
Your job is to parse and convert raw, potentially unstructured prompts into production-grade parametric prompt templates for Promptjoo.

CRITICAL QUALITY DIRECTIVE:
All prompts MUST be SUBJECT-AGNOSTIC and REUSABLE parametric templates.
- VALID: Subject-agnostic workflows (e.g. edit product photo to studio shot on marble background -> works for any product).
- INVALID: Hyper-specific single instance (e.g. portrait of an engineer in an office).
If an input prompt is a single-instance generation, generalize it into a reusable template with slot variables like {{subject}}, {{setting}}, etc.

You will receive an array of prompt items with "index", "id", and "template_content".
For EACH input prompt item, you must generate a corresponding enriched JSON object with:
1. "index": integer matching input "index" (0, 1, 2, ...)
2. "id": string matching input "id"
3. "template_en": The optimized prompt template in English with parametric slots using syntax {{slot_name}} with clean snake_case names. Preserve the core instruction tone.
4. "title_fa": A natural, professional, catchy Iranian Persian title (Tehran dialect, fluent, informal yet professional). Never produce robotic literal translations.
5. "short_desc_fa": A concise 1-2 sentence Persian description explaining what this prompt accomplishes and the benefit for the user.
6. "direct_answer_summary_fa": A 1-sentence Persian summary for SEO and card snippets.
7. "modality": Exactly one of: ["text_writing", "code_tech", "text_to_image", "image_edit", "data_structuring", "video_audio"].
8. "category_slug": Exactly one of: ["content-writing", "coding-tech", "image-generation", "photo-editing", "excel-data", "reels-voice"].
9. "supported_models": Array from ["chatgpt", "gemini", "claude", "midjourney"].
10. "slots_schema_json": Array of objects for EVERY {{slot_name}} in "template_en":
   - "slot_key": matching the exact name in {{slot_name}}
   - "label_fa": natural Persian label (e.g. "موضوع مقاله", "زبان برنامه‌نویسی", "متن اولیه")
   - "default_value": a helpful, realistic sample value in Persian or English suitable for the slot
   - "is_required": boolean (true for essential inputs)
11. "search_keywords_fa": Array of 4 to 6 relevant Persian keywords for search discovery.
12. "quality_score": Integer from 1 to 10.

Respond STRICTLY with a valid JSON array of objects:
[ { ... }, { ... } ]
OR a JSON object {"items": [ ... ]}.
Do not include any text outside the JSON.`;

  const userPayload = JSON.stringify(
    prompts.map((p, idx) => ({
      index: idx,
      id: p.id,
      title_hint: p.title_fa || '',
      template_content: p.template_en
    }))
  );

  const batchTimeoutMs = Math.max((config.timeout_seconds || 60) * 1000, prompts.length * 30000);
  const neededTokens = Math.max(config.max_tokens || 4000, prompts.length * 900);

  try {
    const rawJsonResponse = await callLlmRaw(
      config,
      `Enrich the following ${prompts.length} prompt(s) into parametric templates:\n${userPayload}`,
      systemInstruction,
      true,
      batchTimeoutMs,
      neededTokens
    );

    const parsed = extractJson<{ items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(rawJsonResponse);
    const rawItems = Array.isArray(parsed) ? parsed : (parsed?.items || []);

    const itemsMapById = new Map<string, Record<string, unknown>>();
    const itemsMapByIndex = new Map<number, Record<string, unknown>>();

    for (let j = 0; j < rawItems.length; j++) {
      const item = rawItems[j];
      if (item) {
        if (item.id) itemsMapById.set(String(item.id), item);
        if (typeof item.index === 'number') itemsMapByIndex.set(item.index, item);
      }
    }

    const validCategories = new Set([
      'content-writing',
      'coding-tech',
      'image-generation',
      'photo-editing',
      'excel-data',
      'reels-voice'
    ]);

    const results: BatchPromptOutput[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const input = prompts[i];
      const enrichedRaw = itemsMapById.get(input.id) || itemsMapByIndex.get(i) || rawItems[i];

      if (!enrichedRaw) {
        logger.warn({ promptId: input.id }, 'LLM omitted prompt from batch response; enriching individually');
        const single = await enrichPromptWithLlm(input.template_en, input.title_fa, config, allowHeuristicFallback);
        results.push({ id: input.id, ...single });
        continue;
      }

      const rawTmpl = typeof enrichedRaw.template_en === 'string' ? enrichedRaw.template_en : input.template_en;
      const normalizedTemplate = normalizeTemplateSlots(rawTmpl);
      const slots = reconcileSlots(
        normalizedTemplate,
        Array.isArray(enrichedRaw.slots_schema_json) ? (enrichedRaw.slots_schema_json as Array<Record<string, unknown>>) : undefined
      );

      const titleFa = typeof enrichedRaw.title_fa === 'string' && enrichedRaw.title_fa.trim()
        ? enrichedRaw.title_fa.trim()
        : input.title_fa || 'پرامپت اختصاصی';

      const catSlug = typeof enrichedRaw.category_slug === 'string' && validCategories.has(enrichedRaw.category_slug)
        ? enrichedRaw.category_slug
        : 'content-writing';

      results.push({
        id: input.id,
        template_en: normalizedTemplate,
        title_fa: titleFa,
        short_desc_fa: typeof enrichedRaw.short_desc_fa === 'string' ? enrichedRaw.short_desc_fa : '',
        direct_answer_summary_fa: typeof enrichedRaw.direct_answer_summary_fa === 'string' ? enrichedRaw.direct_answer_summary_fa : '',
        modality: (enrichedRaw.modality as LlmEnrichmentResult['modality']) || 'text_writing',
        category_slug: catSlug,
        supported_models: Array.isArray(enrichedRaw.supported_models) ? (enrichedRaw.supported_models as string[]) : ['chatgpt', 'gemini'],
        slots_schema_json: slots,
        search_keywords_fa: Array.isArray(enrichedRaw.search_keywords_fa) ? (enrichedRaw.search_keywords_fa as string[]) : [],
        quality_score: typeof enrichedRaw.quality_score === 'number' ? enrichedRaw.quality_score : 8,
        enriched_by_llm: true,
        model_used: `${config.provider}:${config.model}`
      });
    }

    return results;
  } catch (batchErr: unknown) {
    if (!allowHeuristicFallback) {
      throw batchErr;
    }
    logger.warn({ err: batchErr, promptCount: prompts.length }, 'Batch enrichment call failed; applying heuristic enrichment');
    return prompts.map((p) => ({
      id: p.id,
      ...heuristicEnrich(p.template_en, p.title_fa)
    }));
  }
}

