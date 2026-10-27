import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import { generateEmbedding, generateMockEmbedding } from '../../infrastructure/ai/embedding-provider.service.ts';

export type PromptBlockType = 'ROLE' | 'TASK' | 'CONSTRAINT' | 'FORMAT';

export interface DecomposedBlock {
  block_type: PromptBlockType;
  title_fa: string;
  block_template_en: string;
  slots_schema_json: unknown[];
}

/**
 * Intelligent regex and semantic segmenter that decomposes any full prompt into granular atomic blocks
 */
export function decomposePromptIntoBlocks(
  templateEn: string,
  titleFa: string,
  slotsSchema: unknown[] = []
): DecomposedBlock[] {
  const blocks: DecomposedBlock[] = [];
  const text = templateEn.trim();
  if (!text) return blocks;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let roleText = '';
  let taskLines: string[] = [];
  let constraintLines: string[] = [];
  let formatLines: string[] = [];

  let currentSection: 'NONE' | 'ROLE' | 'TASK' | 'CONSTRAINT' | 'FORMAT' = 'NONE';

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Section header detection
    if (/^(role|persona|identity):/i.test(line) || /^(act as|you are an?|imagine you are)\b/i.test(line)) {
      currentSection = 'ROLE';
      roleText += (roleText ? ' ' : '') + line.replace(/^(role|persona|identity):\s*/i, '');
      continue;
    }

    if (/^(task|assignment|instruction|objective|goal|problem):/i.test(line) || /^(develop|create|generate|write|design)\b/i.test(line) && !roleText) {
      currentSection = 'TASK';
      taskLines.push(line.replace(/^(task|assignment|instruction|objective|goal|problem):\s*/i, ''));
      continue;
    }

    if (/^(constraints?|rules?|guidelines?|requirements?|boundaries):/i.test(line) || /^do not\b|^ensure that\b|^never\b/i.test(line)) {
      currentSection = 'CONSTRAINT';
      constraintLines.push(line.replace(/^(constraints?|rules?|guidelines?|requirements?|boundaries):\s*/i, ''));
      continue;
    }

    if (/^(format|output format|structure|response format):/i.test(line) || /^return in\b|^output as\b/i.test(line)) {
      currentSection = 'FORMAT';
      formatLines.push(line.replace(/^(format|output format|structure|response format):\s*/i, ''));
      continue;
    }

    // Append to current section or default to TASK
    if (currentSection === 'ROLE') {
      roleText += ' ' + line;
    } else if (currentSection === 'CONSTRAINT') {
      constraintLines.push(line);
    } else if (currentSection === 'FORMAT') {
      formatLines.push(line);
    } else {
      taskLines.push(line);
    }
  }

  // Fallback defaults if sections were not cleanly demarcated
  if (!roleText) {
    const firstLine = lines[0] || '';
    if (firstLine.length < 150) {
      roleText = `Act as an expert in ${titleFa}. Follow instructions meticulously.`;
    } else {
      roleText = firstLine;
    }
  }

  const finalTask = taskLines.length > 0 ? taskLines.join('\n') : text;

  // Filter relevant slots for each block
  const getRelevantSlots = (blockText: string) => {
    if (!Array.isArray(slotsSchema)) return [];
    return slotsSchema.filter((slot): slot is { slot_key?: string } => {
      const s = slot as { slot_key?: string } | null | undefined;
      const key = s?.slot_key;
      return typeof key === 'string' && blockText.includes(`{{${key}}}`);
    });
  };

  // 1. Role Block
  blocks.push({
    block_type: 'ROLE',
    title_fa: `نقش تخصصی: ${titleFa}`,
    block_template_en: roleText,
    slots_schema_json: getRelevantSlots(roleText)
  });

  // 2. Task Block
  blocks.push({
    block_type: 'TASK',
    title_fa: `ماموریت اصلی: ${titleFa}`,
    block_template_en: finalTask,
    slots_schema_json: getRelevantSlots(finalTask)
  });

  // 3. Constraint Block
  if (constraintLines.length > 0) {
    const constraintText = constraintLines.join('\n');
    blocks.push({
      block_type: 'CONSTRAINT',
      title_fa: `محدودیت‌ها و الزامات: ${titleFa}`,
      block_template_en: constraintText,
      slots_schema_json: getRelevantSlots(constraintText)
    });
  }

  // 4. Format Block
  if (formatLines.length > 0) {
    const formatText = formatLines.join('\n');
    blocks.push({
      block_type: 'FORMAT',
      title_fa: `قالب خروجی: ${titleFa}`,
      block_template_en: formatText,
      slots_schema_json: getRelevantSlots(formatText)
    });
  }

  return blocks;
}

/**
 * Persist decomposed granulated atomic blocks into prompt_blocks table for future Atomic Prompt Engine
 */
export async function persistPromptAtomicBlocks(
  promptId: string,
  modality: string,
  templateEn: string,
  titleFa: string,
  slotsSchema: unknown[] = []
): Promise<number> {
  const blocks = decomposePromptIntoBlocks(templateEn, titleFa, slotsSchema);
  if (blocks.length === 0) return 0;

  // Clean old blocks for this prompt if updating
  await pool.query('DELETE FROM prompt_blocks WHERE source_prompt_id = $1', [promptId]).catch(() => {});

  let savedCount = 0;
  for (const block of blocks) {
    try {
      let embedding: string;
      try {
        embedding = await generateEmbedding(`${block.title_fa}\n${block.block_template_en}`);
      } catch {
        embedding = generateMockEmbedding(block.title_fa + block.block_template_en);
      }

      await pool.query(`
        INSERT INTO prompt_blocks (
          source_prompt_id, block_type, modality, title_fa, block_template_en, slots_schema_json, embedding, usage_count, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
      `, [
        promptId,
        block.block_type,
        modality,
        block.title_fa.slice(0, 160),
        block.block_template_en,
        JSON.stringify(block.slots_schema_json),
        embedding
      ]);
      savedCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ promptId, blockType: block.block_type, err: msg }, 'Failed to persist atomic block');
    }
  }

  return savedCount;
}
