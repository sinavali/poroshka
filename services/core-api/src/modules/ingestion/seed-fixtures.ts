import crypto from 'node:crypto';
import pg from 'pg';
import { logger } from '../../infrastructure/observability/pino-logger.ts';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Generate dummy 1024-d unit vector for vector column compatibility
function generateMockEmbedding(seedStr: string): string {
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
  const normalized = vector.map(v => (v / norm).toFixed(6));
  return `[${normalized.join(',')}]`;
}

export const SEED_PROMPTS = [
  // 1. Photo Editing (image_edit)
  {
    slug: 'vintage-film-retouch',
    modality: 'image_edit',
    category_slug: 'photo-editing',
    requires_image_upload: true,
    supported_models: ['gemini', 'chatgpt'],
    title_fa: 'تبدیل عکس به استایل نگاتیو فیلم ۳۵ میلی‌متری',
    short_desc_fa: 'اعمال فیلتر نوستالژیک رنگ‌های گرم Kodak Portra 400 همراه با گرین طبیعی و نورپردازی ملایم طلایی.',
    direct_answer_summary_fa: 'این پرامپت برای رتوش تصاویر پرتره و مناظر شهری با استایل فیلم آنالوگ طراحی شده است. بدون برهم زدن بافت طبیعی پوست، رنگ‌ها را کالیبره می‌کند.',
    search_keywords_fa: 'ادیت عکس نگاتیو کداک عکاسی آنالوگ گرین فیلم رتوش لایتروم فتوشاپ',
    template_en: 'Apply a professional 35mm vintage film photograph color grade inspired by Kodak Portra 400 to the uploaded image. Enhance warm pastel skin tones, add subtle organic film grain, soften high-contrast specular highlights, and simulate a golden-hour lens flare with a focal aperture of f/1.8. Maintain skin texture integrity without over-smoothing.',
    slots_schema_json: [
      {
        slot_key: 'film_stock',
        label_fa: 'نوع فیلم عکاسی',
        input_type: 'select',
        options: ['Kodak Portra 400', 'Fujifilm Superia 400', 'Ilford HP5 Plus Black & White'],
        default_value: 'Kodak Portra 400',
        is_required: true,
        priority: 1
      },
      {
        slot_key: 'grain_intensity',
        label_fa: 'میزان گرین فیلم',
        input_type: 'select',
        options: ['Low Subtle Grain', 'Medium Classic 35mm Grain', 'Heavy Vintage Grain'],
        default_value: 'Medium Classic 35mm Grain',
        is_required: false,
        priority: 2
      }
    ],
    preview_alt_fa: 'نمونه تصویر ادیت شده با استایل فیلم کداک و رنگ‌های گرم',
    preview_after_webp_url: 'https://poroshka.ir/assets/samples/vintage-film-after.webp',
    faq_schema_json: [
      { question: 'آیا نیاز است عکس باکیفیت آپلود کنم؟', answer: 'بله، هرچه وضوح عکس اولیه بالاتر باشد، خروجی بدون افت کیفیت و طبیعی‌تر خواهد بود.' },
      { question: 'کدام هوش مصنوعی بهترین نتیجه را می‌دهد؟', answer: 'مدل‌های چندحالته Gemini 1.5 Pro و GPT-4o Vision بهترین درک رنگ و ادیت را دارند.' }
    ],
    copy_count: 1420,
    view_count: 5890,
    trending_score_7d: 89.4
  },

  // 2. Text to Image (text_to_image)
  {
    slug: 'iranian-cyberpunk-tehran',
    modality: 'text_to_image',
    category_slug: 'image-generation',
    requires_image_upload: false,
    supported_models: ['midjourney', 'gemini', 'flux'],
    title_fa: 'معماری سایبرپانک تلفیقی تهران قدیم در سال ۲۰۹۹',
    short_desc_fa: 'طراحی صحنه‌ای نئونی از میدان آزادی یا برج میلاد ترکیب‌شده با المان‌های آینده‌نگرانه و کاشی‌کاری‌های سنتی.',
    direct_answer_summary_fa: 'پرامپت ساخت تصاویر مفهومی سایبرپانک ایرانی با تلفیق هنر اسلیمی، نورهای نئون فیروزه‌ای و لاجوردی و باران شبانه سینمایی.',
    search_keywords_fa: 'تصویر هوش مصنوعی سایبرپانک تهران معماری سنتی میدجورنی فلوکس نئون برج میلاد',
    template_en: 'A cinematic wide-angle shot of futuristic cyberpunk Tehran in the year 2099. Featuring {{landmark}} illuminated with neon turquoise, saffron yellow, and deep azure blue holograms. Rain-slicked asphalt reflecting traditional Persian mosaic tessellations and flying autonomous taxi drones. Ultra-detailed 8k, volumetric atmospheric fog, Unreal Engine 5 render style, photorealistic lighting, shot on 35mm Arri Alexa.',
    slots_schema_json: [
      {
        slot_key: 'landmark',
        label_fa: 'نماد یا بنای شهری',
        input_type: 'select',
        options: ['Azadi Tower with holographic wings', 'Milad Tower piercing futuristic cloudline', 'Si-o-se-pol bridge with cybernetic waterways', 'Golestan Palace with cyber-dome glass architecture'],
        default_value: 'Azadi Tower with holographic wings',
        is_required: true,
        priority: 1
      },
      {
        slot_key: 'aspect_ratio',
        label_fa: 'نسبت ابعاد تصویر',
        input_type: 'select',
        options: ['--ar 16:9', '--ar 9:16', '--ar 1:1', '--ar 21:9'],
        default_value: '--ar 16:9',
        is_required: false,
        priority: 2
      }
    ],
    preview_alt_fa: 'طراحی نئونی برج آزادی در تهران سال ۲۰۹۹ با کاشی‌کاری‌های نئونی',
    preview_after_webp_url: 'https://poroshka.ir/assets/samples/cyberpunk-tehran.webp',
    faq_schema_json: [
      { question: 'آیا در میدجورنی نسخه ۶ کار می‌کند؟', answer: 'بله، این پرامپت کاملاً با Midjourney v6 و Flux.1 Dev سازگار است.' }
    ],
    copy_count: 2840,
    view_count: 9420,
    trending_score_7d: 95.8
  },

  // 3. Content Writing (text_writing)
  {
    slug: 'instagram-viral-hook-caption',
    modality: 'text_writing',
    category_slug: 'content-writing',
    requires_image_upload: false,
    supported_models: ['chatgpt', 'gemini', 'claude'],
    title_fa: 'کپشن‌نویسی ویروسی اینستاگرام با قلاب ۳ ثانیه‌ای اول',
    short_desc_fa: 'نگارش کپشن‌های ترغیب‌کننده با فرمول استاندارد AIDA، قلاب توقف اسکرول و دعوت به اقدام (CTA) هدفمند.',
    direct_answer_summary_fa: 'این پرامپت به شما کمک می‌کند برای پیج‌های فروشگاهی و شخصی کپشن‌های حرفه‌ای، با لحن دلخواه و هماهنگ با الگوریتم اکسپلور بنویسید.',
    search_keywords_fa: 'کپشن اینستاگرام قلاب قلاب طلایی سناریو اکسپلور فروش محتوا جذب مخاطب کپی رایتینگ',
    template_en: 'Act as an elite copywriter specializing in viral Instagram content for the Iranian audience. Write a compelling caption in natural, modern Persian about "{{topic_title}}". Target audience: {{target_audience}}. Brand tone: {{brand_tone}}. Structure: 1) Stop-the-scroll hook (first 2 lines before "more"), 2) Relatable storytelling problem breakdown, 3) 3 actionable high-value bullet points, 4) Irresistible Call to Action (CTA): {{call_to_action}}, 5) 8 high-intent relevant Persian hashtags.',
    slots_schema_json: [
      {
        slot_key: 'topic_title',
        label_fa: 'موضوع پست یا محصول',
        input_type: 'text',
        default_value: '۳ اشتباه رایج که مانع رشد پیج اینستاگرام می‌شود',
        placeholder: 'مثلاً: راهنمای انتخاب لپ‌تاپ دانشجویی',
        is_required: true,
        priority: 1
      },
      {
        slot_key: 'target_audience',
        label_fa: 'مخاطب هدف',
        input_type: 'text',
        default_value: 'تولیدکنندگان محتوا و ادمین‌های پیج‌های کسب‌وکار',
        is_required: false,
        priority: 2
      },
      {
        slot_key: 'brand_tone',
        label_fa: 'لحن برند',
        input_type: 'select',
        options: ['صمیمی و دوستانه', 'رسمی و متخصص', 'انرژیک و الهام‌بخش', 'طنز و چالش‌برانگیز'],
        default_value: 'صمیمی و دوستانه',
        is_required: false,
        priority: 3
      },
      {
        slot_key: 'call_to_action',
        label_fa: 'دعوت به اقدام (CTA)',
        input_type: 'text',
        default_value: 'این پست را ذخیره کن و در کامنت بگو کدوم اشتباه رو انجام دادی؟',
        is_required: false,
        priority: 4
      }
    ],
    preview_alt_fa: 'قالب استاندارد کپشن‌نویسی ویروسی اینستاگرام',
    faq_schema_json: [
      { question: 'آیا برای متن فارسی نیاز به ویرایش دارد؟', answer: 'خیر، پرامپت به طور خودکار دستور تولید فارسی روان با رعایت نیم‌فاصله‌ها را اعمال می‌کند.' }
    ],
    copy_count: 5120,
    view_count: 14200,
    trending_score_7d: 99.2
  },

  // 4. Excel & Data Structuring (data_structuring)
  {
    slug: 'advanced-excel-xlookup-extractor',
    modality: 'data_structuring',
    category_slug: 'excel-data',
    requires_image_upload: false,
    supported_models: ['chatgpt', 'claude', 'gemini'],
    title_fa: 'فرمول پیشرفته XLOOKUP و تفکیک داده‌های پیچیده در اکسل',
    short_desc_fa: 'فرمول‌نویسی خودکار برای جستجوی چندشرطی، پاکسازی کدهای ملی و شماره‌های تلفن همراه ایرانی.',
    direct_answer_summary_fa: 'راهنمای جامع فرمول‌نویسی اکسل جهت ترکیب جداول، تطبیق ستون‌ها و اصلاح فرمت ارقام فارسی به انگلیسی بدون ارور N/A#.',
    search_keywords_fa: 'فرمول اکسل XLOOKUP مغایرت گیری تطبیق دو ستون کد ملی شماره موبایل پاکسازی داده اکسل',
    template_en: 'Act as an expert Microsoft Excel and Google Sheets data analyst. Provide a robust, non-volatile formula solution for the following scenario: "{{data_challenge}}". The input data contains columns: {{column_names}}. Ensure the formula handles missing records gracefully with IFERROR, standardizes Persian/Arabic digits, and returns clear step-by-step instructions in Persian explaining how to apply it across 10,000+ rows efficiently.',
    slots_schema_json: [
      {
        slot_key: 'data_challenge',
        label_fa: 'مسئله یا نیاز داده‌ای',
        input_type: 'text',
        default_value: 'تطبیق شماره موبایل و استخراج جمع مبالغ تراکنش‌های موفق بین دو شیت مجزا',
        is_required: true,
        priority: 1
      },
      {
        slot_key: 'column_names',
        label_fa: 'نام ستون‌های کلیدی',
        input_type: 'text',
        default_value: 'ستون A: شماره تماس، ستون B: تاریخ شمسی، ستون C: مبلغ تراکنش',
        is_required: true,
        priority: 2
      }
    ],
    preview_alt_fa: 'نمونه کد فرمول پیشرفته اکسل جهت تطبیق داده‌ها',
    faq_schema_json: [
      { question: 'آیا این فرمول در نسخه‌های قدیمی اکسل (۲۰۱۶ یا ۲۰۱۹) کار می‌کند؟', answer: 'در صورت درخواست، مدل جایگزین‌های INDEX-MATCH سازگار با نسخه‌های قدیمی را نیز ارائه می‌دهد.' }
    ],
    copy_count: 1890,
    view_count: 6730,
    trending_score_7d: 87.5
  },

  // 5. Reels & Video Scripting (video_audio)
  {
    slug: 'reels-15s-problem-solution-script',
    modality: 'video_audio',
    category_slug: 'reels-voice',
    requires_image_upload: false,
    supported_models: ['chatgpt', 'gemini', 'claude'],
    title_fa: 'سناریوی ویدیویی ۱۵ ثانیه‌ای ریلز (فرمول مشکل-راه‌حل-نتیجه)',
    short_desc_fa: 'سناریوی سریع با زاویه دوربین دقیق، متن گفتار گوینده (VO)، افکت‌های صوتی SFX و زیرنویس پویا.',
    direct_answer_summary_fa: 'این سناریو برای تولید ویدیوهای کوتاه تیک‌تاک و ریلز اینستاگرام بهینه شده تا نرخ تکمیل تماشا (Retention Rate) به حداکثر برسد.',
    search_keywords_fa: 'سناریو ریلز فیلمنامه یوتیوب شورتس ادیت ویدیو افکت صدا قلاب ویدیویی کپ کات پریمیر',
    template_en: 'Write a hyper-engaging 15-second Instagram Reel / YouTube Shorts script about "{{video_topic}}". Tone: {{brand_tone}}. Include a 3-column table: [Second 0-15, Visual / Camera Direction + On-Screen Text, Voiceover Dialogue + Sound Effect (SFX)]. Keep the hook under 2 seconds. The ending must feature a seamless looping transition.',
    slots_schema_json: [
      {
        slot_key: 'video_topic',
        label_fa: 'موضوع ویدیو',
        input_type: 'text',
        default_value: 'چطور در کمتر از ۵ دقیقه یک کاور حرفه‌ای اینستاگرام طراحی کنیم؟',
        is_required: true,
        priority: 1
      },
      {
        slot_key: 'brand_tone',
        label_fa: 'لحن ویدیو',
        input_type: 'select',
        options: ['سریع و پرانرژی', 'آموزشی گام‌به‌گام', 'طنز و کنایه‌آمیز', 'مینیمال و آرامش‌بخش'],
        default_value: 'سریع و پرانرژی',
        is_required: false,
        priority: 2
      }
    ],
    preview_alt_fa: 'جدول زمان‌بندی سناریوی ویدیویی ۱۵ ثانیه‌ای ریلز',
    faq_schema_json: [
      { question: 'آیا موسیقی پیشنهادی هم در سناریو قرار می‌گیرد؟', answer: 'بله، استایل موزیک و افکت‌های صوتی هماهنگ در ستون SFX درج می‌شود.' }
    ],
    copy_count: 3190,
    view_count: 8100,
    trending_score_7d: 93.1
  },

  // 6. Code & Tech (code_tech)
  {
    slug: 'sql-query-performance-optimizer',
    modality: 'code_tech',
    category_slug: 'coding-tech',
    requires_image_upload: false,
    supported_models: ['chatgpt', 'claude', 'gemini'],
    title_fa: 'بهینه‌سازی و بازنویسی کوئری‌های سنگین PostgreSQL / MySQL',
    short_desc_fa: 'تحلیل EXPLAIN ANALYZE، حذف اسکن‌های کامل جدول (Seq Scan)، اضافه کردن ایندکس‌های کامپوزیت و بازنویسی با CTE.',
    direct_answer_summary_fa: 'پرامپت تخصصی برای مهندسان بک‌اند جهت دیباگ گلوگاه‌های پایگاه‌داده و رساندن زمان اجرای کوئری‌ها به زیر ۵۰ میلی‌ثانیه.',
    search_keywords_fa: 'بهینه سازی sql ایندکس پستگرس مای اس کیو ال query optimization explain analyze دیتابیس',
    template_en: 'Act as a Principal Database Reliability Engineer specializing in {{database_engine}} performance tuning. Analyze the following SQL query and execution bottleneck: "{{query_snippet}}". 1) Identify anti-patterns (e.g. redundant subqueries, missing composite indexes, N+1 issues), 2) Provide the optimized rewritten query, 3) Specify exact DDL CREATE INDEX commands required, 4) Explain the performance rationale in concise Persian.',
    slots_schema_json: [
      {
        slot_key: 'database_engine',
        label_fa: 'نوع دیتابیس',
        input_type: 'select',
        options: ['PostgreSQL 16+', 'MySQL 8.0+', 'ClickHouse', 'SQLite'],
        default_value: 'PostgreSQL 16+',
        is_required: true,
        priority: 1
      },
      {
        slot_key: 'query_snippet',
        label_fa: 'کوئری یا مشکل کندی',
        input_type: 'textarea',
        default_value: 'SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE o.created_at > NOW() - INTERVAL 30 DAY ORDER BY o.total_amount DESC LIMIT 100;',
        is_required: true,
        priority: 2
      }
    ],
    preview_alt_fa: 'نمونه کد بهینه‌سازی کوئری دیتابیس و اضافه کردن ایندکس‌های مناسب',
    faq_schema_json: [
      { question: 'آیا این پرامپت ایندکس‌های JSONB را هم پوشش می‌دهد؟', answer: 'بله، برای انواع فیلدهای JSONB و ایندکس‌های GIN نیز راهکارهای بهینه ارائه می‌دهد.' }
    ],
    copy_count: 2210,
    view_count: 7340,
    trending_score_7d: 91.0
  }
];

export const SEED_ATOMIC_BLOCKS = [
  // Text Writing
  {
    block_type: 'ROLE',
    modality: 'text_writing',
    title_fa: 'نقش: کپی‌رایتر ارشد و متخصص رشد محتوا',
    block_template_en: 'Act as an elite senior copywriter and content strategist specialized in persuasive Persian writing.',
    slots_schema_json: []
  },
  {
    block_type: 'TASK',
    modality: 'text_writing',
    title_fa: 'وظیفه: نگارش متن با ساختار استاندارد AIDA',
    block_template_en: 'Write high-converting copy about {{topic_title}} for {{target_audience}} using the AIDA framework.',
    slots_schema_json: [
      { slot_key: 'topic_title', label_fa: 'موضوع', input_type: 'text', default_value: 'موضوع اصلی', is_required: true, priority: 1 },
      { slot_key: 'target_audience', label_fa: 'مخاطب هدف', input_type: 'text', default_value: 'مخاطبان هدف', is_required: false, priority: 2 }
    ]
  },
  {
    block_type: 'CONSTRAINT',
    modality: 'text_writing',
    title_fa: 'قیود: رعایت لحن برند و نیم‌فاصله‌های استاندارد',
    block_template_en: 'Maintain {{brand_tone}} tone of voice. Strictly avoid cliches, translate technical jargon cleanly, and use proper Persian ZWNJ characters.',
    slots_schema_json: [
      { slot_key: 'brand_tone', label_fa: 'لحن برند', input_type: 'text', default_value: 'صمیمی و حرفه‌ای', is_required: false, priority: 1 }
    ]
  },
  {
    block_type: 'FORMAT',
    modality: 'text_writing',
    title_fa: 'فرمت: خروجی بخش‌بندی‌شده همراه با دعوت به اقدام',
    block_template_en: 'Format with clean Markdown headers, bullet points, and conclude with the call to action: {{call_to_action}}.',
    slots_schema_json: [
      { slot_key: 'call_to_action', label_fa: 'دعوت به اقدام', input_type: 'text', default_value: 'نظرت رو برامون بنویس', is_required: false, priority: 1 }
    ]
  },

  // Image Generation
  {
    block_type: 'ROLE',
    modality: 'text_to_image',
    title_fa: 'نقش: کارگردان هنری و متخصص پرامپت میدجورنی',
    block_template_en: 'You are a master art director and visual concept designer for photorealistic digital generation.',
    slots_schema_json: []
  },
  {
    block_type: 'TASK',
    modality: 'text_to_image',
    title_fa: 'وظیفه: طراحی تصویر مفهومی با جزئیات کامل سینمایی',
    block_template_en: 'Generate a breathtaking cinematic composition depicting {{scene_subject}} with volumetric lighting.',
    slots_schema_json: [
      { slot_key: 'scene_subject', label_fa: 'موضوع صحنه', input_type: 'text', default_value: 'صحنه خیالی آینده‌نگرانه', is_required: true, priority: 1 }
    ]
  },
  {
    block_type: 'CONSTRAINT',
    modality: 'text_to_image',
    title_fa: 'قیود: شات ۳۵ میلی‌متری بدون اعوجاج دست یا چهره',
    block_template_en: 'Shot on 35mm f/1.4 lens, 8k resolution, photorealistic textures, zero chromatic aberration, perfect anatomy.',
    slots_schema_json: []
  },
  {
    block_type: 'FORMAT',
    modality: 'text_to_image',
    title_fa: 'فرمت: پارامترهای موتور رندر و نسبت تصویر',
    block_template_en: 'Rendered in Unreal Engine 5 style, Octane render, raytracing reflections {{aspect_ratio}}.',
    slots_schema_json: [
      { slot_key: 'aspect_ratio', label_fa: 'نسبت تصویر', input_type: 'text', default_value: '--ar 16:9', is_required: false, priority: 1 }
    ]
  }
];

interface SeedSlotItem {
  slot_key: string;
  label_fa: string;
  default_value_en?: string;
  default_value?: string;
  placeholder_fa?: string;
  input_type?: string;
  is_required?: boolean;
  priority?: number;
  [key: string]: unknown;
}

export async function seedAllFixtures() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    logger.info('Seeding production prompt catalog...');
    const catMapRes = await client.query('SELECT slug, id FROM categories');
    const catMap = new Map<string, string>();
    for (const r of catMapRes.rows) {
      catMap.set(r.slug, r.id);
    }

    for (const p of SEED_PROMPTS) {
      const categoryId = catMap.get(p.category_slug);
      if (!categoryId) {
        logger.warn({ slug: p.category_slug }, 'Category slug not found');
        continue;
      }

      const contentHash = crypto.createHash('sha256').update(p.template_en).digest('hex');
      const embedding = generateMockEmbedding(p.slug + p.title_fa);
      const slotCount = p.slots_schema_json.length;

      await client.query(`
        INSERT INTO prompts (
          slug, content_hash, modality, category_id, requires_image_upload, supported_models,
          title_fa, short_desc_fa, direct_answer_summary_fa, search_keywords_fa,
          template_en, slots_schema_json, faq_schema_json,
          preview_alt_fa, preview_after_webp_url, embedding, slot_count,
          copy_count, view_count, trending_score_7d, is_published, is_ai_enriched
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, true, true
        ) ON CONFLICT (slug) DO UPDATE SET
          title_fa = EXCLUDED.title_fa,
          short_desc_fa = EXCLUDED.short_desc_fa,
          direct_answer_summary_fa = EXCLUDED.direct_answer_summary_fa,
          search_keywords_fa = EXCLUDED.search_keywords_fa,
          template_en = EXCLUDED.template_en,
          slots_schema_json = EXCLUDED.slots_schema_json,
          faq_schema_json = EXCLUDED.faq_schema_json,
          is_ai_enriched = true;
      `, [
        p.slug,
        contentHash,
        p.modality,
        categoryId,
        p.requires_image_upload,
        p.supported_models,
        p.title_fa,
        p.short_desc_fa,
        p.direct_answer_summary_fa,
        p.search_keywords_fa,
        p.template_en,
        JSON.stringify(p.slots_schema_json.map((s: SeedSlotItem) => ({
          ...s,
          default_value_en: s.default_value_en || s.default_value || '',
          default_value: s.default_value || s.default_value_en || '',
          placeholder_fa: s.placeholder_fa || s.label_fa || '',
          input_type: s.input_type || 'text',
          is_required: s.is_required ?? false,
          priority: s.priority ?? 1
        }))),
        JSON.stringify(p.faq_schema_json),
        p.preview_alt_fa,
        p.preview_after_webp_url,
        embedding,
        slotCount,
        p.copy_count,
        p.view_count,
        p.trending_score_7d
      ]);
    }
    logger.info({ count: SEED_PROMPTS.length }, 'Seeded production prompts');

    // Seed Atomic Prompt Blocks
    logger.info('Seeding atomic prompt blocks for Zero-LLM forging...');
    for (const b of SEED_ATOMIC_BLOCKS) {
      const embedding = generateMockEmbedding(b.title_fa + b.block_template_en);
      await client.query(`
        INSERT INTO prompt_blocks (
          block_type, modality, title_fa, block_template_en, slots_schema_json, embedding, usage_count
        ) VALUES ($1, $2, $3, $4, $5, $6, 100)
        ON CONFLICT DO NOTHING;
      `, [
        b.block_type,
        b.modality,
        b.title_fa,
        b.block_template_en,
        JSON.stringify(b.slots_schema_json.map((s: SeedSlotItem) => ({
          ...s,
          default_value_en: s.default_value_en || s.default_value || '',
          default_value: s.default_value || s.default_value_en || '',
          placeholder_fa: s.placeholder_fa || s.label_fa || '',
          input_type: s.input_type || 'text',
          is_required: s.is_required ?? false,
          priority: s.priority ?? 1
        }))),
        embedding
      ]);
    }
    logger.info({ count: SEED_ATOMIC_BLOCKS.length }, 'Seeded atomic prompt blocks');

  } catch (err) {
    logger.error({ err }, 'Error during catalog seeding');
    throw err;
  } finally {
    await client.end();
  }
}

// Self-executing when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllFixtures().catch(err => {
    logger.error({ err }, 'Failed to execute seedAllFixtures');
    process.exit(1);
  });
}
