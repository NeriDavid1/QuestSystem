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

export function slugify(value: string): string {
  const ascii = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return ascii || `line_${Date.now().toString(36)}`
}

export function uniqueKey(existingKeys: Iterable<string>, baseKey: string, fallback = 'new_item'): string {
  const normalized = slugify(baseKey) || fallback
  const keys = new Set(existingKeys)
  if (!keys.has(normalized)) return normalized
  let suffix = 2
  while (keys.has(`${normalized}_${suffix}`)) suffix += 1
  return `${normalized}_${suffix}`
}

export function uniqueQuestKey(data: EditorData, baseKey: string): string {
  return uniqueKey(data.quests.map((quest) => quest.key), baseKey, 'new_quest')
}

export function uniqueQuestlineKey(data: EditorData, baseKey: string): string {
  return uniqueKey(data.questlines.map((line) => line.key), baseKey, 'new_questline')
}

export function uniqueDialogueKey(data: EditorData, baseKey: string): string {
  return uniqueKey(data.dialogues.map((dialogue) => dialogue.key), baseKey, 'new_dialogue')
}

export function uniqueMinigameKey(data: EditorData, baseKey: string): string {
  return uniqueKey(data.minigames.map((minigame) => minigame.key), baseKey, 'new_minigame')
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

/** The localized minigame instance attached to a step via its `instance_id` payload key. */
export function getStepMinigame(data: EditorData, step: QuestStep): MinigameInstance | undefined {
  const instanceKey = typeof step.payload.instance_id === 'string' ? step.payload.instance_id : ''
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
    }
  })

  return {
    default_giver_external_id: line.default_giver_external_id,
    display_name: line.display_name,
    key: line.key,
    quests,
    theme: line.theme,
  }
}
