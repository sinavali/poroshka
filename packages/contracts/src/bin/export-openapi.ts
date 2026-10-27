import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import zodToOpenApi from '@asteasolutions/zod-to-openapi';
const { OpenAPIRegistry, OpenApiGeneratorV3 } = zodToOpenApi;
import {
  PromptModalitySchema,
  PromptBlockTypeSchema,
  BilingualPresetOptionSchema,
  PromptSlotSchema,
  SavedContextProfileSchema,
  CategorySchema,
  MediaCheckpointPayloadSchema,
  PromptListItemSchema,
  PromptDetailSchema,
  AtomicBlockSchema,
  FaqItemSchema
} from '../catalog.schema.js';
import {
  SendOtpRequestSchema,
  VerifyOtpRequestSchema,
  PasswordLoginRequestSchema,
  AuthResponseSchema,
  UpdateProfileRequestSchema
} from '../identity.schema.js';
import {
  AdPlacementSlotSchema,
  AdNetworkConfigSchema,
  AdClickEventSchema,
  TrackAdClickInputSchema
} from '../monetization.schema.js';

const registry = new OpenAPIRegistry();

// Register all component schemas
registry.register('PromptModality', PromptModalitySchema);
registry.register('PromptBlockType', PromptBlockTypeSchema);
registry.register('BilingualPresetOption', BilingualPresetOptionSchema);
registry.register('PromptSlot', PromptSlotSchema);
registry.register('SavedContextProfile', SavedContextProfileSchema);
registry.register('Category', CategorySchema);
registry.register('MediaCheckpointPayload', MediaCheckpointPayloadSchema);
registry.register('PromptListItem', PromptListItemSchema);
registry.register('PromptDetail', PromptDetailSchema);
registry.register('AtomicBlock', AtomicBlockSchema);
registry.register('FaqItem', FaqItemSchema);

registry.register('SendOtpRequest', SendOtpRequestSchema);
registry.register('VerifyOtpRequest', VerifyOtpRequestSchema);
registry.register('PasswordLoginRequest', PasswordLoginRequestSchema);
registry.register('AuthResponse', AuthResponseSchema);
registry.register('UpdateProfileRequest', UpdateProfileRequestSchema);

registry.register('AdPlacementSlot', AdPlacementSlotSchema);
registry.register('AdNetworkConfig', AdNetworkConfigSchema);
registry.register('AdClickEvent', AdClickEventSchema);
registry.register('TrackAdClickInput', TrackAdClickInputSchema);

// Register Core API Paths: Catalog
registry.registerPath({
  method: 'get',
  path: '/api/v1/catalog/categories',
  tags: ['Catalog'],
  summary: 'List active prompt categories',
  responses: {
    200: {
      description: 'Active categories list',
      content: { 'application/json': { schema: z.array(CategorySchema) } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/catalog/prompts',
  tags: ['Catalog'],
  summary: 'List paginated prompts with faceted filtering',
  responses: {
    200: {
      description: 'Paginated prompt list',
      content: {
        'application/json': {
          schema: z.object({
            items: z.array(PromptListItemSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
            totalPages: z.number().int()
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/catalog/prompts/{slug}',
  tags: ['Catalog'],
  summary: 'Get detailed prompt metadata and slots schema by slug',
  request: {
    params: z.object({ slug: z.string() })
  },
  responses: {
    200: {
      description: 'Prompt detail specification',
      content: { 'application/json': { schema: PromptDetailSchema } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/catalog/prompts/{slug}/copy',
  tags: ['Catalog'],
  summary: 'Compile prompt template with slot inputs and increment copy count',
  request: {
    params: z.object({ slug: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            slot_values: z.record(z.string()).optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Compiled prompt result',
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            compiled_text: z.string(),
            missing_required_slots: z.array(z.string())
          })
        }
      }
    }
  }
});

// Register Core API Paths: Identity
registry.registerPath({
  method: 'post',
  path: '/api/v1/identity/send-otp',
  tags: ['Identity'],
  summary: 'Request 5-digit OTP verification code via SMS',
  request: {
    body: {
      content: { 'application/json': { schema: SendOtpRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'OTP dispatch status',
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            message: z.string(),
            expires_in_seconds: z.number()
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/identity/verify-otp',
  tags: ['Identity'],
  summary: 'Verify OTP code and authenticate user session',
  request: {
    body: {
      content: { 'application/json': { schema: VerifyOtpRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'Authentication tokens and user profile',
      content: { 'application/json': { schema: AuthResponseSchema } }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/identity/login-password',
  tags: ['Identity'],
  summary: 'Authenticate with phone and password',
  request: {
    body: {
      content: { 'application/json': { schema: PasswordLoginRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'Authentication tokens and user profile',
      content: { 'application/json': { schema: AuthResponseSchema } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/identity/me',
  tags: ['Identity'],
  summary: 'Retrieve authenticated user session profile',
  responses: {
    200: {
      description: 'Current session user object',
      content: {
        'application/json': {
          schema: z.object({
            user: AuthResponseSchema.shape.user
          })
        }
      }
    }
  }
});

// Register Core API Paths: Tickets
registry.registerPath({
  method: 'get',
  path: '/api/v1/tickets',
  tags: ['Tickets'],
  summary: 'List user tickets or all tickets for admin/operators',
  responses: {
    200: {
      description: 'Tickets list',
      content: {
        'application/json': {
          schema: z.array(z.object({
            id: z.string().uuid(),
            subject: z.string(),
            status: z.string(),
            created_at: z.string()
          }))
        }
      }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/tickets',
  tags: ['Tickets'],
  summary: 'Open a new support ticket',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            subject: z.string().min(3),
            initial_message: z.string().min(5),
            target_role: z.enum(['OPERATOR', 'ADMIN']).optional()
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Ticket created',
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            ticket_id: z.string().uuid()
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/tickets/{id}',
  tags: ['Tickets'],
  summary: 'Get ticket thread and conversation messages',
  request: {
    params: z.object({ id: z.string().uuid() })
  },
  responses: {
    200: {
      description: 'Ticket details and messages',
      content: {
        'application/json': {
          schema: z.object({
            ticket: z.record(z.unknown()),
            messages: z.array(z.record(z.unknown()))
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/tickets/{id}/messages',
  tags: ['Tickets'],
  summary: 'Send reply message in ticket thread',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().min(1)
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Message posted',
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            message_id: z.string().uuid()
          })
        }
      }
    }
  }
});

// Register Core API Paths: Monetization
registry.registerPath({
  method: 'get',
  path: '/api/v1/monetization/configs',
  tags: ['Monetization'],
  summary: 'Get active ad unit configurations for slots',
  responses: {
    200: {
      description: 'Ad configurations list',
      content: {
        'application/json': {
          schema: z.array(AdNetworkConfigSchema)
        }
      }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/monetization/events/click',
  tags: ['Monetization'],
  summary: 'Record ad click event with fraud deduplication',
  request: {
    body: {
      content: {
        'application/json': {
          schema: TrackAdClickInputSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Click recorded',
      content: {
        'application/json': {
          schema: z.object({
            ok: z.boolean(),
            deduplicated: z.boolean()
          })
        }
      }
    }
  }
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Promptjoo Enterprise API',
    version: '1.0.0',
    description: 'Enterprise multi-modal AI prompt platform for Iran with zero runtime LLM cost',
  },
  servers: [
    { url: 'https://core-api.promptjoo.ir', description: 'Production Gateway' },
    { url: 'http://localhost:4000', description: 'Local Development' }
  ]
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractsDir = path.resolve(__dirname, '../..');
const distDir = path.resolve(contractsDir, '../../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const outputPathDist = path.join(distDir, 'openapi-v1.json');
const outputPathContracts = path.join(contractsDir, 'openapi-v1.json');

const jsonStr = JSON.stringify(document, null, 2);
fs.writeFileSync(outputPathDist, jsonStr, 'utf-8');
fs.writeFileSync(outputPathContracts, jsonStr, 'utf-8');

process.stdout.write(`[export-openapi] OpenAPI 3.0.3 specification exported successfully to:
  - ${outputPathDist}
  - ${outputPathContracts}\n`);
