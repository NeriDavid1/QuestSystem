import type {
  CatalogKind,
  DialogueLine,
  EditorData,
  MinigameInstance,
  Quest,
  QuestPrerequisite,
  QuestReward,
  QuestStep,
  Questline,
  StepTypeDefinition,
} from './types'

export const DEFAULT_DIALOGUE_LOCALE = 'he'

export function makeLocalId(_prefix: string): string {
  return crypto.randomUUID()
}

export function isLocalId(id: string): boolean {
  return id.startsWith('local-')
}

/** ASCII snake segment; empty when nothing slugifiable remains. */
export function slugSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function slugify(value: string): string {
  return slugSegment(value) || `line_${Date.now().toString(36)}`
}

export function uniqueExactKey(existingKeys: Iterable<string>, baseKey: string): string {
  const keys = new Set(existingKeys)
  if (!keys.has(baseKey)) return baseKey
  let suffix = 2
  while (keys.has(`${baseKey}_${suffix}`)) suffix += 1
  return `${baseKey}_${suffix}`
}

export function uniqueKey(existingKeys: Iterable<string>, baseKey: string, fallback = 'new_item'): string {
  const normalized = slugify(baseKey) || fallback
  return uniqueExactKey(existingKeys, normalized)
}

/**
 * Content keys that are already snake_case (including line-scoped `__` keys) must not be
 * re-slugified — slugify collapses `__` to `_` and would destroy ownership prefixes.
 */
export function normalizeContentKey(baseKey: string, fallback = 'new_item'): string {
  const trimmed = baseKey.trim().toLowerCase()
  if (/^[a-z0-9_]+$/.test(trimmed)) return trimmed
  return slugify(baseKey) || fallback
}

export function uniqueQuestKey(data: EditorData, baseKey: string, excludeQuestId?: string): string {
  const existing = data.quests
    .filter((quest) => quest.id !== excludeQuestId)
    .map((quest) => quest.key)
  return uniqueExactKey(existing, normalizeContentKey(baseKey, 'new_quest'))
}

/** Line-scoped quest key stem: `{lineKey}__q{NN}_{slug}`. */
export function suggestQuestBaseKey(lineKey: string, position: number, name: string): string {
  const line = slugSegment(lineKey) || 'questline'
  const nn = String(Math.max(0, position) + 1).padStart(2, '0')
  let slug = slugSegment(name) || 'new_quest'
  const scopedPrefix = `${line}__`
  if (slug.startsWith(scopedPrefix)) slug = slug.slice(scopedPrefix.length) || 'new_quest'
  // Drop accidental qNN_ prefix when regenerating from an existing key-like name.
  slug = slug.replace(/^q\d+_/, '') || 'new_quest'
  return `${line}__q${nn}_${slug}`
}

/** Globally unique quest key for Unity OpenWorld / Guider lookup. */
export function allocateQuestKey(
  data: EditorData,
  lineKey: string,
  position: number,
  name: string,
  excludeQuestId?: string,
): string {
  return uniqueQuestKey(data, suggestQuestBaseKey(lineKey, position, name), excludeQuestId)
}

/** Step key derived from the owning quest key: `{questKey}_s{NN}`. */
export function suggestStepKey(questKey: string, position: number): string {
  const quest = normalizeContentKey(questKey, 'quest')
  const nn = String(Math.max(0, position) + 1).padStart(2, '0')
  return `${quest}_s${nn}`
}

export function allocateStepKey(
  data: EditorData,
  questId: string,
  questKey: string,
  position: number,
  excludeStepId?: string,
): string {
  const existing = data.steps
    .filter((step) => step.quest_id === questId && step.id !== excludeStepId)
    .map((step) => step.key)
  return uniqueExactKey(existing, suggestStepKey(questKey, position))
}

/** True when the key still looks auto-managed (scoped or placeholder), so drafts may refresh it. */
export function isAutoManagedQuestKey(key: string, lineKey: string): boolean {
  const line = slugify(lineKey) || 'questline'
  if (key.startsWith(`${line}__`)) return true
  if (/^q\d+_new_quest(_\d+)?$/.test(key)) return true
  if (/_new_quest(_\d+)?$/.test(key)) return true
  return false
}

/**
 * For draft quests only: if the key is still auto-managed, return a refreshed globally unique key.
 * Returns null when the key must stay frozen (published/complete or manually customized).
 */
export function refreshDraftQuestKey(
  data: EditorData,
  quest: Quest,
  lineKey: string,
  newName: string,
): string | null {
  if (quest.status === 'published' || quest.status === 'complete' || quest.status === 'archived') {
    return null
  }
  if (!isAutoManagedQuestKey(quest.key, lineKey)) return null
  return allocateQuestKey(data, lineKey, quest.position, newName, quest.id)
}

/** True when a quest key uses the line-scoped `{lineKey}__…` scheme. */
export function isLineScopedQuestKey(key: string, lineKey: string): boolean {
  const line = slugify(lineKey) || 'questline'
  return key.startsWith(`${line}__`)
}

export function uniqueQuestlineKey(data: EditorData, baseKey: string): string {
  return uniqueKey(data.questlines.map((line) => line.key), baseKey, 'new_questline')
}

export function uniqueDialogueKey(data: EditorData, baseKey: string, excludeDialogueId?: string): string {
  const existing = data.dialogues
    .filter((dialogue) => dialogue.id !== excludeDialogueId)
    .map((dialogue) => dialogue.key)
  return uniqueKey(existing, baseKey, 'new_dialogue')
}

export function uniqueMinigameKey(data: EditorData, baseKey: string): string {
  return uniqueKey(data.minigames.map((minigame) => minigame.key), baseKey, 'new_minigame')
}

/**
 * Build a stable dialogue key stem from questline / quest / role (step key, start, turn_in).
 * Empty or non-slugifiable segments are skipped so Hebrew display names don't inject timestamps.
 */
export function suggestDialogueBaseKey(...segments: Array<string | null | undefined>): string {
  const parts: string[] = []
  for (const segment of segments) {
    if (!segment?.trim()) continue
    const ascii = segment
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
    if (ascii) parts.push(ascii)
  }
  return parts.join('_') || 'new_dialogue'
}

export function getDialogueLines(data: EditorData, dialogueId: string): DialogueLine[] {
  return data.dialogueLines
    .filter((line) => line.dialogue_id === dialogueId)
    .sort((a, b) => a.line_order - b.line_order || a.locale.localeCompare(b.locale))
}

export function stepHasDialogueField(data: EditorData, step: QuestStep): boolean {
  return Boolean(getStepType(data, step.step_type)?.fields.some((field) => field.ref?.includes('dialogues')))
}

export function stepHasMinigameField(data: EditorData, step: QuestStep): boolean {
  return Boolean(
    getStepType(data, step.step_type)?.fields.some((field) => field.ref?.includes('minigame_instances')),
  )
}

/**
 * The minigame instance key attached to a step. New editor steps store it under
 * `instance_id`, while steps produced by the import pipeline (YAML -> Supabase)
 * store the resolved instance key under `instance_key`. Accept both so imported
 * questlines render their minigame briefs without re-authoring.
 */
export function getStepMinigameKey(step: QuestStep): string {
  const instanceId = typeof step.payload.instance_id === 'string' ? step.payload.instance_id : ''
  if (instanceId) return instanceId
  const instanceKey = typeof step.payload.instance_key === 'string' ? step.payload.instance_key : ''
  return instanceKey
}

/** The localized minigame instance attached to a step via its instance key payload. */
export function getStepMinigame(data: EditorData, step: QuestStep): MinigameInstance | undefined {
  const instanceKey = getStepMinigameKey(step)
  if (!instanceKey) return undefined
  return data.minigames.find((minigame) => minigame.key === instanceKey)
}

export function getQuestlineQuests(data: EditorData, questlineId: string): Quest[] {
  return data.quests
    .filter((quest) => quest.questline_id === questlineId)
    .sort((a, b) => a.position - b.position)
}

export function getQuestSteps(data: EditorData, questId: string): QuestStep[] {
  return data.steps
    .filter((step) => step.quest_id === questId)
    .sort((a, b) => a.position - b.position)
}

export function getQuestRewards(data: EditorData, questId: string): QuestReward[] {
  return data.rewards.filter((reward) => reward.scope === 'quest' && reward.quest_id === questId)
}

export function getStepRewards(data: EditorData, stepId: string): QuestReward[] {
  return data.rewards.filter((reward) => reward.scope === 'step' && reward.step_id === stepId)
}

export function getQuestPrerequisites(data: EditorData, questId: string): QuestPrerequisite[] {
  return data.prerequisites.filter((edge) => edge.quest_id === questId)
}

export function getStepType(data: EditorData, stepType: string): StepTypeDefinition | undefined {
  return data.stepTypes.find((definition) => definition.id === stepType)
}

export function getCatalogKindForRef(ref: string | undefined): CatalogKind | null {
  if (!ref) return null
  if (ref.includes('npcs')) return 'npc'
  if (ref.includes('areas')) return 'area'
  if (ref.includes('interactables')) return 'interactable'
  if (ref.includes('items')) return 'item'
  if (ref.includes('minigames')) return 'minigame'
  return null
}

export function buildSnapshotDocument(data: EditorData, line: Questline): Record<string, unknown> {
  const quests = getQuestlineQuests(data, line.id).map((quest) => {
    const prerequisites = data.prerequisites
      .filter((edge) => edge.quest_id === quest.id)
      .map((edge) => data.quests.find((candidate) => candidate.id === edge.prerequisite_quest_id)?.key)
      .filter((key): key is string => Boolean(key))

    const rewards = getQuestRewards(data, quest.id).map((reward) => ({
      amount: reward.amount,
      item_external_id: reward.item_external_id,
      reward_type: reward.reward_type,
      scope: reward.scope,
      source_metadata: reward.source_metadata,
      step_key: null,
      xp_amount: reward.xp_amount,
    }))

    const steps = getQuestSteps(data, quest.id).map((step) => ({
      key: step.key,
      payload: step.payload,
      position: step.position,
      rewards: getStepRewards(data, step.id).map((reward) => ({
        amount: reward.amount,
        item_external_id: reward.item_external_id,
        reward_type: reward.reward_type,
        scope: reward.scope,
        source_metadata: reward.source_metadata,
        step_key: step.key,
        xp_amount: reward.xp_amount,
      })),
      source_metadata: step.source_metadata,
      type: step.step_type,
    }))

    return {
      giver_external_id: quest.giver_external_id,
      key: quest.key,
      level_required: quest.level_required,
      name: quest.name,
      position: quest.position,
      prerequisites,
      rewards,
      source_metadata: quest.source_metadata,
      source_path: quest.source_path,
      status: quest.status,
      steps,
      summary: quest.summary,
      wait_for_npc_turn_in: quest.wait_for_npc_turn_in ?? false,
      start_dialogue_id: quest.start_dialogue_id || null,
      turn_in_dialogue_id: quest.turn_in_dialogue_id || null,
    }
  })

  const dialogueKeys = new Set<string>()
  const minigameKeys = new Set<string>()
  for (const quest of quests) {
    if (typeof quest.start_dialogue_id === 'string' && quest.start_dialogue_id) {
      dialogueKeys.add(quest.start_dialogue_id)
    }
    if (typeof quest.turn_in_dialogue_id === 'string' && quest.turn_in_dialogue_id) {
      dialogueKeys.add(quest.turn_in_dialogue_id)
    }
    for (const step of quest.steps) {
      const payload = step.payload && typeof step.payload === 'object'
        ? (step.payload as Record<string, unknown>)
        : {}
      if (typeof payload.dialogue_id === 'string' && payload.dialogue_id) {
        dialogueKeys.add(payload.dialogue_id)
      }
      if (typeof payload.instance_id === 'string' && payload.instance_id) {
        minigameKeys.add(payload.instance_id)
      }
      if (typeof payload.instance_key === 'string' && payload.instance_key) {
        minigameKeys.add(payload.instance_key)
      }
    }
  }

  const dialogues: Record<string, { speaker: string | null; lines: string[] }> = {}
  for (const key of dialogueKeys) {
    const dialogue = data.dialogues.find((item) => item.key === key)
    if (!dialogue) continue
    const lines = data.dialogueLines
      .filter((line) => line.dialogue_id === dialogue.id)
      .sort((a, b) => a.line_order - b.line_order || a.locale.localeCompare(b.locale))
      .map((line) => line.content)
    dialogues[key] = {
      speaker: dialogue.speaker_external_id,
      lines,
    }
  }

  const minigames: Record<string, Record<string, unknown>> = {}
  for (const key of minigameKeys) {
    const instance = data.minigames.find((item) => item.key === key)
    if (!instance) continue
    minigames[key] = {
      minigame_id: instance.minigame_id,
      instruction: instance.instruction,
      tasks: instance.tasks,
      target: instance.target,
      variant: instance.variant,
      success: instance.success,
      params: instance.params,
    }
  }

  return {
    default_giver_external_id: line.default_giver_external_id,
    display_name: line.display_name,
    key: line.key,
    quests,
    theme: line.theme,
    dialogues,
    minigames,
  }
}
