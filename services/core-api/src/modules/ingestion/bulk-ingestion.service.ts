import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import {
  enrichPromptWithLlm,
  enrichPromptBatchWithLlm,
  getLlmConfig,
  saveLlmConfig,
  type LlmProviderConfig
} from './llm-enricher.service.ts';
import { generateDeapiEmbedding } from '../../infrastructure/ai/deapi-embedding.service.ts';
import { persistPromptAtomicBlocks } from './atomic-decomposer.service.ts';

export type JobStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED' | 'FAILED';

export interface BulkIngestionStatus {
  status: JobStatus;
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

class BulkIngestionManager {
  private status: JobStatus = 'IDLE';
  private shouldPause = false;
  private shouldStop = false;
  private isLoopRunning = false;
  private currentSlug: string | null = null;
  private processedCount = 0;
  private failedCount = 0;
  private startedAt: number | null = null;
  private lastError: string | null = null;
  private batchSize = 10;
  private delayMs = 250;
  private providerUsed = 'unknown';
  private modelUsed = 'unknown';
  private activeConfig: LlmProviderConfig | null = null;
  private activeJobId: string | null = null;
  private recoveryPromise: Promise<void>;

  constructor() {
    this.recoveryPromise = this.recoverJobState().catch((err) => {
      logger.warn({ err }, 'Failed to recover bulk ingestion job state on startup');
    });
  }

  private async recoverJobState(): Promise<void> {
    try {
      const res = await pool.query(
        'SELECT * FROM bulk_ingestion_jobs ORDER BY created_at DESC LIMIT 1'
      );
      if (res.rows.length > 0) {
        const lastJob = res.rows[0];
        this.activeJobId = lastJob.id;
        // If server restarted while running, mark as paused
        if (lastJob.status === 'RUNNING') {
          await pool.query('UPDATE bulk_ingestion_jobs SET status = $1, updated_at = NOW() WHERE id = $2', [
            'PAUSED',
            lastJob.id
          ]);
          this.status = 'PAUSED';
        } else {
          this.status = lastJob.status;
        }
        this.processedCount = lastJob.processed_items || 0;
        this.failedCount = lastJob.failed_items || 0;
        this.batchSize = lastJob.batch_size || 10;
        this.delayMs = lastJob.delay_ms || 250;
        this.providerUsed = lastJob.provider_used || 'unknown';
        this.modelUsed = lastJob.model_used || 'unknown';
        this.currentSlug = lastJob.current_slug || null;
      }
    } catch (err) {
      logger.warn({ err }, 'Error checking previous bulk ingestion job');
    }
  }

  public async getStatus(): Promise<BulkIngestionStatus> {
    await this.recoveryPromise;
    const countsRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_ai_enriched = TRUE) as enriched,
        COUNT(*) FILTER (WHERE is_ai_enriched = FALSE) as unenriched
      FROM prompts;
    `);

    const totalInDb = parseInt(countsRes.rows[0]?.total || '0', 10);
    const enrichedCount = parseInt(countsRes.rows[0]?.enriched || '0', 10);
    const unenrichedCount = parseInt(countsRes.rows[0]?.unenriched || '0', 10);

    const progressPercentage = totalInDb > 0 ? Math.min(100, Math.round((enrichedCount / totalInDb) * 100)) : 100;

    let itemsPerMinute = 0;
    let estimatedRemainingSeconds: number | null = null;

    if (this.status === 'RUNNING' && this.startedAt && this.processedCount > 0) {
      const elapsedMinutes = (Date.now() - this.startedAt) / 60000;
      if (elapsedMinutes > 0.05) {
        itemsPerMinute = Math.round((this.processedCount / elapsedMinutes) * 10) / 10;
        if (itemsPerMinute > 0 && unenrichedCount > 0) {
          estimatedRemainingSeconds = Math.round((unenrichedCount / itemsPerMinute) * 60);
        }
      }
    }

    return {
      status: this.status,
      total_in_db: totalInDb,
      unenriched_count: unenrichedCount,
      enriched_count: enrichedCount,
      processed_count: this.processedCount,
      failed_count: this.failedCount,
      progress_percentage: progressPercentage,
      current_slug: this.currentSlug,
      provider_used: this.providerUsed,
      model_used: this.modelUsed,
      batch_size: this.batchSize,
      delay_ms: this.delayMs,
      started_at: this.startedAt ? new Date(this.startedAt).toISOString() : null,
      last_error: this.lastError,
      items_per_minute: itemsPerMinute,
      estimated_remaining_seconds: estimatedRemainingSeconds
    };
  }

  public async start(options?: { batch_size?: number; delay_ms?: number }): Promise<BulkIngestionStatus> {
    await this.recoveryPromise;
    if (options?.batch_size && options.batch_size > 0) this.batchSize = options.batch_size;
    if (options?.delay_ms !== undefined && options.delay_ms >= 0) this.delayMs = options.delay_ms;

    if (this.isLoopRunning && this.status === 'RUNNING') {
      return this.getStatus();
    }

    // Load active config and ensure it is marked active
    const config = await getLlmConfig();
    if (config) {
      config.is_active = true;
      this.activeConfig = config;
      this.providerUsed = config.provider;
      this.modelUsed = config.model;
      await saveLlmConfig(config);
    } else {
      this.providerUsed = 'custom';
      this.modelUsed = 'custom-model';
    }

    this.shouldPause = false;
    this.shouldStop = false;
    this.status = 'RUNNING';
    this.startedAt = Date.now();
    this.processedCount = 0;
    this.failedCount = 0;
    this.lastError = null;

    // Create or update database job record
    const jobRes = await pool.query(`
      INSERT INTO bulk_ingestion_jobs (
        status, batch_size, delay_ms, provider_used, model_used, created_at, updated_at
      ) VALUES ('RUNNING', $1, $2, $3, $4, NOW(), NOW())
      RETURNING id
    `, [this.batchSize, this.delayMs, this.providerUsed, this.modelUsed]);
    this.activeJobId = jobRes.rows[0]?.id || null;

    // Launch worker loop in background without awaiting
    this.runBackgroundLoop().catch((err) => {
      logger.error({ err }, 'Unhandled error in bulk ingestion loop');
      this.status = 'FAILED';
      this.lastError = err instanceof Error ? err.message : String(err);
    });

    return this.getStatus();
  }

  public async pause(): Promise<BulkIngestionStatus> {
    await this.recoveryPromise;
    if (this.status !== 'RUNNING') return this.getStatus();
    this.shouldPause = true;
    this.status = 'PAUSED';
    if (this.activeJobId) {
      await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'PAUSED', updated_at = NOW() WHERE id = $1`, [this.activeJobId]);
    } else {
      await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'PAUSED', updated_at = NOW() WHERE status = 'RUNNING'`);
    }
    return this.getStatus();
  }

  public async resume(options?: { batch_size?: number; delay_ms?: number }): Promise<BulkIngestionStatus> {
    await this.recoveryPromise;
    if (options?.batch_size && options.batch_size > 0) this.batchSize = options.batch_size;
    if (options?.delay_ms !== undefined && options.delay_ms >= 0) this.delayMs = options.delay_ms;

    if (this.status !== 'PAUSED' && this.status !== 'STOPPED') {
      return this.getStatus();
    }
    this.shouldPause = false;
    this.shouldStop = false;
    this.status = 'RUNNING';
    if (!this.startedAt) this.startedAt = Date.now();

    const config = await getLlmConfig();
    if (config) {
      config.is_active = true;
      this.activeConfig = config;
      this.providerUsed = config.provider;
      this.modelUsed = config.model;
    }

    const jobRes = await pool.query(`
      INSERT INTO bulk_ingestion_jobs (
        status, batch_size, delay_ms, provider_used, model_used, created_at, updated_at
      ) VALUES ('RUNNING', $1, $2, $3, $4, NOW(), NOW())
      RETURNING id
    `, [this.batchSize, this.delayMs, this.providerUsed, this.modelUsed]);
    this.activeJobId = jobRes.rows[0]?.id || null;

    if (!this.isLoopRunning) {
      this.runBackgroundLoop().catch((err) => {
        logger.error({ err }, 'Unhandled error in resumed bulk ingestion loop');
        this.status = 'FAILED';
      });
    }

    return this.getStatus();
  }

  public async stop(): Promise<BulkIngestionStatus> {
    await this.recoveryPromise;
    this.shouldStop = true;
    this.shouldPause = false;
    this.status = 'STOPPED';
    this.currentSlug = null;
    if (this.activeJobId) {
      await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'STOPPED', updated_at = NOW() WHERE id = $1`, [this.activeJobId]);
    } else {
      await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'STOPPED', updated_at = NOW() WHERE status = 'RUNNING'`);
    }
    return this.getStatus();
  }

  /**
   * Hard Reset: Stops active jobs and deletes ALL prompts from the database.
   */
  public async hardReset(): Promise<BulkIngestionStatus> {
    this.shouldStop = true;
    this.shouldPause = false;
    this.status = 'IDLE';
    this.currentSlug = null;
    this.processedCount = 0;
    this.failedCount = 0;
    this.lastError = null;
    this.startedAt = null;

    // Delete all prompts
    await pool.query('DELETE FROM prompts;');

    // Reset jobs table
    await pool.query(`
      UPDATE bulk_ingestion_jobs 
      SET status = 'IDLE', total_items = 0, processed_items = 0, enriched_items = 0, failed_items = 0, current_slug = null, updated_at = NOW()
    `);

    logger.info('Hard Reset executed: all prompts deleted and ingestion status reset to IDLE.');
    return this.getStatus();
  }

  /**
   * Hard Ingest: Resets is_ai_enriched flag on all prompts to FALSE and starts ingestion from scratch.
   */
  public async hardIngest(options?: { batch_size?: number; delay_ms?: number }): Promise<BulkIngestionStatus> {
    if (this.isLoopRunning) {
      this.shouldStop = true;
      await new Promise((r) => setTimeout(r, 350));
    }

    await pool.query('UPDATE prompts SET is_ai_enriched = FALSE;');
    this.processedCount = 0;
    this.failedCount = 0;
    this.lastError = null;
    this.shouldStop = false;
    this.shouldPause = false;

    logger.info('Hard Ingest executed: all prompts marked is_ai_enriched = FALSE. Starting ingestion loop.');
    return this.start(options);
  }

  private async persistEnrichedPrompt(
    promptId: string,
    enriched: {
      template_en: string;
      title_fa: string;
      short_desc_fa: string;
      direct_answer_summary_fa: string;
      modality: string;
      category_slug: string;
      slots_schema_json: unknown[];
      search_keywords_fa: string[];
    },
    catMap: Map<string, string>,
    defaultCatId: string
  ): Promise<void> {
    const resolvedCatId = catMap.get(enriched.category_slug) || defaultCatId;
    const keywordsStr = (enriched.search_keywords_fa || []).join(', ');
    const embedding = await generateDeapiEmbedding(`${enriched.title_fa}\n${enriched.short_desc_fa || ''}\n${enriched.template_en}`);

    await pool.query(`
      UPDATE prompts
      SET 
        template_en = $1,
        title_fa = $2,
        short_desc_fa = $3,
        direct_answer_summary_fa = $4,
        modality = $5,
        category_id = $6,
        slots_schema_json = $7,
        search_keywords_fa = $8,
        slot_count = $9,
        is_ai_enriched = TRUE,
        embedding = $10,
        updated_at = NOW()
      WHERE id = $11
    `, [
      enriched.template_en,
      enriched.title_fa,
      enriched.short_desc_fa,
      enriched.direct_answer_summary_fa,
      enriched.modality,
      resolvedCatId,
      JSON.stringify(enriched.slots_schema_json),
      keywordsStr,
      enriched.slots_schema_json.length,
      embedding,
      promptId
    ]);

    // Decompose and store granulated atomic blocks for future Atomic Prompt Engine
    await persistPromptAtomicBlocks(
      promptId,
      enriched.modality,
      enriched.template_en,
      enriched.title_fa,
      enriched.slots_schema_json
    ).catch((e: unknown) => {
      logger.warn({ promptId, err: e }, 'Could not persist granulated atomic blocks during bulk enrichment');
    });
  }

  private async runBackgroundLoop(): Promise<void> {
    if (this.isLoopRunning) return;
    this.isLoopRunning = true;

    // Cache categories map for resolving slugs
    const catsRes = await pool.query('SELECT id, slug FROM categories');
    const catMap = new Map<string, string>();
    for (const c of catsRes.rows) {
      catMap.set(c.slug, c.id);
    }
    const defaultCatId = catsRes.rows[0]?.id;

    try {
      while (!this.shouldPause && !this.shouldStop) {
        // 1. Fetch next batch of un-enriched prompts
        const batchQuery = await pool.query(`
          SELECT id, slug, template_en, title_fa, modality
          FROM prompts
          WHERE is_ai_enriched = FALSE
          ORDER BY created_at ASC, id ASC
          LIMIT $1
        `, [this.batchSize]);

        if (batchQuery.rows.length === 0) {
          // All prompts have been enriched!
          this.status = 'COMPLETED';
          this.currentSlug = null;
          if (this.activeJobId) {
            await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'COMPLETED', updated_at = NOW(), completed_at = NOW() WHERE id = $1`, [this.activeJobId]);
          } else {
            await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'COMPLETED', updated_at = NOW(), completed_at = NOW() WHERE status = 'RUNNING'`);
          }
          logger.info('Bulk prompt ingestion completed successfully: 0 unenriched prompts remaining.');
          break;
        }

        // Always ensure active config is re-checked
        if (!this.activeConfig) {
          this.activeConfig = await getLlmConfig();
        }

        if (this.shouldPause) {
          this.status = 'PAUSED';
          break;
        }
        if (this.shouldStop) {
          this.status = 'STOPPED';
          break;
        }

        // 2. Process user-defined batch directly without artificial subdivision
        const batchItems = batchQuery.rows;
        this.currentSlug = batchItems[0]?.slug || null;

        try {
          // True multi-item batch enrichment via LLM for the exact user-defined batch size
          const enrichedList = await enrichPromptBatchWithLlm(
            batchItems.map((p) => ({
              id: p.id,
              template_en: p.template_en,
              title_fa: p.title_fa
            })),
            this.activeConfig || undefined,
            false
          );

          // Immediately persist each enriched prompt in PostgreSQL
          for (const enriched of enrichedList) {
            if (!enriched.enriched_by_llm) {
              this.failedCount++;
              continue;
            }

            await this.persistEnrichedPrompt(enriched.id, enriched, catMap, defaultCatId);
            this.processedCount++;
          }
        } catch (batchErr: unknown) {
          const msg = batchErr instanceof Error ? batchErr.message : String(batchErr);
          this.lastError = msg;
          logger.warn({ batchSize: batchItems.length, err: msg }, 'Batch enrichment failed; falling back to individual prompt enrichment');

          // Fallback for this batch: try each item individually and persist immediately
          for (const p of batchItems) {
            if (this.shouldPause || this.shouldStop) break;
            try {
              const single = await enrichPromptWithLlm(p.template_en, p.title_fa, this.activeConfig || undefined, false);
              await this.persistEnrichedPrompt(p.id, single, catMap, defaultCatId);
              this.processedCount++;
            } catch (singleErr: unknown) {
              this.failedCount++;
              const singleMsg = singleErr instanceof Error ? singleErr.message : String(singleErr);
              this.lastError = singleMsg;
              logger.warn({ promptId: p.id, err: singleMsg }, 'Individual prompt enrichment fallback failed');
            }
          }

          if (/429|rate\s*limit|quota/i.test(msg)) {
            logger.info('Rate limit encountered; backing off for 5000ms...');
            await new Promise((r) => setTimeout(r, 5000));
          }
        }

        // Immediately sync progress to PostgreSQL after every batch
        if (this.activeJobId) {
          await pool.query(`
            UPDATE bulk_ingestion_jobs
            SET 
              processed_items = $1,
              enriched_items = (SELECT COUNT(*) FROM prompts WHERE is_ai_enriched = TRUE),
              failed_items = $2,
              current_slug = $3,
              last_error = $4,
              updated_at = NOW()
            WHERE id = $5
          `, [this.processedCount, this.failedCount, this.currentSlug, this.lastError, this.activeJobId]);
        }

        // Respect delay between batches defined by user
        if (this.delayMs > 0 && !this.shouldPause && !this.shouldStop) {
          await new Promise((r) => setTimeout(r, this.delayMs));
        }
      }
    } catch (loopErr: unknown) {
      this.status = 'FAILED';
      this.lastError = loopErr instanceof Error ? loopErr.message : String(loopErr);
      logger.error({ err: loopErr }, 'Fatal error in bulk ingestion background loop');
      if (this.activeJobId) {
        await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'FAILED', last_error = $1, updated_at = NOW() WHERE id = $2`, [this.lastError, this.activeJobId]);
      } else {
        await pool.query(`UPDATE bulk_ingestion_jobs SET status = 'FAILED', last_error = $1, updated_at = NOW() WHERE status = 'RUNNING'`, [this.lastError]);
      }
    } finally {
      this.isLoopRunning = false;
      if (this.shouldPause) this.status = 'PAUSED';
      if (this.shouldStop) this.status = 'STOPPED';
    }
  }
}

export const bulkIngestionManager = new BulkIngestionManager();
