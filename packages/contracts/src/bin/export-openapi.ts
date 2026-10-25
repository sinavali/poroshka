import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
