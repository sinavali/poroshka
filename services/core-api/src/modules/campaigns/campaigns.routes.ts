import { Hono } from 'hono';
import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import { cleanSearchQuery } from '../../../../../packages/persian-normalizer/src/index.ts';

export const campaignsRoutes = new Hono();

const BALE_BOT_TOKEN = process.env.BALE_BOT_TOKEN || 'test_bale_token';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test_tg_token';
const TG_RELAY_URL = process.env.TG_RELAY_URL || 'https://tg-relay.promptjoo.ir';
const RELAY_SECRET = process.env.RELAY_SECRET || 'promptjoo_edge_secret_v1';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://promptjoo.ir';

// --- Dispatchers ---

export async function sendBaleMessage(chatId: string | number, text: string, replyMarkup?: unknown) {
  try {
    const url = `https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup
      })
    });
    return await res.json();
  } catch (err) {
    logger.error({ err, chatId }, 'Failed to send message via Bale');
    throw err;
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: unknown) {
  try {
    const url = `${TG_RELAY_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Secret': RELAY_SECRET
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    return await res.json();
  } catch (err) {
    logger.error({ err, chatId }, 'Failed to send message via Telegram Relay');
    throw err;
  }
}

// --- Webhooks ---

// 1. Bale Webhook Receiver
campaignsRoutes.post('/webhook/bale', async (c) => {
  const update = await c.req.json().catch(() => ({}));

  if (update.message) {
    const chatId = update.message.chat?.id;
    const text = update.message.text?.trim() || '';

    // Handle /start or /start auth_<token>
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1 && parts[1].startsWith('auth_')) {
        const token = parts[1].replace('auth_', '');
        // Complete reverse authentication
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const chalRes = await client.query(
            `SELECT phone_e164 FROM otp_challenges 
             WHERE messenger_token = $1 AND is_consumed = false AND expires_at > NOW()`,
            [token]
          );

          if (chalRes.rows.length > 0) {
            const phone = chalRes.rows[0].phone_e164;
            await client.query(
              `UPDATE otp_challenges SET is_consumed = true WHERE messenger_token = $1`,
              [token]
            );
            await client.query(
              `UPDATE users SET is_phone_verified = true, bale_chat_id = $1 WHERE phone_e164 = $2`,
              [chatId, phone]
            );
            await client.query('COMMIT');

            await sendBaleMessage(
              chatId,
              '✅ هویت شما با موفقیت در پرامپت‌جو تایید شد! هم‌اکنون می‌توانید به حساب کاربری خود بازگردید.'
            );
            return c.json({ ok: true });
          } else {
            await client.query('ROLLBACK');
            await sendBaleMessage(chatId, '⚠️ لینک یا توکن تایید منقضی شده یا نامعتبر است.');
            return c.json({ ok: false });
          }
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error({ err }, 'Error in Bale reverse auth');
        } finally {
          client.release();
        }
      }

      // Default welcome
      const welcome = `سلام به پرامپت‌جو خوش آمدید! 🚀\nبزرگترین پلتفرم پرامپت‌های مهندسی‌شده و آماده هوش مصنوعی برای تولید محتوا، تصویر، برنامه‌نویسی و اکسل.\n\nبرای جستجو کافیست عبارت مورد نظر را بنویسید یا وب‌اپلیکیشن را باز کنید.`;
      const markup = {
        inline_keyboard: [
          [{ text: '🌐 ورود به پرامپت‌جو', web_app: { url: WEBAPP_URL } }],
          [{ text: '🔍 مشاهده پرامپت‌های ترند', callback_data: 'trend' }]
        ]
      };
      await sendBaleMessage(chatId, welcome, markup);
      return c.json({ ok: true });
    }

    // Default text search
    if (text.length > 1) {
      const cleaned = cleanSearchQuery(text);
      const searchRes = await pool.query(
        `SELECT slug, title_fa, short_desc_fa FROM prompts 
         WHERE is_published = true AND (title_fa ILIKE $1 OR search_keywords_fa ILIKE $1) 
         LIMIT 3`,
        [`%${cleaned}%`]
      );

      if (searchRes.rows.length === 0) {
        await sendBaleMessage(chatId, 'پرامپتی با این عبارت یافت نشد. می‌توانید با کلیک بر روی دکمه زیر در سایت جستجو کنید:', {
          inline_keyboard: [[{ text: '🔍 جستجو در پرامپت‌جو', web_app: { url: `${WEBAPP_URL}?q=${encodeURIComponent(text)}` } }]]
        });
      } else {
        let reply = `نتیجه جستجو برای «${text}»:\n\n`;
        const buttons = [];
        for (const p of searchRes.rows) {
          reply += `🔹 <b>${p.title_fa}</b>\n${p.short_desc_fa}\n\n`;
          buttons.push([{ text: `📋 مشاهده «${p.title_fa}»`, web_app: { url: `${WEBAPP_URL}/p/${p.slug}` } }]);
        }
        await sendBaleMessage(chatId, reply, { inline_keyboard: buttons });
      }
    }
  }

  return c.json({ ok: true });
});

// 2. Telegram Webhook Receiver (Routed through tg-relay-worker)
campaignsRoutes.post('/webhook/telegram', async (c) => {
  const secret = c.req.header('x-relay-secret');
  if (secret !== RELAY_SECRET && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'UNAUTHORIZED_RELAY' }, 401);
  }

  const update = await c.req.json().catch(() => ({}));

  if (update.message) {
    const chatId = update.message.chat?.id;
    const text = update.message.text?.trim() || '';

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1 && parts[1].startsWith('auth_')) {
        const token = parts[1].replace('auth_', '');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const chalRes = await client.query(
            `SELECT phone_e164 FROM otp_challenges 
             WHERE messenger_token = $1 AND is_consumed = false AND expires_at > NOW()`,
            [token]
          );

          if (chalRes.rows.length > 0) {
            const phone = chalRes.rows[0].phone_e164;
            await client.query(
              `UPDATE otp_challenges SET is_consumed = true WHERE messenger_token = $1`,
              [token]
            );
            await client.query(
              `UPDATE users SET is_phone_verified = true, telegram_chat_id = $1 WHERE phone_e164 = $2`,
              [chatId, phone]
            );
            await client.query('COMMIT');

            await sendTelegramMessage(
              chatId,
              '✅ هویت شما با موفقیت در پرامپت‌جو تایید شد! هم‌اکنون وارد حساب کاربری خود شدید.'
            );
            return c.json({ ok: true });
          } else {
            await client.query('ROLLBACK');
            await sendTelegramMessage(chatId, '⚠️ لینک یا توکن تایید منقضی شده یا نامعتبر است.');
            return c.json({ ok: false });
          }
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error({ err }, 'Error in Telegram reverse auth');
        } finally {
          client.release();
        }
      }

      // Welcome message
      const welcome = `سلام به پرامپت‌جو خوش آمدید! 🚀\nپلتفرم تخصصی پرامپت‌های مهندسی‌شده هوش مصنوعی در ایران.\n\nبرای جستجوی سریع می‌توانید از حالت Inline در هر چتی استفاده کنید:\n<code>@promptjoo_bot عبارت_جستجو</code>`;
      const markup = {
        inline_keyboard: [
          [{ text: '🌐 باز کردن وب‌اپلیکیشن پرامپت‌جو', web_app: { url: WEBAPP_URL } }]
        ]
      };
      await sendTelegramMessage(chatId, welcome, markup);
      return c.json({ ok: true });
    }
  }

  // Handle Telegram Inline Query
  if (update.inline_query) {
    const inlineId = update.inline_query.id;
    const query = update.inline_query.query?.trim() || '';
    const cleaned = cleanSearchQuery(query);

    const promptsRes = await pool.query(
      `SELECT slug, title_fa, short_desc_fa, template_en FROM prompts 
       WHERE is_published = true AND (title_fa ILIKE $1 OR search_keywords_fa ILIKE $1)
       LIMIT 10`,
      [`%${cleaned}%`]
    );

    const results = promptsRes.rows.map((p, idx) => ({
      type: 'article',
      id: `${p.slug}-${idx}`,
      title: p.title_fa,
      description: p.short_desc_fa,
      input_message_content: {
        message_text: `📋 <b>${p.title_fa}</b>\n\n${p.template_en}\n\n🔍 مشاهده در پرامپت‌جو:\n${WEBAPP_URL}/p/${p.slug}`,
        parse_mode: 'HTML'
      },
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ کپی و پر کردن اسلات‌ها در پرامپت‌جو', url: `${WEBAPP_URL}/p/${p.slug}` }]
        ]
      }
    }));

    try {
      await fetch(`${TG_RELAY_URL}/bot${TELEGRAM_BOT_TOKEN}/answerInlineQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Relay-Secret': RELAY_SECRET },
        body: JSON.stringify({
          inline_query_id: inlineId,
          results,
          cache_time: 60
        })
      });
    } catch (err) {
      logger.error({ err }, 'Failed to answer Telegram inline query');
    }
  }

  return c.json({ ok: true });
});

// 3. Enqueue Broadcast Campaign (Admin Only)
campaignsRoutes.post('/broadcast', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { channel, title, message, url } = body;

  if (!channel || !message) {
    return c.json({ error: 'INVALID_INPUT', message: 'کانال و متن پیام الزامی است.' }, 400);
  }

  const outboxRes = await pool.query(
    `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload_json, status)
     VALUES ('CAMPAIGN', gen_random_uuid()::text, 'BROADCAST_MESSAGE', $1, 'PENDING')
     RETURNING id, created_at`,
    [JSON.stringify({ channel, title, message, url })]
  );

  return c.json({
    success: true,
    outbox_event_id: outboxRes.rows[0].id,
    created_at: outboxRes.rows[0].created_at
  });
});

// 4. Outbox Processor Loop
export async function processOutboxBatch(batchSize = 10): Promise<number> {
  const client = await pool.connect();
  let processedCount = 0;
  try {
    await client.query('BEGIN');
    const selectRes = await client.query(
      `SELECT id, aggregate_type, event_type, payload_json, retry_count, max_retries
       FROM outbox_events
       WHERE status = 'PENDING' AND next_attempt_at <= NOW()
       ORDER BY next_attempt_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize]
    );

    for (const event of selectRes.rows) {
      try {
        const payload = event.payload_json;
        if (event.event_type === 'BROADCAST_MESSAGE') {
          // Send to subscribers based on channel
          if (payload.channel === 'telegram') {
            // Find users with telegram_chat_id
            const users = await client.query('SELECT telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL LIMIT 50');
            for (const u of users.rows) {
              await sendTelegramMessage(u.telegram_chat_id, payload.message);
            }
          } else if (payload.channel === 'bale') {
            const users = await client.query('SELECT bale_chat_id FROM users WHERE bale_chat_id IS NOT NULL LIMIT 50');
            for (const u of users.rows) {
              await sendBaleMessage(u.bale_chat_id, payload.message);
            }
          }
        }

        await client.query(
          `UPDATE outbox_events SET status = 'COMPLETED', next_attempt_at = NOW() WHERE id = $1`,
          [event.id]
        );
        processedCount++;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const nextRetry = event.retry_count + 1;
        const newStatus = nextRetry >= event.max_retries ? 'DEAD_LETTER' : 'PENDING';
        const delaySeconds = Math.pow(2, nextRetry) * 10; // Exponential backoff

        await client.query(
          `UPDATE outbox_events 
           SET status = $1, retry_count = $2, last_error = $3, 
               next_attempt_at = NOW() + ($4 || ' seconds')::interval 
           WHERE id = $5`,
          [newStatus, nextRetry, errorMessage, delaySeconds, event.id]
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Error in outbox processing transaction');
  } finally {
    client.release();
  }
  return processedCount;
}

let outboxInterval: NodeJS.Timeout | null = null;
export function startOutboxWorker(intervalMs = 5000) {
  if (outboxInterval) return;
  outboxInterval = setInterval(async () => {
    try {
      await processOutboxBatch();
    } catch {
      // Handled internally
    }
  }, intervalMs);
}

export function stopOutboxWorker() {
  if (outboxInterval) {
    clearInterval(outboxInterval);
    outboxInterval = null;
  }
}
