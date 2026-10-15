import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const PromptModalitySchema = z.enum([
  'image_edit',
  'text_to_image',
  'text_writing',
  'data_structuring',
  'video_audio',
  'code_tech'
]).openapi('PromptModality');

export const PromptBlockTypeSchema = z.enum([
  'ROLE',
  'TASK',
  'CONSTRAINT',
  'FORMAT'
]).openapi('PromptBlockType');

export const BilingualPresetOptionSchema = z.object({
  label_fa: z.string().min(1).max(60),
  value_en: z.string().min(1).max(160)
}).openapi('BilingualPresetOption');

export const PromptSlotSchema = z.object({
  slot_key: z.string().regex(/^[a-z0-9_]+$/),
  label_fa: z.string().min(1).max(80),
  placeholder_fa: z.string().max(120),
  input_type: z.enum(['SHORT_TEXT', 'LONG_TEXT', 'SELECT_CHIP']),
  default_value_en: z.string().min(1),
  profile_binding_key: z.enum([
    'NONE', 'BRAND_NAME', 'NICHE_TOPIC', 'TARGET_AUDIENCE', 'BRAND_TONE', 'CALL_TO_ACTION'
  ]).default('NONE'),
  preset_options: z.array(BilingualPresetOptionSchema).default([])
}).openapi('PromptSlot');

export const SavedContextProfileSchema = z.object({
  brand_name: z.string().max(80).default(''),
  niche_topic: z.string().max(120).default(''),
  target_audience: z.string().max(140).default(''),
  brand_tone: z.enum(['CASUAL', 'FORMAL', 'ENTHUSIASTIC', 'ACADEMIC', 'HUMOROUS']).default('CASUAL'),
  call_to_action: z.string().max(100).default('')
}).openapi('SavedContextProfile');

export const CategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2).max(80),
  title_fa: z.string().min(2).max(120),
  description_fa: z.string(),
  icon_name: z.string().max(60),
  primary_modality: PromptModalitySchema,
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime()
}).openapi('Category');

export const MediaCheckpointPayloadSchema = z.object({
  preview_after_webp_url: z.string().url().nullable(),
  preview_before_webp_url: z.string().url().nullable(),
  preview_blurhash: z.string().min(6).max(64).nullable(),
  preview_alt_fa: z.string().max(220).nullable()
}).openapi('MediaCheckpointPayload');

export const PromptListItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2).max(160),
  modality: PromptModalitySchema,
  category_slug: z.string(),
  category_title_fa: z.string(),
  title_fa: z.string().min(5).max(200),
  short_desc_fa: z.string().min(10).max(320),
  requires_image_upload: z.boolean(),
  supported_models: z.array(z.string()),
  preview_after_webp_url: z.string().nullable(),
  preview_before_webp_url: z.string().nullable(),
  preview_blurhash: z.string().nullable(),
  slot_count: z.number().int(),
  copy_count: z.number().int(),
  view_count: z.number().int(),
  trending_score_7d: z.number(),
  created_at: z.string().datetime()
}).openapi('PromptListItem');

export const PromptDetailSchema = PromptListItemSchema.extend({
  direct_answer_summary_fa: z.string(),
  search_keywords_fa: z.string(),
  template_en: z.string().min(10),
  slots_schema_json: z.array(PromptSlotSchema),
  faq_schema_json: z.array(z.object({
    q_fa: z.string(),
    a_fa: z.string()
  })),
  preview_alt_fa: z.string().nullable(),
  is_saved: z.boolean().default(false)
}).openapi('PromptDetail');

export const AtomicBlockSchema = z.object({
  id: z.string().uuid(),
  block_type: PromptBlockTypeSchema,
  modality: PromptModalitySchema,
  title_fa: z.string().min(2).max(160),
  block_template_en: z.string().min(10),
  slots_schema_json: z.array(PromptSlotSchema).default([]),
  usage_count: z.number().int().default(0)
}).openapi('AtomicBlock');
