import type { PromptSlot, SavedContextProfile } from '../../packages/contracts/src/index.ts';

export interface MobilePrompt {
  id: string;
  slug: string;
  modality: string;
  category_title_fa?: string;
  title_fa: string;
  short_desc_fa: string;
  template_en: string;
  slots_schema_json: PromptSlot[];
  supported_models: string[];
  copy_count: number;
}

export interface AppState {
  status: 'loading' | 'empty' | 'loaded' | 'failure';
  prompts: MobilePrompt[];
  selectedPrompt: MobilePrompt | null;
  searchQuery: string;
  selectedModality: string;
  userProfile: SavedContextProfile;
  error?: string;
}
