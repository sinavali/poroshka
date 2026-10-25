import { Hono } from 'hono';
import {
  getAllEmbeddingProfiles,
  saveEmbeddingProfilesConfig,
  testEmbeddingProfile,
  type EmbeddingProfilesConfig,
  type EmbeddingProfile
} from '../../infrastructure/ai/embedding-provider.service.ts';

export const adminEmbeddingRoutes = new Hono();

// 1. Embedding Profiles: Get all profiles and active profile
adminEmbeddingRoutes.get('/embedding-profiles', async (c) => {
  const data = await getAllEmbeddingProfiles();
  return c.json(data);
});

// 2. Embedding Profiles: Save or update profiles configuration
adminEmbeddingRoutes.put('/embedding-profiles', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string; phone_e164: string };
  if (adminUser.role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد سامانه مجاز به تغییر ارائه‌دهنده امبدینگ است.' }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as Partial<EmbeddingProfilesConfig>;
  if (!body || !Array.isArray(body.profiles) || !body.active_profile_id) {
    return c.json({ error: 'INVALID_CONFIG', message: 'ساختار تنظیمات پروفایل‌های امبدینگ نامعتبر است.' }, 400);
  }

  await saveEmbeddingProfilesConfig({
    active_profile_id: body.active_profile_id,
    profiles: body.profiles as EmbeddingProfile[]
  });

  return c.json({ ok: true, message: 'پیکربندی ارائه‌دهنده‌های امبدینگ با موفقیت ذخیره شد.' });
});

// 3. Embedding Profiles: Test connectivity and generation for a profile
adminEmbeddingRoutes.post('/embedding-profiles/test', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as EmbeddingProfile;
  if (!body.base_url || !body.api_key || !body.model) {
    return c.json({ error: 'INVALID_INPUT', message: 'فیلدهای Base URL، API Key و Model الزامی هستند.' }, 400);
  }

  const result = await testEmbeddingProfile(body);
  return c.json(result);
});
