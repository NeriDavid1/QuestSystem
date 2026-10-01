import type { MessageKey } from '../i18n/messages'
import { CUSTOM_STEP, customStepSummary } from './customSteps'
import { getCatalogKindForRef, getStepType } from './editorData'
import type { Translate } from './labels'
import type { EditorData, QuestStep, StepField, StepTypeDefinition } from './types'

/**
 * One place for how a step type looks in the editor: icon, translated name,
 * one-line summary and field labels. Step ids and payload keys stay exactly as
 * Unity's Database Sync reads them; only the presentation lives here.
 */

const KNOWN_STEP_TYPES = [
  'talk_to_npc',
  'return_to_npc',
  'reach_location',
  'play_minigame',
  'collect_item',
  'deliver_item',
] as const

type KnownStepType = typeof KNOWN_STEP_TYPES[number]

const STEP_ICONS: Record<KnownStepType, string> = {
  talk_to_npc: '♙',
  return_to_npc: '↩',
  reach_location: '⌖',
  play_minigame: '⌘',
  collect_item: '✦',
  deliver_item: '⇢',
}

const KNOWN_FIELDS = new Set([
  'npc_id', 'dialogue_id', 'optional_flag', 'minigame_id', 'world_object_id', 'difficulty',
  'success_required', 'instance_id', 'reward_item_id', 'reward_amount', 'item_id', 'amount',
  'location_id', 'radius',
])

function isKnownStepType(id: string): id is KnownStepType {
  return (KNOWN_STEP_TYPES as readonly string[]).includes(id)
}

function humanize(id: string): string {
  return id.replaceAll('_', ' ')
}

export function stepTypeIcon(stepType: string): string {
  if (stepType === CUSTOM_STEP) return '◈'
  return isKnownStepType(stepType) ? STEP_ICONS[stepType] : '•'
}

export function stepTypeName(t: Translate, stepType: string): string {
  if (stepType === CUSTOM_STEP) return t('stepName_custom')
  return isKnownStepType(stepType) ? t(`stepName_${stepType}` as MessageKey) : humanize(stepType)
}

export function stepTypeHint(t: Translate, definition: StepTypeDefinition): string {
  if (definition.id === CUSTOM_STEP) return t('stepHint_custom')
  return isKnownStepType(definition.id) ? t(`stepHint_${definition.id}` as MessageKey) : definition.description ?? ''
}

export function stepFieldLabel(t: Translate, fieldName: string): string {
  return KNOWN_FIELDS.has(fieldName) ? t(`stepField_${fieldName}` as MessageKey) : humanize(fieldName)
}

/**
 * Step types an author can pick, in the order a quest usually flows, followed by any others from the
 * database. `custom` steps come only from Unity, so they are never offered.
 */
export function orderedStepTypes(data: EditorData): StepTypeDefinition[] {
  const rank = (id: string) => {
    const index = (KNOWN_STEP_TYPES as readonly string[]).indexOf(id)
    return index === -1 ? KNOWN_STEP_TYPES.length : index
  }
  return data.stepTypes
    .filter((type) => type.id !== CUSTOM_STEP)
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id))
}

function catalogName(data: EditorData, field: StepField | undefined, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  const kind = getCatalogKindForRef(field?.ref)
  const entry = kind ? data.catalog.find((item) => item.kind === kind && item.external_id === String(value)) : undefined
  return entry?.name || String(value)
}

/** A one-line, human description of what the step asks the player to do. */
export function stepSummary(t: Translate, data: EditorData, step: QuestStep): string {
  if (step.step_type === CUSTOM_STEP) return customStepSummary(t, step)
  if (!isKnownStepType(step.step_type)) return step.key
  const definition = getStepType(data, step.step_type)
  const unset = t('stepSummaryUnset')
  const named = (fieldName: string) =>
    catalogName(data, definition?.fields.find((field) => field.name === fieldName), step.payload[fieldName]) ?? unset
  const amount = Number(step.payload.amount) > 0 ? String(step.payload.amount) : '1'
  return t(`stepSummary_${step.step_type}` as MessageKey, {
    npc: named('npc_id'),
    area: named('location_id'),
    game: named('minigame_id'),
    station: named('world_object_id'),
    item: named('item_id'),
    amount,
  })
}

/**
 * Starting payload for a new step of this type: required fields (at their
 * definition default or minimum), switches at their default, the quest giver
 * for character fields, and — for a delivery — the item the previous step
 * rewarded or collected (the canonical play_minigame → deliver_item pattern).
 */
export function defaultStepPayload(
  definition: StepTypeDefinition | undefined,
  context: { giver: string | null; previousStep?: QuestStep },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of definition?.fields ?? []) {
    if (field.name === 'npc_id') payload.npc_id = context.giver ?? ''
    else if (field.default !== undefined && (field.required || field.type === 'boolean')) payload[field.name] = field.default
    else if (field.type === 'integer' && field.required) payload[field.name] = field.min ?? 1
    else if (field.required) payload[field.name] = ''
  }
  const previous = context.previousStep?.payload
  const previousItem = previous?.reward_item_id || previous?.item_id
  if (definition?.id === 'deliver_item' && previousItem) {
    payload.item_id = previousItem
    payload.amount = Number(previous?.reward_amount ?? previous?.amount) || 1
  }
  return payload
}

/**
 * Payload after switching a step to another type: values for fields both types
 * share are kept, defaults fill the rest, and fields the new type does not
 * declare are dropped so they are not published. The minigame content link
 * (`instance_key`) stays on minigame steps.
 */
export function retypeStepPayload(
  definition: StepTypeDefinition | undefined,
  previous: Record<string, unknown>,
  context: { giver: string | null },
): Record<string, unknown> {
  const next = defaultStepPayload(definition, context)
  for (const field of definition?.fields ?? []) {
    if (previous[field.name] !== undefined) next[field.name] = previous[field.name]
  }
  if (definition?.id === 'play_minigame' && previous.instance_key !== undefined) {
    next.instance_key = previous.instance_key
  }
  return next
}

/**
 * A cleared number field stays empty (so the required-field check flags it)
 * instead of silently becoming 0; typed values are kept within min/max.
 */
export function parseNumberInput(raw: string, field: Pick<StepField, 'type' | 'min' | 'max'>): number | '' {
  if (raw.trim() === '') return ''
  const parsed = field.type === 'integer' ? Math.round(Number(raw)) : Number(raw)
  if (Number.isNaN(parsed)) return ''
  const aboveMin = field.min !== undefined ? Math.max(field.min, parsed) : parsed
  return field.max !== undefined ? Math.min(field.max, aboveMin) : aboveMin
}
