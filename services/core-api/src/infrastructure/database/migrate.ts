import pg from 'pg';
import argon2 from 'argon2';
import { logger } from '../observability/pino-logger.ts';

const { Client } = pg;

const defaultDevDb = process.env.NODE_ENV === 'development' ? (process.env.DEV_DATABASE_URL || 'postgresql://localhost:5432/poroshka_dev') : undefined;
const rawDatabaseUrl = process.env.DATABASE_URL || defaultDevDb;
if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}
const DATABASE_URL: string = rawDatabaseUrl;

const DDL = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Enumerations
DO $$ BEGIN
  CREATE TYPE prompt_modality AS ENUM (
    'image_edit',
    'text_to_image',
    'text_writing',
    'data_structuring',
    'video_audio',
    'code_tech'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE prompt_block_type AS ENUM (
    'ROLE',
    'TASK',
    'CONSTRAINT',
    'FORMAT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ingestion_status AS ENUM (
    'PENDING',
    'SKIPPED_DUPLICATE',
    'SKIPPED_NEAR_DUPLICATE',
    'SKIPPED_INVALID',
    'LLM_ENRICHED',
    'MEDIA_PROCESSED',
    'EMBEDDED',
    'PUBLISHED',
    'FAILED_RETRYABLE',
    'DEAD_LETTER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ad_placement_slot AS ENUM (
    'POST_COPY_DRAWER',
    'FEED_NATIVE_CARD_3',
    'STICKY_FOOTER_BANNER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE outbox_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'DEAD_LETTER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_fa TEXT NOT NULL,
  description_fa TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  primary_modality prompt_modality NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 2. Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content_hash CHAR(64) UNIQUE NOT NULL,
  external_source_id TEXT UNIQUE,
  modality prompt_modality NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  requires_image_upload BOOLEAN NOT NULL DEFAULT FALSE,
  supported_models TEXT[] NOT NULL DEFAULT '{chatgpt,gemini}',
  
  title_fa TEXT NOT NULL,
  short_desc_fa TEXT NOT NULL,
  direct_answer_summary_fa TEXT NOT NULL,
  search_keywords_fa TEXT NOT NULL,
  faq_schema_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  template_en TEXT NOT NULL,
  slots_schema_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  preview_after_webp_url TEXT,
  preview_before_webp_url TEXT,
  preview_blurhash TEXT,
  preview_alt_fa TEXT,
  needs_custom_preview BOOLEAN NOT NULL DEFAULT FALSE,
  
  embedding vector(1024) NOT NULL,
  slot_count SMALLINT NOT NULL DEFAULT 0,
  copy_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  trending_score_7d REAL NOT NULL DEFAULT 0.0,
  is_admin_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_ai_enriched BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_prompts_embedding_hnsw ON prompts 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 128);
CREATE INDEX IF NOT EXISTS idx_prompts_template_trgm ON prompts 
  USING gin (template_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prompts_search_fa_trgm ON prompts 
  USING gin ((title_fa || ' ' || search_keywords_fa) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prompts_catalog_filter ON prompts 
  (is_published, modality, category_id, requires_image_upload, copy_count DESC);

-- 3. Atomic Prompt Blocks
CREATE TABLE IF NOT EXISTS prompt_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  block_type prompt_block_type NOT NULL,
  modality prompt_modality NOT NULL,
  title_fa TEXT NOT NULL,
  block_template_en TEXT NOT NULL,
  slots_schema_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  embedding vector(1024) NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_prompt_blocks_hnsw ON prompt_blocks 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_prompt_blocks_filter ON prompt_blocks (block_type, modality);

-- 4. Query Embedding Cache
CREATE TABLE IF NOT EXISTS query_embedding_cache (
  normalized_query_hash CHAR(64) PRIMARY KEY,
  normalized_query_text TEXT NOT NULL,
  embedding vector(1024) NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 5. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_chat_id BIGINT UNIQUE,
  bale_chat_id BIGINT UNIQUE,
  web_push_subscription_json JSONB,
  saved_context_profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  role TEXT NOT NULL DEFAULT 'USER',
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 6. Persistent Auth Sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label TEXT,
  ip_address INET,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_exp ON auth_sessions (expires_at);

-- 7. User Saved Prompts
CREATE TABLE IF NOT EXISTS user_saved_prompts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  custom_values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  PRIMARY KEY (user_id, prompt_id)
);

-- 7b. User Copied Prompts
CREATE TABLE IF NOT EXISTS user_copied_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_uuid TEXT,
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  custom_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  custom_title_fa TEXT,
  custom_modality TEXT,
  custom_values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  compiled_text TEXT NOT NULL,
  copy_count INT NOT NULL DEFAULT 1,
  last_copied_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_copied_user_prompt ON user_copied_prompts (user_id, prompt_id) WHERE user_id IS NOT NULL AND prompt_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_copied_client_prompt ON user_copied_prompts (client_uuid, prompt_id) WHERE user_id IS NULL AND prompt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_copied_user ON user_copied_prompts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_copied_client ON user_copied_prompts (client_uuid);
CREATE INDEX IF NOT EXISTS idx_user_copied_last ON user_copied_prompts (last_copied_at DESC);

-- 7c. Ticketing System
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'OPEN',
  target_role TEXT NOT NULL DEFAULT 'OPERATOR',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_target_role ON tickets (target_role);
CREATE INDEX IF NOT EXISTS idx_tickets_last_msg ON tickets (last_message_at DESC);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages (ticket_id, created_at ASC);

-- 7c. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description_fa TEXT NOT NULL DEFAULT '',
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings (category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings (setting_key);

-- 8. Ingestion Batches
CREATE TABLE IF NOT EXISTS ingestion_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  processed_rows INT NOT NULL DEFAULT 0,
  skipped_duplicates INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  max_budget_usd NUMERIC(8, 4) NOT NULL DEFAULT 5.0000,
  spent_usd_estimate NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ingestion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES ingestion_batches(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  raw_template_en TEXT NOT NULL,
  raw_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_modality prompt_modality,
  detected_requires_upload BOOLEAN,
  status ingestion_status NOT NULL DEFAULT 'PENDING',
  enrichment_payload_json JSONB,
  media_payload_json JSONB,
  embedding_vector vector(1024),
  retry_count SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  UNIQUE (batch_id, row_index)
);
CREATE INDEX IF NOT EXISTS idx_ingestion_items_worker ON ingestion_items (batch_id, status, retry_count);

-- 8b. Bulk Ingestion Jobs (Smart Background Processing for ~118k Prompts)
CREATE TABLE IF NOT EXISTS bulk_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'IDLE',
  total_items INT NOT NULL DEFAULT 0,
  processed_items INT NOT NULL DEFAULT 0,
  enriched_items INT NOT NULL DEFAULT 0,
  skipped_items INT NOT NULL DEFAULT 0,
  failed_items INT NOT NULL DEFAULT 0,
  current_slug TEXT,
  batch_size INT NOT NULL DEFAULT 10,
  delay_ms INT NOT NULL DEFAULT 300,
  provider_used TEXT,
  model_used TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bulk_ingestion_jobs_status ON bulk_ingestion_jobs (status);

-- 9. Ad Network Configs (Yektanet & Tapsell)
CREATE TABLE IF NOT EXISTS ad_network_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_slot ad_placement_slot NOT NULL,
  provider TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  script_tag_html TEXT,
  target_modalities prompt_modality[] DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 10. Persistent Idempotency Keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key UUID PRIMARY KEY,
  actor_scope TEXT NOT NULL,
  endpoint_path TEXT NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_status SMALLINT,
  response_body_json JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC') + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS idx_idempotency_exp ON idempotency_keys (expires_at);

-- 11. Transactional Outbox
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status outbox_status NOT NULL DEFAULT 'PENDING',
  retry_count SMALLINT NOT NULL DEFAULT 0,
  max_retries SMALLINT NOT NULL DEFAULT 5,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events (status, next_attempt_at) WHERE status = 'PENDING';

-- 12. Autovacuum-Tuned Ephemeral Tables
CREATE UNLOGGED TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  messenger_token TEXT UNIQUE,
  attempts SMALLINT NOT NULL DEFAULT 0,
  is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
) WITH (
  fillfactor = 70,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_vacuum_cost_limit = 1000
);
CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose ON otp_challenges (phone_e164, purpose, expires_at);

CREATE UNLOGGED TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hit_count INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
) WITH (
  fillfactor = 70,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_vacuum_cost_limit = 1000
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_exp ON rate_limit_buckets (expires_at);

CREATE UNLOGGED TABLE IF NOT EXISTS prompt_metrics_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
) WITH (
  fillfactor = 70,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_vacuum_cost_limit = 1000
);
CREATE INDEX IF NOT EXISTS idx_metrics_buffer ON prompt_metrics_buffer (prompt_id, metric_type);
`;

async function runMigration() {
  logger.info({ db: DATABASE_URL.replace(/:[^:@]+@/, ':***@') }, 'Connecting to remote PostgreSQL');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    logger.info('Executing DDL migrations...');
    await client.query(DDL);

    // Idempotent column migrations for existing databases
    await client.query(`
      ALTER TABLE user_copied_prompts ADD COLUMN IF NOT EXISTS custom_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS target_role TEXT NOT NULL DEFAULT 'OPERATOR';
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC');
      ALTER TABLE prompts ADD COLUMN IF NOT EXISTS is_ai_enriched BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE ad_network_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC');
      ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC');
      DO $$ BEGIN
        ALTER TABLE system_settings ADD CONSTRAINT uq_system_settings_key UNIQUE (setting_key);
      EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_prompts_is_ai_enriched ON prompts (is_ai_enriched);
      CREATE INDEX IF NOT EXISTS idx_prompts_published_enriched ON prompts (is_published, is_ai_enriched);

      -- Harmonize all character varying columns to text (as per production schema upgrade)
      DO $$
      DECLARE
        col_rec RECORD;
      BEGIN
        FOR col_rec IN (
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND data_type = 'character varying'
        ) LOOP
          EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE text', col_rec.table_name, col_rec.column_name);
        END LOOP;
      END $$;
    `);
    logger.info('All DDL migrations executed successfully.');

    // Seed default Categories if empty
    const catCheck = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      logger.info('Seeding initial categories...');
      const categoriesSeed = [
        ['photo-editing', 'ادیت و ترمیم عکس', 'پرامپت‌های ادیت، رتوش و تغییر استایل عکس', 'Camera', 'image_edit', 1],
        ['image-generation', 'تولید تصویر خلاقانه', 'پرامپت‌های ساخت عکس‌های فتورئال و لوگو با هوش مصنوعی', 'Sparkles', 'text_to_image', 2],
        ['content-writing', 'تولید محتوا و کپشن', 'پرامپت‌های نگارش مقاله، کپشن اینستاگرام و ایمیل مارکتینگ', 'PenTool', 'text_writing', 3],
        ['excel-data', 'اکسل و تحلیل داده', 'فرمول‌نویسی پیشرفته اکسل و استخراج داده', 'Table', 'data_structuring', 4],
        ['reels-voice', 'سناریو ریلز و صدا', 'سناریوهای ویدیویی جذاب و پرامپت‌های صوتی', 'Video', 'video_audio', 5],
        ['coding-tech', 'برنامه‌نویسی و SQL', 'دیباگینگ، تولید کد، کوئری‌های بهینه و حل مسائل فنی', 'Code', 'code_tech', 6]
      ];

      for (const cat of categoriesSeed) {
        await client.query(
          `INSERT INTO categories (slug, title_fa, description_fa, icon_name, primary_modality, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (slug) DO NOTHING`,
          cat
        );
      }
      logger.info('Categories seeded.');
    }

    // Seed Deterministic Superadmin account ('00000000-0000-0000-0000-000000000001')
    const adminPhone = process.env.ADMIN_PHONE || '+989123456789';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SuperSecretPromptjoo2026!';
    const superadminId = '00000000-0000-0000-0000-000000000001';
    const passwordHash = await argon2.hash(adminPassword);

    const adminCheck = await client.query('SELECT id, phone_e164 FROM users WHERE id = $1 OR phone_e164 = $2', [superadminId, adminPhone]);
    if (adminCheck.rows.length === 0) {
      logger.info({ adminPhone, superadminId }, 'Seeding deterministic Superadmin account...');
      await client.query(
        `INSERT INTO users (id, phone_e164, password_hash, is_phone_verified, role)
         VALUES ($1, $2, $3, true, 'ADMIN')`,
        [superadminId, adminPhone, passwordHash]
      );
      logger.info('Deterministic Superadmin account seeded successfully.');
    } else {
      await client.query(
        `UPDATE users 
         SET id = $1, password_hash = $2, is_phone_verified = true, role = 'ADMIN'
         WHERE id = $1 OR phone_e164 = $3`,
        [superadminId, passwordHash, adminPhone]
      );
    }

    // Seed default system_settings if empty
    const settingsCheck = await client.query('SELECT COUNT(*) FROM system_settings');
    if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
      logger.info('Seeding default system settings...');
      const defaultSettings = [
        ['sms_provider_config', 'infrastructure', 'تنظیمات درگاه پیامک ملی پیامک', { provider: 'melipayamak', is_active: true, simulation_mode: true }],
        ['llm_provider_config', 'ai_engines', 'تنظیمات موتورهای هوش مصنوعی پردازش پرامپت', { provider: 'gemini', model: 'gemini-1.5-flash', is_active: false }]
      ];
      for (const s of defaultSettings) {
        await client.query(
          `INSERT INTO system_settings (setting_key, category, description_fa, setting_value)
           VALUES ($1, $2, $3, $4) ON CONFLICT (setting_key) DO NOTHING`,
          [s[0], s[1], s[2], JSON.stringify(s[3])]
        );
      }
      logger.info('Default system settings seeded.');
    }

    // Seed default Yektanet / Tapsell Ad Network configs
    const adCheck = await client.query('SELECT COUNT(*) FROM ad_network_configs');
    if (parseInt(adCheck.rows[0].count, 10) === 0) {
      logger.info('Seeding default Yektanet & Tapsell ad configurations...');
      const defaultAds = [
        ['POST_COPY_DRAWER', 'yektanet', 'yn-drawer-slot-1', '<!-- Yektanet Drawer Banner Script -->'],
        ['FEED_NATIVE_CARD_3', 'yektanet', 'yn-feed-card-3', '<!-- Yektanet Native Feed Card Script -->'],
        ['STICKY_FOOTER_BANNER', 'tapsell', 'tapsell-footer-banner', '<!-- Tapsell Footer Script -->']
      ];
      for (const ad of defaultAds) {
        await client.query(
          `INSERT INTO ad_network_configs (placement_slot, provider, zone_id, script_tag_html)
           VALUES ($1, $2, $3, $4)`,
          ad
        );
      }
      logger.info('Default ad configurations seeded.');
    }

  } catch (err) {
    logger.error({ err }, 'Migration error');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
