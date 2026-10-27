import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PromptSlotSchema,
  SavedContextProfileSchema,
  SendOtpRequestSchema,
  AdPlacementSlotSchema
} from '../dist/src/index.js';

describe('Contracts Schema Validation Tests', () => {
  it('validates a valid prompt slot schema', () => {
    const validSlot = {
      slot_key: 'target_audience',
      label_fa: 'مخاطب هدف',
      placeholder_fa: 'مثال: دانشجویان',
      input_type: 'SHORT_TEXT',
      default_value_en: 'university students',
      profile_binding_key: 'TARGET_AUDIENCE',
      preset_options: [
        { label_fa: 'دانشجویان', value_en: 'university students' },
        { label_fa: 'مدیران', value_en: 'business executives' }
      ]
    };
    const parsed = PromptSlotSchema.parse(validSlot);
    assert.strictEqual(parsed.slot_key, 'target_audience');
    assert.strictEqual(parsed.profile_binding_key, 'TARGET_AUDIENCE');
  });

  it('validates and applies defaults for SavedContextProfileSchema', () => {
    const parsed = SavedContextProfileSchema.parse({
      brand_name: 'پوروشکا'
    });
    assert.strictEqual(parsed.brand_name, 'پوروشکا');
    assert.strictEqual(parsed.brand_tone, 'CASUAL');
    assert.strictEqual(parsed.target_audience, '');
  });

  it('validates valid Iranian phone numbers and rejects invalid ones', () => {
    assert.doesNotThrow(() => {
      SendOtpRequestSchema.parse({ phone: '09123456789' });
    });
    assert.doesNotThrow(() => {
      SendOtpRequestSchema.parse({ phone: '+989123456789' });
    });
    assert.throws(() => {
      SendOtpRequestSchema.parse({ phone: '12345' });
    });
  });

  it('validates ad placement slots enum', () => {
    assert.strictEqual(AdPlacementSlotSchema.parse('POST_COPY_DRAWER'), 'POST_COPY_DRAWER');
    assert.throws(() => {
      AdPlacementSlotSchema.parse('INVALID_SLOT');
    });
  });
});
