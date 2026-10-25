import type { PromptSlot, SavedContextProfile, PromptModality } from '@promptjoo/contracts';

export interface CompilePromptOptions {
  forceFarsiOutput?: boolean;
  modality?: PromptModality;
}

export interface CompilePromptResult {
  compiledText: string;
  missingRequiredSlots: string[];
  resolvedSlotValues: Record<string, string>;
}

export interface AtomicBlocksInput {
  role?: string;
  task: string;
  constraint?: string;
  format?: string;
}

const PERSIAN_CHAR_REGEX = /[\u0600-\u06FF\uFB8A\u067E\u0686\u06AF]/;

/**
 * Resolves slot value based on deterministic priority:
 * 1. User provided custom value (if non-empty)
 * 2. User saved personal context profile binding
 * 3. Default English value from slot definition
 */
export function resolveSlotValue(
  slot: PromptSlot,
  userValue?: string,
  profile?: Partial<SavedContextProfile>
): string {
  if (userValue !== undefined && userValue.trim() !== '') {
    return userValue.trim();
  }

  if (profile && slot.profile_binding_key !== 'NONE') {
    switch (slot.profile_binding_key) {
      case 'BRAND_NAME':
        if (profile.brand_name) return profile.brand_name;
        break;
      case 'NICHE_TOPIC':
        if (profile.niche_topic) return profile.niche_topic;
        break;
      case 'TARGET_AUDIENCE':
        if (profile.target_audience) return profile.target_audience;
        break;
      case 'BRAND_TONE':
        if (profile.brand_tone) return profile.brand_tone.toLowerCase();
        break;
      case 'CALL_TO_ACTION':
        if (profile.call_to_action) return profile.call_to_action;
        break;
    }
  }

  return slot.default_value_en;
}

/**
 * Compiles a raw template string with slot variables into a final prompt.
 */
export function compilePrompt(
  template: string,
  slots: PromptSlot[],
  userValues: Record<string, string> = {},
  profile?: Partial<SavedContextProfile>,
  options: CompilePromptOptions = {}
): CompilePromptResult {
  let compiledText = template;
  const missingRequiredSlots: string[] = [];
  const resolvedSlotValues: Record<string, string> = {};
  let containsFarsiInValues = false;

  for (const slot of slots) {
    const value = resolveSlotValue(slot, userValues[slot.slot_key], profile);
    resolvedSlotValues[slot.slot_key] = value;

    if (!value) {
      missingRequiredSlots.push(slot.slot_key);
    }

    if (PERSIAN_CHAR_REGEX.test(value)) {
      containsFarsiInValues = true;
    }

    // Replace all instances of {{slot_key}} or {slot_key} safely without regex dollar injection
    const regexDouble = new RegExp(`\\{\\{${slot.slot_key}\\}\\}`, 'g');
    const regexSingle = new RegExp(`\\{${slot.slot_key}\\}`, 'g');
    compiledText = compiledText.replace(regexDouble, () => value).replace(regexSingle, () => value);
  }

  // Language & Visual Directives
  const modality = options.modality ?? 'text_writing';

  if (
    options.forceFarsiOutput &&
    (modality === 'text_writing' || modality === 'data_structuring' || modality === 'code_tech')
  ) {
    compiledText += '\n\n[OUTPUT LANGUAGE DIRECTIVE: Process the instructions above carefully, and write the entire final response in natural, fluent Persian (fa-IR) tailored to Iranian context.]';
  } else if (
    (modality === 'image_edit' || modality === 'text_to_image' || modality === 'video_audio') &&
    containsFarsiInValues
  ) {
    compiledText += '\n\n[VISUAL DIRECTIVE - Persian/non-English terms above describe visual subjects or scene attributes to depict—do NOT render text or letters onto the image unless explicitly instructed.]';
  }

  return {
    compiledText: compiledText.trim(),
    missingRequiredSlots,
    resolvedSlotValues
  };
}

/**
 * Stitches atomic prompt blocks (ROLE, TASK, CONSTRAINT, FORMAT) into a unified template.
 */
export function stitchAtomicBlocks(blocks: AtomicBlocksInput): string {
  const parts: string[] = [];

  if (blocks.role && blocks.role.trim() !== '') {
    parts.push(`[ROLE]\n${blocks.role.trim()}`);
  }

  parts.push(`[TASK]\n${blocks.task.trim()}`);

  if (blocks.constraint && blocks.constraint.trim() !== '') {
    parts.push(`[CONSTRAINTS]\n${blocks.constraint.trim()}`);
  }

  if (blocks.format && blocks.format.trim() !== '') {
    parts.push(`[OUTPUT FORMAT]\n${blocks.format.trim()}`);
  }

  return parts.join('\n\n');
}
