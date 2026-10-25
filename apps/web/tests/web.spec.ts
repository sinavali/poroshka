import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compilePrompt } from '@promptjoo/prompt-compiler';

describe('Web Application Logic Tests', () => {
  it('correctly compiles prompt templates with custom slot values', () => {
    const template = 'Write a story about {{character_name}} in {{setting}}.';
    const slots = [
      {
        slot_key: 'character_name',
        label_fa: 'نام شخصیت',
        placeholder_fa: '',
        input_type: 'text' as const,
        default_value_en: 'Rostam',
        preset_options: [],
        options: [],
        is_required: true,
        priority: 1,
        profile_binding_key: 'NONE' as const
      },
      {
        slot_key: 'setting',
        label_fa: 'مکان',
        placeholder_fa: '',
        input_type: 'text' as const,
        default_value_en: 'ancient Persia',
        preset_options: [],
        options: [],
        is_required: true,
        priority: 2,
        profile_binding_key: 'NONE' as const
      }
    ];

    const result = compilePrompt(template, slots, { character_name: 'Sohrab' });
    assert.equal(result.compiledText, 'Write a story about Sohrab in ancient Persia.');
  });

  it('bilingual isolation keeps English code intact while applying Persian output directive', () => {
    const template = 'Explain the concept of {{topic}}.';
    const slots = [
      {
        slot_key: 'topic',
        label_fa: 'موضوع',
        placeholder_fa: '',
        input_type: 'text' as const,
        default_value_en: 'machine learning',
        preset_options: [],
        options: [],
        is_required: true,
        priority: 1,
        profile_binding_key: 'NONE' as const
      }
    ];

    const result = compilePrompt(template, slots, {}, {}, {
      forceFarsiOutput: true,
      modality: 'text_writing'
    });

    assert.ok(result.compiledText.includes('Explain the concept of machine learning.'));
    assert.ok(result.compiledText.includes('OUTPUT LANGUAGE DIRECTIVE'));
  });
});
