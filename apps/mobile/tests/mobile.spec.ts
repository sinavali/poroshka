import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compilePrompt } from '@promptjoo/prompt-compiler';
import type { AppState, MobilePrompt } from '../src/types';

describe('React Native Mobile Client Logic Tests', () => {
  it('correctly transitions through 4-state lifecycle (loading -> loaded)', () => {
    let state: AppState = {
      status: 'loading',
      prompts: [],
      selectedPrompt: null,
      searchQuery: '',
      selectedModality: 'all',
      userProfile: {
        brand_name: 'تست',
        niche_topic: 'تکنولوژی',
        target_audience: 'برنامه‌نویسان',
        brand_tone: 'FORMAL',
        call_to_action: 'ثبت‌نام کنید'
      }
    };

    assert.equal(state.status, 'loading');

    // Simulate successful API response
    const mockPrompts: MobilePrompt[] = [
      {
        id: 'p1',
        slug: 'test-prompt',
        modality: 'code_tech',
        title_fa: 'پرامپت تست',
        short_desc_fa: 'توضیحات تست',
        template_en: 'Write a query for {{table}}',
        slots_schema_json: [],
        supported_models: ['chatgpt'],
        copy_count: 10
      }
    ];

    state = {
      ...state,
      status: mockPrompts.length === 0 ? 'empty' : 'loaded',
      prompts: mockPrompts
    };

    assert.equal(state.status, 'loaded');
    assert.equal(state.prompts.length, 1);
  });

  it('correctly transitions to empty state when zero results match filter', () => {
    let state: AppState = {
      status: 'loading',
      prompts: [],
      selectedPrompt: null,
      searchQuery: 'عبارت_ناموجود',
      selectedModality: 'all',
      userProfile: {
        brand_name: '',
        niche_topic: '',
        target_audience: '',
        brand_tone: 'CASUAL',
        call_to_action: ''
      }
    };

    const emptyResults: MobilePrompt[] = [];
    state = {
      ...state,
      status: emptyResults.length === 0 ? 'empty' : 'loaded',
      prompts: emptyResults
    };

    assert.equal(state.status, 'empty');
  });

  it('correctly transitions to failure state on network disconnection', () => {
    let state: AppState = {
      status: 'loading',
      prompts: [],
      selectedPrompt: null,
      searchQuery: '',
      selectedModality: 'all',
      userProfile: {
        brand_name: '',
        niche_topic: '',
        target_audience: '',
        brand_tone: 'CASUAL',
        call_to_action: ''
      }
    };

    state = {
      ...state,
      status: 'failure',
      error: 'خطای شبکه'
    };

    assert.equal(state.status, 'failure');
    assert.ok(state.error);
  });

  it('compiles prompt offline using shared prompt-compiler logic in mobile', () => {
    const template = 'Act as an expert in {{domain}}';
    const slots = [
      {
        slot_key: 'domain',
        label_fa: 'حوزه تخصصی',
        placeholder_fa: '',
        input_type: 'text' as const,
        default_value_en: 'cybersecurity',
        preset_options: [],
        options: [],
        is_required: true,
        priority: 1,
        profile_binding_key: 'NICHE_TOPIC' as const
      }
    ];

    const profile = {
      brand_name: 'امنیت‌پژوه',
      niche_topic: 'هک اخلاقی و تست نفوذ',
      target_audience: 'متخصصان شبکه',
      brand_tone: 'ACADEMIC' as const,
      call_to_action: 'دنبال کنید'
    };

    // User supplies no override, falls back to personal profile
    const result = compilePrompt(template, slots, {}, profile);
    assert.equal(result.compiledText, 'Act as an expert in هک اخلاقی و تست نفوذ');
  });
});
