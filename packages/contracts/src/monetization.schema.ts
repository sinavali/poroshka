import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { PromptModalitySchema } from './catalog.schema.ts';

extendZodWithOpenApi(z);

export const AdPlacementSlotSchema = z.enum([
  'POST_COPY_DRAWER',
  'FEED_NATIVE_CARD_3',
  'STICKY_FOOTER_BANNER'
]).openapi('AdPlacementSlot');

export const AdNetworkConfigSchema = z.object({
  id: z.string().uuid(),
  placement_slot: AdPlacementSlotSchema,
  provider: z.enum(['yektanet', 'tapsell']),
  zone_id: z.string(),
  script_tag_html: z.string().nullable(),
  target_modalities: z.array(PromptModalitySchema).nullable(),
  is_active: z.boolean()
}).openapi('AdNetworkConfig');

export const AdClickEventSchema = z.object({
  placement_slot: AdPlacementSlotSchema,
  provider: z.enum(['yektanet', 'tapsell']),
  zone_id: z.string(),
  client_uuid: z.string().uuid()
}).openapi('AdClickEvent');
