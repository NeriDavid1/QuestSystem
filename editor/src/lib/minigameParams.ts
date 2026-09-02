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
 *
 * Asset references (previewImage, clip, referenceClip, wordRevealDatabase) are
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

export interface MinigameParamField {
  name: string
  labelKey: string
  hintKey?: string
  type: MinigameParamType
  default?: unknown
  min?: number
  max?: number
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

  // Shared
  wordRevealDatabase: { name: 'wordRevealDatabase', labelKey: 'minigameParamWordRevealDatabase', hintKey: 'minigameParamWordRevealDatabaseHint', type: 'asset', default: '' },
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
    .map((name) => MINIGAME_PARAM_FIELDS[name])
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
    .map((name) => MINIGAME_PARAM_FIELDS[name])
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
    const promptDefault = typeof MINIGAME_PARAM_FIELDS.prompt.default === 'string'
      ? MINIGAME_PARAM_FIELDS.prompt.default
      : ''
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
  if (fields.has('targetWords')) {
    const existing = next.targetWords
    if (!Array.isArray(existing) || existing.length === 0) {
      next.targetWords = [trimmedTarget]
    }
  }
  if (fields.has('targetPhrase') && !next.targetPhrase) {
    next.targetPhrase = trimmedTarget
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
    default:
      return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
  }
}
