import { Hono } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { detectModality, cleanSearchQuery } from '@promptjoo/persian-normalizer';
import { compilePrompt, stitchAtomicBlocks } from '@promptjoo/prompt-compiler';
import type { PromptSlot, SavedContextProfile } from '@promptjoo/contracts';

export const catalogRoutes = new Hono();

// 1. Get Categories
catalogRoutes.get('/categories', async (c) => {
  const res = await pool.query(`
    SELECT id, slug, title_fa, description_fa, icon_name, primary_modality, sort_order
    FROM categories
    WHERE is_active = true
    ORDER BY sort_order ASC;
  `);
  return c.json(res.rows);
});

// 2. List Prompts (Faceted search, filter by modality, category, trending, with real pagination)
catalogRoutes.get('/prompts', async (c) => {
  const modality = c.req.query('modality');
  const categorySlug = c.req.query('category');
  const search = c.req.query('q');
  const sort = c.req.query('sort') || 'trending';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '12', 10)));
  const offset = (page - 1) * limit;

  let whereClause = ' WHERE p.is_published = true';
  const params: unknown[] = [];
  let paramIdx = 1;

  if (modality && modality !== 'all') {
    whereClause += ` AND p.modality = $${paramIdx++}`;
    params.push(modality);
  }

  if (categorySlug && categorySlug !== 'all') {
    whereClause += ` AND c.slug = $${paramIdx++}`;
    params.push(categorySlug);
  }

  if (search && search.trim() !== '') {
    const cleaned = cleanSearchQuery(search);
    whereClause += ` AND (p.title_fa ILIKE $${paramIdx} OR p.search_keywords_fa ILIKE $${paramIdx} OR p.template_en ILIKE $${paramIdx})`;
    params.push(`%${cleaned}%`);
    paramIdx++;
  }

  // Count total matching items for pagination
  const countRes = await pool.query(`
    SELECT COUNT(*) as total
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    ${whereClause};
  `, params);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  let orderClause = '';
  if (sort === 'copies') {
    orderClause = ' ORDER BY p.copy_count DESC';
  } else if (sort === 'views') {
    orderClause = ' ORDER BY p.view_count DESC';
  } else if (sort === 'newest') {
    orderClause = ' ORDER BY p.created_at DESC';
  } else {
    orderClause = ' ORDER BY p.trending_score_7d DESC, p.copy_count DESC';
  }

  const query = `
    SELECT 
      p.id, p.slug, p.modality, c.slug as category_slug, c.title_fa as category_title_fa,
      p.title_fa, p.short_desc_fa, p.requires_image_upload, p.supported_models,
      p.preview_after_webp_url, p.preview_before_webp_url, p.preview_blurhash,
      p.slot_count, p.copy_count, p.view_count, p.trending_score_7d, p.created_at
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  const queryParams = [...params, limit, offset];
  const res = await pool.query(query, queryParams);

  return c.json({
    items: res.rows,
    total,
    page,
    limit,
    total_pages: totalPages
  });
});

// 3. Get Prompt Detail by Slug (Buffers a VIEW event)
catalogRoutes.get('/prompts/:slug', async (c) => {
  const slug = c.req.param('slug');
  const res = await pool.query(`
    SELECT 
      p.id, p.slug, p.modality, c.slug as category_slug, c.title_fa as category_title_fa,
      p.title_fa, p.short_desc_fa, p.direct_answer_summary_fa, p.search_keywords_fa,
      p.requires_image_upload, p.supported_models, p.template_en, p.slots_schema_json,
      p.faq_schema_json, p.preview_after_webp_url, p.preview_before_webp_url,
      p.preview_blurhash, p.preview_alt_fa, p.slot_count, p.copy_count, p.view_count,
      p.trending_score_7d, p.created_at
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    WHERE p.slug = $1 AND p.is_published = true;
  `, [slug]);

  if (res.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'پرامپت مورد نظر یافت نشد.' }, 404);
  }

  const prompt = res.rows[0];

  // Buffer VIEW metric event
  pool.query(`
    INSERT INTO prompt_metrics_buffer (prompt_id, metric_type)
    VALUES ($1, 'VIEW')
  `, [prompt.id]).catch(() => {});

  return c.json(prompt);
});

// 4. Compile & Copy Prompt (Buffers a COPY event)
catalogRoutes.post('/prompts/:slug/copy', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json().catch(() => ({}));

  const res = await pool.query(
    'SELECT id, template_en, slots_schema_json, modality FROM prompts WHERE slug = $1 AND is_published = true',
    [slug]
  );

  if (res.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND' }, 404);
  }

  const prompt = res.rows[0];
  const slots: PromptSlot[] = prompt.slots_schema_json || [];
  const userValues: Record<string, string> = body.slot_values || {};
  const profile: Partial<SavedContextProfile> = body.profile || {};
  const forceFarsiOutput: boolean = body.force_farsi_output ?? false;

  const compiled = compilePrompt(prompt.template_en, slots, userValues, profile, {
    forceFarsiOutput,
    modality: prompt.modality
  });

  // Buffer COPY metric event
  pool.query(`
    INSERT INTO prompt_metrics_buffer (prompt_id, metric_type)
    VALUES ($1, 'COPY')
  `, [prompt.id]).catch(() => {});

  // Persist to user_copied_prompts (tracks user copy count and saved slot values)
  const authHeader = c.req.header('authorization');
  const clientUuid = c.req.header('x-client-uuid') || '';

  (async () => {
    try {
      let userId: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const rawToken = authHeader.slice(7).trim();
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const sRes = await pool.query('SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1', [tokenHash]);
        if (sRes.rows.length > 0) userId = sRes.rows[0].user_id;
      }

      if (userId) {
        await pool.query(`
          INSERT INTO user_copied_prompts (user_id, client_uuid, prompt_id, custom_values_json, compiled_text, copy_count, last_copied_at)
          VALUES ($1, $2, $3, $4, $5, 1, NOW())
          ON CONFLICT (user_id, prompt_id) DO UPDATE SET
            copy_count = user_copied_prompts.copy_count + 1,
            custom_values_json = EXCLUDED.custom_values_json,
            compiled_text = EXCLUDED.compiled_text,
            last_copied_at = NOW();
        `, [userId, clientUuid || null, prompt.id, JSON.stringify(userValues), compiled.compiledText]);
      } else if (clientUuid) {
        await pool.query(`
          INSERT INTO user_copied_prompts (client_uuid, prompt_id, custom_values_json, compiled_text, copy_count, last_copied_at)
          VALUES ($1, $2, $3, $4, 1, NOW())
          ON CONFLICT (client_uuid, prompt_id) DO UPDATE SET
            copy_count = user_copied_prompts.copy_count + 1,
            custom_values_json = EXCLUDED.custom_values_json,
            compiled_text = EXCLUDED.compiled_text,
            last_copied_at = NOW();
        `, [clientUuid, prompt.id, JSON.stringify(userValues), compiled.compiledText]);
      }
    } catch {}
  })();

  return c.json({
    compiled_text: compiled.compiledText,
    resolved_slot_values: compiled.resolvedSlotValues,
    missing_required_slots: compiled.missingRequiredSlots
  });
});

// Slot Dictionary for pre-filling prompt engine inputs with intelligent Persian defaults
const SLOT_DICTIONARY: Record<string, { default_value_fa: string; suggestions: string[] }> = {
  brand_name: {
    default_value_fa: 'دیجی‌کالا',
    suggestions: ['دیجی‌کالا', 'آکادمی وب‌آموز', 'اسنپ‌مارکت', 'کافه لاته', 'بوتیک مینو']
  },
  niche_topic: {
    default_value_fa: 'فروش آنلاین و تجارت الکترونیک',
    suggestions: ['آموزش سئو و هوش مصنوعی', 'لوازم دیجیتال و گجت‌ها', 'پوشاک و مد زنانه', 'رژیم غذایی و سلامت']
  },
  target_audience: {
    default_value_fa: 'کاربران جوان و علاقمندان به خرید هوشمند',
    suggestions: ['جوانان ۱۸ تا ۳۰ سال', 'مدیران استارتاپ‌ها', 'خریداران آنلاین و خانه‌دار', 'برنامه‌نویسان و مهندسان']
  },
  brand_tone: {
    default_value_fa: 'صمیمی، پرانرژی و متقاعدکننده',
    suggestions: ['صمیمی و پرانرژی', 'رسمی و تخصصی', 'داستان‌سرا و هیجان‌انگیز', 'طنز و صریح']
  },
  call_to_action: {
    default_value_fa: 'همین حالا برای اطلاعات بیشتر روی لینک بیو کلیک کنید یا دایرکت پیام دهید',
    suggestions: ['روی لینک بیو کلیک کنید', 'عدد ۱ را در کامنت ارسال کنید', 'همین حالا با ۵۰٪ تخفیف ثبت‌نام کن']
  },
  topic: {
    default_value_fa: 'معرفی ویژگی‌های کلیدی محصول و پاسخ به نیاز اصلی مشتریان',
    suggestions: ['معرفی محصول و مزایا', 'پاسخ به سوالات متداول مشتریان', 'نکات کاربردی و ترفندهای حرفه‌ای']
  },
  subject: {
    default_value_fa: 'پرتره چهره سینمایی با فوکوس دقیق و جزئیات بافت پوست',
    suggestions: ['پرتره سینمایی با نور ملایم', 'طراحی محصول استودیویی با پس‌زمینه مینیمال', 'منظره شهری مدرن در غروب آفتاب']
  },
  lighting: {
    default_value_fa: 'نورپردازی استودیویی با سایه‌های نرم و بازتاب‌های طبیعی',
    suggestions: ['نورپردازی استودیویی سافت‌باکس', 'نور طبیعی طلایی غروب آفتاب', 'نور نئونی سایبرپانکی آبی و بنفش']
  },
  style: {
    default_value_fa: 'عکاسی واقع‌گرایانه با لنز ۸۵ میلی‌متری و عمق میدان کم',
    suggestions: ['عکاسی واقع‌گرایانه 8k', 'طراحی سه‌بعدی سبک پیکسار', 'رندر معماری فتورئال']
  },
  aspect_ratio: {
    default_value_fa: '16:9',
    suggestions: ['16:9', '9:16', '1:1', '4:5']
  },
  language: {
    default_value_fa: 'TypeScript / Node.js 22',
    suggestions: ['TypeScript', 'Python 3.12', 'SQL / PostgreSQL', 'Golang']
  },
  constraints: {
    default_value_fa: 'بدون پکیج اضافه، با مدیریت کامل خطاها و تایپ‌های استاتیک دقیق',
    suggestions: ['بدون پکیج اضافه', 'بهینه‌سازی کامل حافظه و پردازش', 'کد تمیز با کامنت‌های توصیفی']
  }
};

const MODALITY_IDEAS: Record<string, string[]> = {
  text_writing: [
    'سناریو استوری معرفی دوره آموزشی برای اینستاگرام با قلاب کنجکاوی و دعوت به اقدام',
    'پست لینکدین تحلیلی درباره نقش هوش مصنوعی در آینده مشاغل و راهکارهای ارتقای مهارت',
    'متن ایمیل مارکتینگ برای کمپین تخفیف بلک فرایدی با لحن فوری و جذاب',
    'کپشن اینستاگرام برای معرفی محصول جدید با ایجاد تعامل و سوال در پایان'
  ],
  text_to_image: [
    'پرتره سینمایی واقع‌گرایانه از یک مهندس نرم‌افزار در دفتر کاری مدرن با نور ملایم پنجره',
    'عکاسی محصول استودیویی با کیفیت 8k از یک بطری عطر لوکس روی سنگ مرمر با بازتاب آب',
    'طراحی کاراکتر فانتزی روباه سخنگو با عینک مطالعه به سبک انیمیشن‌های سه‌بعدی پیکسار',
    'منظره شهری آینده‌نگرانه از تهران در سال ۲۰۵۰ با خودروهای پرنده و برج میلاد در غروب'
  ],
  code_tech: [
    'طراحی و بهینه‌سازی کوئری PostgreSQL با ایندکس‌های BRIN و CTE برای ۱۰ میلیون رکورد',
    'کامپوننت واکنش‌گرا فرم چندمرحله‌ای احراز هویت با اعتبارسنجی Zod در React و Tailwind',
    'پیاده‌سازی میدل‌ور توکن‌باکت برای ریت‌لیمیت درخواست‌ها با ردیس در Node.js',
    'اسکریپت پایتون استخراج خودکار متادیتا و تبدیل فایل‌های CSV به دیتابیس SQLite'
  ],
  data_structuring: [
    'فرمول پیشرفته اکسل با ترکیب XLOOKUP و INDEX-MATCH برای محاسبه پورسانت پلکانی فروشندگان',
    'جدول بودجه‌بندی ماهانه شرکتی با نمودار خودکار و تفکیک هزینه‌های ثابت و متغیر',
    'تمپلیت تمیزکاری و نرمال‌سازی شماره‌های تماس و کدهای ملی نامعتبر در گوگل شیتس'
  ]
};

// 5. Get Modality Presets & Random Ideas
catalogRoutes.get('/forge/presets', (c) => {
  const modality = c.req.query('modality') || 'text_writing';
  const ideas = MODALITY_IDEAS[modality] || MODALITY_IDEAS['text_writing'];
  const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];

  return c.json({
    modality,
    sample_ideas: ideas,
    random_idea: randomIdea,
    dictionary: SLOT_DICTIONARY
  });
});

// 6. Zero-LLM Atomic Block Forging
catalogRoutes.post('/forge', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const queryText = (body.query || '').trim();
  if (!queryText) {
    return c.json({ error: 'BAD_REQUEST', message: 'متن ایده یا دستور پرامپت الزامی است.' }, 400);
  }
  const forcedModality = body.modality;
  const profile: Partial<SavedContextProfile> = body.profile || {};

  // Detect modality
  const detected = forcedModality || detectModality(queryText).modality;

  // Retrieve top atomic blocks for this modality
  const blocksRes = await pool.query(`
    SELECT DISTINCT ON (block_type)
      block_type, title_fa, block_template_en, slots_schema_json
    FROM prompt_blocks
    WHERE modality = $1
    ORDER BY block_type, usage_count DESC;
  `, [detected]);

  if (blocksRes.rows.length === 0) {
    return c.json({
      error: 'NO_BLOCKS_FOUND',
      message: 'بلوک‌های سازنده پرامپت برای این دسته‌بندی هنوز بارگذاری نشده است.'
    }, 404);
  }

  let roleText = '';
  let taskText = '';
  let constraintText = '';
  let formatText = '';
  const mergedSlots: (PromptSlot & { suggestions?: string[] })[] = [];

  for (const block of blocksRes.rows) {
    if (block.block_type === 'ROLE') roleText = block.block_template_en;
    if (block.block_type === 'TASK') taskText = block.block_template_en;
    if (block.block_type === 'CONSTRAINT') constraintText = block.block_template_en;
    if (block.block_type === 'FORMAT') formatText = block.block_template_en;

    if (Array.isArray(block.slots_schema_json)) {
      for (const slot of block.slots_schema_json) {
        if (!mergedSlots.some(s => s.slot_key === slot.slot_key)) {
          const dictEntry = SLOT_DICTIONARY[slot.slot_key];
          mergedSlots.push({
            ...slot,
            default_value: slot.default_value || dictEntry?.default_value_fa || '',
            suggestions: dictEntry?.suggestions || []
          });
        }
      }
    }
  }

  // Pre-fill missing slot values with rich defaults from dictionary or profile
  const userValues: Record<string, string> = { ...(body.slot_values || {}) };
  for (const slot of mergedSlots) {
    if (!userValues[slot.slot_key]) {
      const dictVal = SLOT_DICTIONARY[slot.slot_key]?.default_value_fa;
      if (dictVal) {
        userValues[slot.slot_key] = dictVal;
      }
    }
  }

  const stitchedTemplate = stitchAtomicBlocks({
    role: roleText,
    task: taskText || queryText,
    constraint: constraintText,
    format: formatText
  });

  const compiled = compilePrompt(stitchedTemplate, mergedSlots, userValues, profile, {
    forceFarsiOutput: body.force_farsi_output ?? false,
    modality: detected
  });

  return c.json({
    modality: detected,
    stitched_template: stitchedTemplate,
    compiled_text: compiled.compiledText,
    slots: mergedSlots,
    resolved_slot_values: compiled.resolvedSlotValues
  });
});
