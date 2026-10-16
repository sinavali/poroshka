import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import { detectModality } from '../../../../../packages/persian-normalizer/src/index.ts';

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
  provider: 'gemini' | 'openai' | 'openrouter' | 'deepseek';
  api_key: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  is_active?: boolean;
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
      const apiKey = val.api_key || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || '';
      return {
        provider: val.provider || 'gemini',
        api_key: apiKey,
        model: val.model || (val.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'),
        temperature: val.temperature ?? 0.2,
        max_tokens: val.max_tokens ?? 1500,
        is_active: val.is_active ?? (apiKey.length > 0)
      };
    }
  } catch (err) {
    logger.warn({ err }, 'Could not read llm_provider_config from database, checking environment');
  }

  const envGemini = process.env.GEMINI_API_KEY;
  const envOpenAi = process.env.OPENAI_API_KEY;
  if (envGemini) {
    return { provider: 'gemini', api_key: envGemini, model: 'gemini-1.5-flash', is_active: true };
  }
  if (envOpenAi) {
    return { provider: 'openai', api_key: envOpenAi, model: 'gpt-4o-mini', is_active: true };
  }
  return null;
}

/**
 * Heuristic fallback when LLM is unavailable or unconfigured.
 * Normalizes [brackets] into {{slots}}, generates Tehran Persian titles,
 * and detects modality using regex heuristics.
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
    code_tech: 'code-generation',
    text_to_image: 'image-generation',
    image_edit: 'photo-editing',
    data_structuring: 'data-automation',
    video_audio: 'video-scripting'
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
 * Main LLM Parser & Semantic Enricher.
 * Takes unstructured raw web prompts, detects variables, translates into fluent Persian,
 * and outputs a production-ready schema.
 */
export async function enrichPromptWithLlm(
  rawTemplate: string,
  rawTitle?: string
): Promise<LlmEnrichmentResult> {
  const config = await getLlmConfig();

  // If no LLM provider or key is active, use deterministic heuristics
  if (!config || !config.is_active || !config.api_key) {
    logger.info('No active LLM configuration found; applying deterministic heuristic enrichment');
    return heuristicEnrich(rawTemplate, rawTitle);
  }

  const systemInstruction = `You are Promptjoo's principal Prompt Engineer and Iranian Persian localization expert.
Your job is to parse and convert raw, potentially unstructured prompts (from GitHub, Reddit, or web datasets) into production-grade parametric prompt templates for Promptjoo.

Input Prompt:
Title/Act hint: "${rawTitle || ''}"
Raw Content: "${rawTemplate}"

Requirements:
1. "template_en": The optimized prompt template in English. Identify any hardcoded topics, code, text samples, or roles and convert them into parametric slots using syntax {{slot_name}} with clean snake_case names. Preserve the core instruction tone.
2. "title_fa": A natural, professional, catchy Iranian Persian title (Tehran dialect, fluent, informal yet professional). Never produce robotic literal translations.
3. "short_desc_fa": A concise 1-2 sentence Persian description explaining what this prompt accomplishes and the benefit for the user.
4. "direct_answer_summary_fa": A 1-sentence Persian summary for SEO and card snippets.
5. "modality": Exactly one of: ["text_writing", "code_tech", "text_to_image", "image_edit", "data_structuring", "video_audio"].
6. "category_slug": Exactly one of: ["content-writing", "code-generation", "image-generation", "photo-editing", "data-automation", "video-scripting"].
7. "supported_models": Array of recommended models from ["chatgpt", "gemini", "claude", "midjourney"].
8. "slots_schema_json": Array of objects for EVERY {{slot_name}} in "template_en":
   - "slot_key": matching the exact name in {{slot_name}}
   - "label_fa": natural Persian label (e.g., "موضوع مقاله", "زبان برنامه‌نویسی", "متن اولیه")
   - "default_value": a helpful, realistic sample value in Persian or English suitable for the slot
   - "is_required": boolean (true for essential inputs)
9. "search_keywords_fa": Array of 4 to 6 relevant Persian keywords for search discovery.
10. "quality_score": Integer from 1 to 10 evaluating utility and clarity.

Respond STRICTLY with a valid JSON object matching this schema without any markdown backticks or explanations.`;

  try {
    let rawJsonResponse = '';

    if (config.provider === 'gemini') {
      const model = config.model || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }],
          generationConfig: {
            temperature: config.temperature ?? 0.2,
            maxOutputTokens: config.max_tokens ?? 1500,
            responseMimeType: 'application/json'
          }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API returned ${res.status}: ${errorText}`);
      }

      const data = await res.json() as any;
      rawJsonResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      // OpenAI / OpenRouter / DeepSeek compatible endpoint
      let url = 'https://api.openai.com/v1/chat/completions';
      if (config.provider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
      if (config.provider === 'deepseek') url = 'https://api.deepseek.com/chat/completions';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`
        },
        body: JSON.stringify({
          model: config.model || (config.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
          messages: [
            { role: 'system', content: 'You are a structured JSON generator for AI prompt engineering.' },
            { role: 'user', content: systemInstruction }
          ],
          temperature: config.temperature ?? 0.2,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${config.provider} API returned ${res.status}: ${errorText}`);
      }

      const data = await res.json() as any;
      rawJsonResponse = data?.choices?.[0]?.message?.content || '';
    }

    // Clean JSON response (strip markdown wrappers if present)
    const cleanJson = rawJsonResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      template_en: parsed.template_en || rawTemplate,
      title_fa: parsed.title_fa || rawTitle || 'پرامپت اختصاصی',
      short_desc_fa: parsed.short_desc_fa || '',
      direct_answer_summary_fa: parsed.direct_answer_summary_fa || '',
      modality: parsed.modality || 'text_writing',
      category_slug: parsed.category_slug || 'content-writing',
      supported_models: Array.isArray(parsed.supported_models) ? parsed.supported_models : ['chatgpt', 'gemini'],
      slots_schema_json: Array.isArray(parsed.slots_schema_json) ? parsed.slots_schema_json : [],
      search_keywords_fa: Array.isArray(parsed.search_keywords_fa) ? parsed.search_keywords_fa : [],
      quality_score: typeof parsed.quality_score === 'number' ? parsed.quality_score : 8,
      enriched_by_llm: true,
      model_used: `${config.provider}:${config.model}`
    };
  } catch (err: unknown) {
    logger.warn({ err }, 'LLM Enrichment call failed; falling back to deterministic heuristic parsing');
    return heuristicEnrich(rawTemplate, rawTitle);
  }
}
