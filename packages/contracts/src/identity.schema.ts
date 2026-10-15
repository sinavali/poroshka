import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { SavedContextProfileSchema } from './catalog.schema.ts';

extendZodWithOpenApi(z);

export const SendOtpRequestSchema = z.object({
  phone: z.string().regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل وارد شده معتبر نیست'),
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD']).default('LOGIN'),
  altcha_payload: z.string().optional()
}).openapi('SendOtpRequest');

export const VerifyOtpRequestSchema = z.object({
  phone: z.string().regex(/^(\+98|0)?9\d{9}$/),
  code: z.string().length(5, 'کد تایید ۵ رقم است'),
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD']).default('LOGIN'),
  device_label: z.string().max(120).optional()
}).openapi('VerifyOtpRequest');

export const PasswordLoginRequestSchema = z.object({
  phone: z.string().regex(/^(\+98|0)?9\d{9}$/),
  password: z.string().min(6, 'رمز عبور حداقل ۶ کاراکتر است'),
  device_label: z.string().max(120).optional()
}).openapi('PasswordLoginRequest');

export const AuthResponseSchema = z.object({
  token: z.string(),
  expires_at: z.string().datetime(),
  user: z.object({
    id: z.string().uuid(),
    phone_e164: z.string(),
    is_phone_verified: z.boolean(),
    role: z.enum(['USER', 'ADMIN']),
    saved_context_profile_json: SavedContextProfileSchema
  })
}).openapi('AuthResponse');

export const UpdateProfileRequestSchema = z.object({
  saved_context_profile_json: SavedContextProfileSchema.optional(),
  new_password: z.string().min(6).optional()
}).openapi('UpdateProfileRequest');
