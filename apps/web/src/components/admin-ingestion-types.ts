export interface LlmConfigState {
  provider: 'avalai' | 'openai' | 'anthropic' | 'google' | 'custom';
  api_key: string;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout_seconds?: number;
  is_active: boolean;
}

export interface AiResultSlot {
  slot_key: string;
  label_fa: string;
  default_value?: string;
  is_required?: boolean;
}

export interface AiEnrichResult {
  title_fa: string;
  short_desc_fa: string;
  direct_answer_summary_fa: string;
  category_slug: string;
  modality: string;
  template_en: string;
  slots_schema_json: AiResultSlot[];
  supported_models?: string[];
  search_keywords_fa?: string[];
  quality_score?: number;
}

export interface BulkStatusState {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED' | 'FAILED';
  total_in_db: number;
  unenriched_count: number;
  enriched_count: number;
  processed_count: number;
  failed_count: number;
  progress_percentage: number;
  current_slug: string | null;
  provider_used: string;
  model_used: string;
  batch_size: number;
  delay_ms: number;
  started_at: string | null;
  last_error: string | null;
  items_per_minute: number;
  estimated_remaining_seconds: number | null;
}

export const PROVIDER_OPTIONS: Array<{
  id: LlmConfigState['provider'];
  label: string;
  sublabel: string;
  defaultBaseUrl: string;
  defaultModel: string;
}> = [
  {
    id: 'avalai',
    label: 'AvalAI (درگاه اول آی‌آی)',
    sublabel: 'درگاه ایرانی پشتیبان مدل‌های جهانی بدون تحریم (DeepSeek, GPT-4o, Claude)',
    defaultBaseUrl: 'https://api.avalai.ir/v1',
    defaultModel: 'deepseek-v4.1-flash'
  },
  {
    id: 'openai',
    label: 'OpenAI (چت‌جی‌پی‌تی رسمی)',
    sublabel: 'اتصال به API رسمی شرکت OpenAI (مدل‌های gpt-4o, gpt-4o-mini)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini'
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude (کلاد)',
    sublabel: 'اتصال به API رسمی شرکت آنتروپیک (مدل‌های Claude 3.5 Sonnet, Haiku)',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest'
  },
  {
    id: 'google',
    label: 'Google AI Studio (جمینی)',
    sublabel: 'درگاه رسمی جمینی گوگل با کارایی بالا (مدل‌های Gemini 1.5 Flash/Pro)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash'
  },
  {
    id: 'custom',
    label: 'سرویس سفارشی (Custom / Ollama)',
    sublabel: 'اتصال به OpenRouter، Ollama، Groq، vLLM یا هر اندپوینت سفارشی',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest'
  }
];
