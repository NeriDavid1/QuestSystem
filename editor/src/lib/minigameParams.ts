import type { CatalogEntry, EditorData, MinigameInstance, QuestStep } from './types'

/**
 * Editable parameter kinds. They mirror the public properties of the Unity data
 * ScriptableObjects behind each minigame config:
 *
 * - WordOrderingDataSO  → word_ordering
 * - LetterOrderingDataSO → letter_ordering
 * - SpeakAloudDataSO     → speak_aloud
 * - LetterConnectionLevelConfigSO → word_matching
 * - LetterPathSO         → letter_drawing
 * - MinerCategoryDataSO  → dwarf_miner
 * - SliceOrderingDataSO  → fruit_slice
 *
 * Asset references (previewImage, clip, referenceClip, background, wordRevealDatabase) are
 * stored as Unity asset paths so the editor can keep them in sync with the game.
 */
export type MinigameParamType =
  | 'string'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'stringArray'
  | 'integerArray'
  | 'charArray'
  | 'json'
  | 'asset'
  | 'select'

export interface MinigameParamField {
  name: string
  labelKey: string
  hintKey?: string
  type: MinigameParamType
  default?: unknown
  min?: number
  max?: number
  /** Allowed values for `select` fields (Unity enum names). */
  options?: string[]
  /** Rendered collapsed behind the "Advanced" toggle (optional Unity asset references). */
  advanced?: boolean
}

/** Shared field definitions keyed by the exact Unity data-SO property name. */
export const MINIGAME_PARAM_FIELDS: Record<string, MinigameParamField> = {
  // LetterOrderingDataSO
  prompt: { name: 'prompt', labelKey: 'minigameParamPrompt', hintKey: 'minigameParamPromptHint', type: 'textarea', default: 'Arrange the letters' },
  targetWord: { name: 'targetWord', labelKey: 'minigameParamTargetWord', type: 'string', default: '' },
  extraDistractorCount: { name: 'extraDistractorCount', labelKey: 'minigameParamExtraDistractors', type: 'integer', min: 0, default: 2 },
  customDistractors: { name: 'customDistractors', labelKey: 'minigameParamCustomDistractors', type: 'charArray', default: [] },

  // WordOrderingDataSO
  translation: { name: 'translation', labelKey: 'minigameParamTranslation', hintKey: 'minigameParamTranslationHint', type: 'textarea', default: '' },
  englishWordsInOrder: { name: 'englishWordsInOrder', labelKey: 'minigameParamEnglishWordsInOrder', type: 'stringArray', default: [] },
  preFilledIndices: { name: 'preFilledIndices', labelKey: 'minigameParamPreFilledIndices', hintKey: 'minigameParamPreFilledIndicesHint', type: 'integerArray', default: [] },
  distractorWords: { name: 'distractorWords', labelKey: 'minigameParamDistractorWords', type: 'stringArray', default: [] },

  // SpeakAloudDataSO
  targetWords: { name: 'targetWords', labelKey: 'minigameParamTargetWords', hintKey: 'minigameParamTargetWordsHint', type: 'stringArray', default: [] },
  targetPhrase: { name: 'targetPhrase', labelKey: 'minigameParamTargetPhrase', type: 'string', default: '' },
  silenceTimeoutSeconds: { name: 'silenceTimeoutSeconds', labelKey: 'minigameParamSilenceTimeout', type: 'number', min: 0.5, default: 2.5 },
  allowFuzzyMatch: { name: 'allowFuzzyMatch', labelKey: 'minigameParamAllowFuzzyMatch', type: 'boolean', default: true },
  referenceClip: { name: 'referenceClip', labelKey: 'minigameParamReferenceClip', type: 'asset', default: '' },

  // LetterConnectionLevelConfigSO
  letters: { name: 'letters', labelKey: 'minigameParamLetters', type: 'json', default: [] },
  wordTasks: { name: 'wordTasks', labelKey: 'minigameParamWordTasks', type: 'json', default: [] },

  // LetterPathSO
  letter: { name: 'letter', labelKey: 'minigameParamLetter', type: 'string', default: 'A' },
  strokes: { name: 'strokes', labelKey: 'minigameParamStrokes', type: 'json', default: [] },
  previewImage: { name: 'previewImage', labelKey: 'minigameParamPreviewImage', type: 'asset', default: '' },
  clip: { name: 'clip', labelKey: 'minigameParamClip', type: 'asset', default: '' },

  // MinerCategoryDataSO
  categoryLabel: { name: 'categoryLabel', labelKey: 'minigameParamCategoryLabel', hintKey: 'minigameParamCategoryLabelHint', type: 'string', default: '' },
  requiredCorrect: { name: 'requiredCorrect', labelKey: 'minigameParamRequiredCorrect', hintKey: 'minigameParamRequiredCorrectHint', type: 'integer', min: 1, default: 5 },
  allowedMistakes: { name: 'allowedMistakes', labelKey: 'minigameParamAllowedMistakes', hintKey: 'minigameParamAllowedMistakesHint', type: 'integer', min: 1, default: 3 },

  // SliceOrderingDataSO
  segmentation: { name: 'segmentation', labelKey: 'minigameParamSegmentation', hintKey: 'minigameParamSegmentationHint', type: 'select', options: ['Letters', 'Words'], default: 'Letters' },
  targetText: { name: 'targetText', labelKey: 'minigameParamTargetText', hintKey: 'minigameParamTargetTextHint', type: 'string', default: '' },
  distractors: { name: 'distractors', labelKey: 'minigameParamDistractors', hintKey: 'minigameParamDistractorsHint', type: 'stringArray', default: [] },
  extraLetterDistractorCount: { name: 'extraLetterDistractorCount', labelKey: 'minigameParamExtraDistractors', hintKey: 'minigameParamExtraLetterDistractorsHint', type: 'integer', min: 0, default: 2 },

  // Shared
  background: { name: 'background', labelKey: 'minigameParamBackground', hintKey: 'minigameParamBackgroundHint', type: 'asset', default: '', advanced: true },
  wordRevealDatabase: { name: 'wordRevealDatabase', labelKey: 'minigameParamWordRevealDatabase', hintKey: 'minigameParamWordRevealDatabaseHint', type: 'asset', default: '', advanced: true },
}

/**
 * Per-game tweaks to a shared field: the Unity property name is the same but the
 * data SO gives it a different default or meaning (e.g. each game's `prompt` default).
 */
const MINIGAME_FIELD_OVERRIDES: Record<string, Record<string, Partial<MinigameParamField>>> = {
  dwarf_miner: {
    prompt: { default: 'Collect the right words' },
    targetWords: { hintKey: 'minigameParamMinerTargetWordsHint' },
    distractorWords: { hintKey: 'minigameParamMinerDistractorWordsHint' },
  },
  fruit_slice: {
    prompt: { default: 'Slice them in the right order' },
    preFilledIndices: { hintKey: 'minigameParamSlicePreFilledIndicesHint' },
  },
}

export function defaultValueForType(type: MinigameParamType): unknown {
  switch (type) {
    case 'boolean':
      return false
    case 'number':
      return 0
    case 'integer':
      return 0
    case 'stringArray':
    case 'integerArray':
    case 'charArray':
    case 'json':
      return []
    default:
      return ''
  }
}

function resolveField(minigameId: string | null | undefined, name: string): MinigameParamField | undefined {
  const base = MINIGAME_PARAM_FIELDS[name]
  if (!base) return undefined
  const override = minigameId ? MINIGAME_FIELD_OVERRIDES[minigameId]?.[name] : undefined
  return override ? { ...base, ...override } : base
}

function getMetadataArray(entry: CatalogEntry | undefined, key: string): string[] {
  const value = entry?.metadata?.[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** The `content_fields` declared on the catalog minigame entry (from _registry/minigames.yaml). */
export function getMinigameParamFieldNames(entry: CatalogEntry | undefined): string[] {
  return getMetadataArray(entry, 'content_fields')
}

/** The allowed gameplay variants declared on the catalog minigame entry. */
export function getMinigameVariantsForEntry(entry: CatalogEntry | undefined): string[] {
  return getMetadataArray(entry, 'variants')
}

/** Resolve the editable parameter fields for a catalog minigame entry. */
export function getMinigameParamsForEntry(entry: CatalogEntry | undefined): MinigameParamField[] {
  return getMinigameParamFieldNames(entry)
    .map((name) => resolveField(entry?.external_id, name))
    .filter((field): field is MinigameParamField => Boolean(field))
}

/** Catalog minigame entry referenced by a step's `minigame_id` payload. */
export function getMinigameCatalogEntry(data: EditorData, step: QuestStep): CatalogEntry | undefined {
  const minigameId = step.payload.minigame_id
  if (typeof minigameId !== 'string' || !minigameId) return undefined
  return data.catalog.find((entry) => entry.kind === 'minigame' && entry.external_id === minigameId)
}

/** Default params for a catalog minigame entry (used when creating an instance). */
export function defaultParamsForEntry(entry: CatalogEntry | undefined): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const field of getMinigameParamsForEntry(entry)) {
    params[field.name] = field.default ?? defaultValueForType(field.type)
  }
  return params
}

/**
 * Fields for a minigame instance regardless of step context.
 * Prefer `minigame_id` (catalog kind). Fall back to legacy variant=external_id,
 * then to keys already present on params.
 */
export function getMinigameParamFieldsForInstance(
  data: EditorData,
  minigame: MinigameInstance,
): MinigameParamField[] {
  const kind = minigame.minigame_id || minigame.variant
  const byKind = data.catalog.find(
    (entry) => entry.kind === 'minigame' && entry.external_id === kind,
  )
  if (byKind) return getMinigameParamsForEntry(byKind)
  const present = Object.keys(minigame.params ?? {})
  if (present.length === 0) return []
  return present
    .map((name) => resolveField(kind, name))
    .filter((field): field is MinigameParamField => Boolean(field))
}

/** Catalog entry for an instance's minigame_id (or legacy variant). */
export function getMinigameCatalogEntryForInstance(
  data: EditorData,
  minigame: MinigameInstance,
): CatalogEntry | undefined {
  const kind = minigame.minigame_id || minigame.variant
  if (!kind) return undefined
  return data.catalog.find((entry) => entry.kind === 'minigame' && entry.external_id === kind)
}

/**
 * Seed gameplay params from a brief target when creating or attaching an instance.
 * Does not overwrite keys that already have a non-empty value.
 */
export function seedParamsFromBrief(
  entry: CatalogEntry | undefined,
  params: Record<string, unknown>,
  target: string | null | undefined,
  instruction: string | null | undefined,
): Record<string, unknown> {
  const next = { ...params }
  const fields = new Set(getMinigameParamFieldNames(entry))
  const trimmedTarget = (target ?? '').trim()
  const trimmedInstruction = (instruction ?? '').trim()

  if (fields.has('prompt')) {
    const currentPrompt = typeof next.prompt === 'string' ? next.prompt.trim() : ''
    const promptField = resolveField(entry?.external_id, 'prompt')
    const promptDefault = typeof promptField?.default === 'string' ? promptField.default : ''
    if ((!currentPrompt || currentPrompt === promptDefault) && trimmedInstruction) {
      next.prompt = trimmedInstruction
    }
  }
  if (!trimmedTarget) return next

  if (fields.has('targetWord') && !next.targetWord) {
    next.targetWord = trimmedTarget
  }
  if (fields.has('englishWordsInOrder')) {
    const existing = next.englishWordsInOrder
    if (!Array.isArray(existing) || existing.length === 0) {
      next.englishWordsInOrder = trimmedTarget
        .split(/\s+/)
        .map((word) => word.replace(/[.,!?;:]+$/g, ''))
        .filter(Boolean)
    }
  }
  // Speak Aloud: seed only the phrase and leave targetWords empty, which is Unity's phrase mode.
  if (fields.has('targetPhrase') && !next.targetPhrase) {
    next.targetPhrase = trimmedTarget
  }
  // Dwarf Miner: a comma-separated target lists the words that belong to the category.
  if (fields.has('categoryLabel')) {
    const existing = next.targetWords
    if (!Array.isArray(existing) || existing.length === 0) {
      next.targetWords = trimmedTarget.split(',').map((word) => word.trim()).filter(Boolean)
    }
  }
  // Fruit Slice: a target with spaces is a sentence, sliced word by word.
  if (fields.has('targetText') && !next.targetText) {
    next.targetText = trimmedTarget
    if (fields.has('segmentation') && /\s/.test(trimmedTarget)) next.segmentation = 'Words'
  }
  return next
}

/** Read a parameter value, falling back to the field default when unset. */
export function readMinigameParam(minigame: MinigameInstance, field: MinigameParamField): unknown {
  const value = minigame.params?.[field.name]
  if (value === undefined || value === null || value === '') {
    return field.default ?? defaultValueForType(field.type)
  }
  return value
}

/** Coerce a raw editor value to the field's expected shape before persisting. */
export function normalizeParamValue(field: MinigameParamField, value: unknown): unknown {
  switch (field.type) {
    case 'boolean':
      return value === true || value === 'true' || value === 1 || value === '1'
    case 'number': {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    }
    case 'integer': {
      const n = Number(value)
      return Number.isFinite(n) ? Math.trunc(n) : 0
    }
    case 'stringArray':
      return Array.isArray(value) ? value.map((item) => String(item ?? '')) : []
    case 'integerArray':
      return Array.isArray(value)
        ? value.map((item) => Math.trunc(Number(item))).filter((item) => Number.isFinite(item))
        : []
    case 'charArray':
      return Array.isArray(value)
        ? value.map((item) => (String(item ?? '').trim()[0] ?? ''))
        : []
    case 'json':
      return value
    case 'select': {
      const text = typeof value === 'string' ? value : String(value ?? '')
      const options = field.options ?? []
      if (options.length === 0 || options.includes(text)) return text
      return field.default ?? options[0]
    }
    default:
      return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
  }
}
