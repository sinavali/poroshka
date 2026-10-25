import crypto from 'node:crypto';
import { logger } from '../observability/pino-logger.ts';
import { pool } from '../database/client.ts';

export type AuthHeaderFormat = 'raw' | 'bearer' | 'apikey_prefix' | 'bearer_dpn_sk';

export interface EmbeddingProfile {
  id: string;
  name: string;
  provider_type: 'openai_compatible' | 'custom';
  base_url: string;
  api_key: string;
  auth_header_format: AuthHeaderFormat;
  model: string;
  dimensions: number;
  max_batch_size: number;
  context_window?: number;
  custom_headers?: Record<string, string>;
  is_active: boolean;
}

export interface EmbeddingProfilesConfig {
  active_profile_id: string;
  profiles: EmbeddingProfile[];
}

export const DEFAULT_PROFILES: EmbeddingProfile[] = [
  {
    id: 'deapi-bge-m3',
    name: 'deAPI (Bge_M3_FP16)',
    provider_type: 'openai_compatible',
    base_url: process.env.DEAPI_BASE_URL || 'https://oai.deapi.ai/v1',
    api_key: process.env.DEAPI_API_KEY || '',
    auth_header_format: 'bearer_dpn_sk',
    model: process.env.DEAPI_EMBEDDING_MODEL || 'Bge_M3_FP16',
    dimensions: 1024,
    max_batch_size: 10,
    context_window: 8192,
    custom_headers: {},
    is_active: true
  },
  {
    id: 'arvancloud-bge-m3',
    name: 'ArvanCloud AIaaS (Bge-m3)',
    provider_type: 'openai_compatible',
    base_url: process.env.ARVAN_BASE_URL || 'https://api.arvancloudai.ir/v1',
    api_key: process.env.ARVAN_API_KEY || '',
    auth_header_format: 'raw',
    model: process.env.ARVAN_MODEL || 'Bge-m3',
    dimensions: 1024,
    max_batch_size: 20,
    context_window: 8192,
    custom_headers: {
      'X-Gateway-Name': 'gateway-v1gna'
    },
    is_active: false
  },
  {
    id: 'avalai-text-embedding-3',
    name: 'AvalAI (text-embedding-3-small)',
    provider_type: 'openai_compatible',
    base_url: 'https://api.avalai.ir/v1',
    api_key: process.env.AVALAI_API_KEY || '',
    auth_header_format: 'bearer',
    model: 'text-embedding-3-small',
    dimensions: 1024,
    max_batch_size: 20,
    context_window: 8192,
    custom_headers: {},
    is_active: false
  },
  {
    id: 'openai-text-embedding-3',
    name: 'OpenAI (text-embedding-3-small)',
    provider_type: 'openai_compatible',
    base_url: 'https://api.openai.com/v1',
    api_key: process.env.OPENAI_API_KEY || '',
    auth_header_format: 'bearer',
    model: 'text-embedding-3-small',
    dimensions: 1024,
    max_batch_size: 20,
    context_window: 8192,
    custom_headers: {},
    is_active: false
  },
  {
    id: 'ollama-bge-m3',
    name: 'Ollama Local (bge-m3)',
    provider_type: 'openai_compatible',
    base_url: 'http://localhost:11434/v1',
    api_key: '',
    auth_header_format: 'raw',
    model: 'bge-m3',
    dimensions: 1024,
    max_batch_size: 10,
    context_window: 8192,
    custom_headers: {},
    is_active: false
  }
];

let cachedConfig: { config: EmbeddingProfilesConfig; expiresAt: number } | null = null;

export function invalidateEmbeddingProfilesCache(): void {
  cachedConfig = null;
}

/**
 * Retrieve all embedding profiles and currently active profile from database or defaults
 */
export async function getAllEmbeddingProfiles(): Promise<EmbeddingProfilesConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) {
    return cachedConfig.config;
  }

  try {
    const res = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'embedding_profiles_config' LIMIT 1"
    );

    if (res.rows.length > 0 && res.rows[0].setting_value) {
      const val = res.rows[0].setting_value as EmbeddingProfilesConfig;
      if (Array.isArray(val.profiles) && val.profiles.length > 0) {
        cachedConfig = { config: val, expiresAt: now + 30000 };
        return val;
      }
    }
  } catch (err: unknown) {
    logger.warn({ err }, 'Failed to load embedding_profiles_config from DB; using default profiles');
  }

  const fallback: EmbeddingProfilesConfig = {
    active_profile_id: 'deapi-bge-m3',
    profiles: DEFAULT_PROFILES
  };
  cachedConfig = { config: fallback, expiresAt: now + 30000 };
  return fallback;
}

/**
 * Get the currently active embedding profile
 */
export async function getActiveEmbeddingProfile(): Promise<EmbeddingProfile> {
  const full = await getAllEmbeddingProfiles();
  const found = full.profiles.find((p) => p.id === full.active_profile_id && p.is_active)
    || full.profiles.find((p) => p.is_active)
    || full.profiles[0]
    || DEFAULT_PROFILES[0];
  return found;
}

/**
 * Save updated embedding profiles config to database
 */
export async function saveEmbeddingProfilesConfig(config: EmbeddingProfilesConfig): Promise<void> {
  // Normalize is_active flag so exactly one profile is active
  const normalizedProfiles = config.profiles.map((p) => ({
    ...p,
    is_active: p.id === config.active_profile_id
  }));

  const payload: EmbeddingProfilesConfig = {
    active_profile_id: config.active_profile_id,
    profiles: normalizedProfiles
  };

  await pool.query(`
    INSERT INTO system_settings (setting_key, category, description_fa, setting_value, updated_at)
    VALUES ('embedding_profiles_config', 'ai', 'پیکربندی پروفایل‌های ارائه‌دهنده امبدینگ هوش مصنوعی (ArvanCloud, deAPI و ...)', $1, NOW())
    ON CONFLICT (setting_key)
    DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      updated_at = NOW();
  `, [JSON.stringify(payload)]);

  invalidateEmbeddingProfilesCache();
  logger.info({ activeId: config.active_profile_id, count: config.profiles.length }, 'Embedding profiles configuration updated');
}

/**
 * Resolve Authorization header value based on profile's auth_header_format
 */
export function formatAuthHeader(apiKey: string, format: AuthHeaderFormat): string {
  const clean = apiKey.trim();
  switch (format) {
    case 'raw':
      return clean;
    case 'bearer':
      return clean.startsWith('Bearer ') ? clean : `Bearer ${clean}`;
    case 'bearer_dpn_sk': {
      if (clean.startsWith('Bearer ')) return clean;
      const stripped = clean.startsWith('dpn-sk-') ? clean : `dpn-sk-${clean}`;
      return `Bearer ${stripped}`;
    }
    case 'apikey_prefix':
      return clean.startsWith('apikey ') ? clean : `apikey ${clean}`;
    default:
      return clean;
  }
}

/**
 * Deterministic unit 1024-d mock vector generator for pgvector compatibility (Zero-fail fallback)
 */
export function generateMockEmbedding(seedStr: string): string {
  const hash = crypto.createHash('sha256').update(seedStr).digest();
  const vector: number[] = new Array(1024);
  let sumSq = 0;
  for (let i = 0; i < 1024; i++) {
    const byte = hash[i % hash.length];
    const val = (byte / 128.0) - 1.0;
    vector[i] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  const normalized = vector.map((v) => (v / norm).toFixed(6));
  return `[${normalized.join(',')}]`;
}

/**
 * Format raw number array to PostgreSQL vector string format
 */
export function formatVectorForPg(vec: number[]): string {
  if (!Array.isArray(vec) || vec.length !== 1024) {
    throw new Error(`Expected 1024-dimensional vector, got ${vec?.length || 0}`);
  }
  return `[${vec.map((v) => Number(v.toFixed(6))).join(',')}]`;
}

/**
 * Test connectivity and generation on a specific embedding profile
 */
export async function testEmbeddingProfile(profile: EmbeddingProfile): Promise<{
  success: boolean;
  latency_ms: number;
  dimensions: number;
  status_code?: number;
  error?: string;
}> {
  const start = Date.now();
  const cleanBase = profile.base_url.replace(/\/+$/, '');
  const url = `${cleanBase}/embeddings`;
  const authHeader = formatAuthHeader(profile.api_key, profile.auth_header_format);

  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    ...(profile.custom_headers || {})
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: profile.model,
        input: 'تست اعتبارسنجی اتصال سرویس امبدینگ پرامپت‌جو'
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const duration = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        latency_ms: duration,
        dimensions: 0,
        status_code: res.status,
        error: `HTTP ${res.status}: ${errText.slice(0, 300)}`
      };
    }

    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const vector = data.data?.[0]?.embedding;
    const len = Array.isArray(vector) ? vector.length : 0;

    return {
      success: len > 0,
      latency_ms: duration,
      dimensions: len,
      status_code: res.status,
      error: len === 0 ? 'پاسخ دریافتی فاقد آرایه وکتور بود' : undefined
    };
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      latency_ms: duration,
      dimensions: 0,
      error: msg
    };
  }
}

/**
 * Generate a single 1024-d vector embedding using the currently active profile
 */
export async function generateEmbedding(text: string): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) {
    return generateMockEmbedding('empty');
  }

  const profile = await getActiveEmbeddingProfile();
  const cleanBase = profile.base_url.replace(/\/+$/, '');
  const url = `${cleanBase}/embeddings`;
  const authHeader = formatAuthHeader(profile.api_key, profile.auth_header_format);

  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    ...(profile.custom_headers || {})
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: profile.model,
        input: cleanText
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      logger.warn({ profile: profile.name, status: res.status, body: errBody.slice(0, 200) }, 'Embedding provider failed; falling back to deterministic vector');
      return generateMockEmbedding(cleanText);
    }

    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const rawVector = data.data?.[0]?.embedding;
    if (rawVector && rawVector.length === 1024) {
      return formatVectorForPg(rawVector);
    }

    logger.warn({ profile: profile.name, len: rawVector?.length }, 'Provider returned non-1024 vector; falling back');
    return generateMockEmbedding(cleanText);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ profile: profile.name, err: msg }, 'Embedding provider exception; falling back to deterministic vector');
    return generateMockEmbedding(cleanText);
  }
}

/**
 * Helper to fetch single embedding item as fallback when batch API fails
 */
async function fetchSingleEmbeddingFallback(
  url: string,
  headers: Record<string, string>,
  model: string,
  text: string
): Promise<string> {
  const clean = text.trim() || 'prompt';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, input: clean.slice(0, 4000) }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return generateMockEmbedding(clean);

    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const vec = data.data?.[0]?.embedding;
    if (vec && vec.length === 1024) {
      return formatVectorForPg(vec);
    }
    return generateMockEmbedding(clean);
  } catch {
    clearTimeout(timeout);
    return generateMockEmbedding(clean);
  }
}

/**
 * Generate embeddings in batch via the currently active profile
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];

  const profile = await getActiveEmbeddingProfile();
  const results: string[] = new Array(texts.length);
  const chunkSize = profile.max_batch_size > 0 ? profile.max_batch_size : 10;

  const cleanBase = profile.base_url.replace(/\/+$/, '');
  const url = `${cleanBase}/embeddings`;
  const authHeader = formatAuthHeader(profile.api_key, profile.auth_header_format);

  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    ...(profile.custom_headers || {})
  };

  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize);
    const chunkIndices = Array.from({ length: chunk.length }, (_, idx) => i + idx);

    let batchSuccess = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const requestInput = chunk.length === 1 ? (chunk[0].trim() || 'prompt') : chunk.map((t) => t.trim() || 'prompt');

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: profile.model,
          input: requestInput
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        type EmbeddingItem = { embedding?: number[]; index?: number };
        const respBody = (await res.json()) as { data?: EmbeddingItem[] };
        const dataArray = respBody?.data;
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          for (let j = 0; j < dataArray.length; j++) {
            const item: EmbeddingItem = dataArray[j];
            const targetIndex = chunkIndices[item?.index !== undefined ? item.index : j];
            if (item?.embedding && item.embedding.length === 1024) {
              results[targetIndex] = formatVectorForPg(item.embedding);
            } else {
              results[targetIndex] = generateMockEmbedding(chunk[j]);
            }
          }
          batchSuccess = true;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ profile: profile.name, err: msg }, 'Batch embedding call failed, falling back to sequential single-item retrieval');
    }

    // Resilient Fallback: If batch failed or was non-ok, fetch individual items sequentially
    if (!batchSuccess) {
      for (let j = 0; j < chunk.length; j++) {
        results[i + j] = await fetchSingleEmbeddingFallback(url, headers, profile.model, chunk[j]);
      }
    }
  }

  return results;
}
