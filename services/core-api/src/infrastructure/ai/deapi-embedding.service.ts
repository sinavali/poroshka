/**
 * Re-exporting from dynamic embedding-provider.service.ts for 100% backward compatibility
 */
export {
  type AuthHeaderFormat,
  type EmbeddingProfile,
  type EmbeddingProfilesConfig,
  DEFAULT_PROFILES,
  getAllEmbeddingProfiles,
  getActiveEmbeddingProfile,
  saveEmbeddingProfilesConfig,
  testEmbeddingProfile,
  formatAuthHeader,
  generateMockEmbedding,
  formatVectorForPg,
  generateEmbedding as generateDeapiEmbedding,
  generateBatchEmbeddings as generateDeapiBatchEmbeddings
} from './embedding-provider.service.ts';

export interface DeapiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export async function getDeapiConfig(): Promise<DeapiConfig> {
  const { getActiveEmbeddingProfile } = await import('./embedding-provider.service.ts');
  const profile = await getActiveEmbeddingProfile();
  return {
    baseUrl: profile.base_url,
    apiKey: profile.api_key,
    model: profile.model
  };
}
