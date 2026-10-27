import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compilePrompt, stitchAtomicBlocks, resolveSlotValue } from '../src/index.ts';
import type { PromptSlot, SavedContextProfile } from '@promptjoo/contracts';

describe('Prompt Compiler Unit Tests', () => {
  const sampleSlot: PromptSlot = {
    slot_key: 'target_audience',
    label_fa: 'مخاطب هدف',
    placeholder_fa: '',
    input_type: 'SHORT_TEXT',
    default_value_en: 'young professionals',
    profile_binding_key: 'TARGET_AUDIENCE',
    preset_options: [],
    options: [],
    is_required: false,
    priority: 1
  };

  it('resolves slot priority: user custom > personal memory > default', () => {
    const profile: Partial<SavedContextProfile> = {
      target_audience: 'Iranian university students'
    };

    // 1. User custom wins
    const custom = resolveSlotValue(sampleSlot, 'freelancers', profile);
    assert.strictEqual(custom, 'freelancers');

    // 2. Personal memory wins if custom is empty
    const fromProfile = resolveSlotValue(sampleSlot, '', profile);
    assert.strictEqual(fromProfile, 'Iranian university students');

    // 3. Default wins if profile is empty
    const fallback = resolveSlotValue(sampleSlot, undefined, {});
    assert.strictEqual(fallback, 'young professionals');
  });

  it('compiles template and replaces multiple occurrences of slot keys', () => {
    const template = 'Write a viral post for {{target_audience}}. Remember to speak directly to {target_audience}.';
    const slots = [sampleSlot];
    const result = compilePrompt(template, slots, { target_audience: 'digital marketers' });

    assert.strictEqual(
      result.compiledText,
      'Write a viral post for digital marketers. Remember to speak directly to digital marketers.'
    );
  });

  it('appends Persian language directive for text_writing when forceFarsiOutput is true', () => {
    const template = 'Write an email about {{topic}}';
    const slots: PromptSlot[] = [{
      slot_key: 'topic',
      label_fa: 'موضوع',
      placeholder_fa: '',
      input_type: 'SHORT_TEXT',
      default_value_en: 'AI productivity',
      profile_binding_key: 'NONE',
      preset_options: [],
      options: [],
      is_required: false,
      priority: 1
    }];

    const result = compilePrompt(template, slots, {}, undefined, {
      forceFarsiOutput: true,
      modality: 'text_writing'
    });

    assert.ok(result.compiledText.includes('[OUTPUT LANGUAGE DIRECTIVE'));
  });

  it('appends visual directive when Farsi appears in image generation slots', () => {
    const template = 'Photograph of a {{subject}} in Tehran';
    const slots: PromptSlot[] = [{
      slot_key: 'subject',
      label_fa: 'سوژه',
      placeholder_fa: '',
      input_type: 'SHORT_TEXT',
      default_value_en: 'modern building',
      profile_binding_key: 'NONE',
      preset_options: [],
      options: [],
      is_required: false,
      priority: 1
    }];

    const result = compilePrompt(template, slots, { subject: 'برج میلاد' }, undefined, {
      modality: 'image_edit'
    });

    assert.ok(result.compiledText.includes('[VISUAL DIRECTIVE'));
  });

  it('stitches atomic blocks into a clean structured template', () => {
    const stitched = stitchAtomicBlocks({
      role: 'Senior Copywriter',
      task: 'Write 3 catchy headline variations',
      constraint: 'Under 10 words each',
      format: 'Numbered bullet list'
    });

    assert.ok(stitched.includes('[ROLE]\nSenior Copywriter'));
    assert.ok(stitched.includes('[TASK]\nWrite 3 catchy headline variations'));
    assert.ok(stitched.includes('[CONSTRAINTS]\nUnder 10 words each'));
    assert.ok(stitched.includes('[OUTPUT FORMAT]\nNumbered bullet list'));
  });
});
