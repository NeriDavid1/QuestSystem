import type {
  Dialogue,
  DialogueLine,
  EditorData,
  MinigameInstance,
  Quest,
  QuestPrerequisite,
  QuestReward,
  QuestStep,
  Questline,
} from './types'
import { makeLocalId } from './editorData'

type Bundle = {
  revision_documents?: Array<Record<string, any>>
  dialogues?: Array<Record<string, any>>
  minigame_instances?: Array<Record<string, any>>
}

export interface BundleImportResult {
  line: Questline
  quests: Quest[]
  steps: QuestStep[]
  prerequisites: QuestPrerequisite[]
  rewards: QuestReward[]
  dialogues: Dialogue[]
  dialogueLines: DialogueLine[]
  minigames: MinigameInstance[]
  oldQuestIds: string[]
  oldStepIds: string[]
  oldDialogueIds: string[]
  oldMinigameIds: string[]
}

function recordMap<T extends { key: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.key, item]))
}

/** Convert one generated revision document and its shared records into editor rows. */
export function importBundleIntoLine(bundle: unknown, current: EditorData, line: Questline): BundleImportResult {
  const source = (bundle ?? {}) as Bundle
  const documents = Array.isArray(source.revision_documents) ? source.revision_documents : []
  const doc = documents.find((item) => item.display_name === 'Numbers Advanced - שיעורי בית')
    ?? documents.find((item) => item.key === 'numbers_advanced_homework')
  if (!doc) throw new Error('The bundle does not contain Numbers Advanced - שיעורי בית.')

  const oldQuests = current.quests.filter((quest) => quest.questline_id === line.id)
  const oldQuestIds = oldQuests.map((quest) => quest.id)
  const oldStepIds = current.steps.filter((step) => oldQuestIds.includes(step.quest_id)).map((step) => step.id)
  const questDocs = Array.isArray(doc.quests) ? doc.quests : []
  const quests: Quest[] = questDocs.map((item, index) => ({
    id: makeLocalId('quest'), questline_id: line.id, key: String(item.key), position: index,
    name: String(item.name ?? item.key), level_required: Number(item.level_required ?? 1),
    giver_external_id: item.giver_external_id ?? null, summary: item.summary ?? null,
    wait_for_npc_turn_in: Boolean(item.wait_for_npc_turn_in), start_dialogue_id: item.start_dialogue_id ?? null,
    turn_in_dialogue_id: item.turn_in_dialogue_id ?? null, status: 'draft', source_path: item.source_path ?? null,
    source_metadata: item.source_metadata ?? {},
  }))
  const questIds = new Map(quests.map((quest) => [quest.key, quest.id]))
  const steps: QuestStep[] = []
  const stepIds = new Map<string, string>()
  for (const questDoc of questDocs) {
    const questId = questIds.get(String(questDoc.key)); if (!questId) continue
    for (const [index, stepDoc] of (Array.isArray(questDoc.steps) ? questDoc.steps : []).entries()) {
      const id = makeLocalId('step'); stepIds.set(`${questDoc.key}::${stepDoc.key}`, id)
      steps.push({ id, quest_id: questId, key: String(stepDoc.key), position: index, step_type: String(stepDoc.type), payload: stepDoc.payload ?? {}, source_metadata: stepDoc.source_metadata ?? {} })
    }
  }
  const rewards: QuestReward[] = []
  for (const questDoc of questDocs) {
    const questId = questIds.get(String(questDoc.key)); if (!questId) continue
    for (const reward of (Array.isArray(questDoc.rewards) ? questDoc.rewards : [])) rewards.push({ id: makeLocalId('reward'), scope: 'quest', quest_id: questId, step_id: null, reward_type: reward.reward_type === 'item' ? 'item' : 'xp', xp_amount: reward.xp_amount ?? null, item_external_id: reward.item_external_id ?? null, amount: reward.amount ?? null, source_metadata: reward.source_metadata ?? {} })
    for (const stepDoc of (Array.isArray(questDoc.steps) ? questDoc.steps : [])) {
      const stepId = stepIds.get(`${questDoc.key}::${stepDoc.key}`); if (!stepId) continue
      for (const reward of (Array.isArray(stepDoc.rewards) ? stepDoc.rewards : [])) rewards.push({ id: makeLocalId('reward'), scope: 'step', quest_id: null, step_id: stepId, reward_type: reward.reward_type === 'item' ? 'item' : 'xp', xp_amount: reward.xp_amount ?? null, item_external_id: reward.item_external_id ?? null, amount: reward.amount ?? null, source_metadata: reward.source_metadata ?? {} })
    }
  }
  const prerequisites: QuestPrerequisite[] = questDocs.flatMap((questDoc) => (questDoc.prerequisites ?? []).flatMap((key: string) => { const questId = questIds.get(String(questDoc.key)); const prerequisiteQuestId = questIds.get(key); return questId && prerequisiteQuestId ? [{ quest_id: questId, prerequisite_quest_id: prerequisiteQuestId }] : [] }))

  const usedDialogueKeys = new Set<string>(); const usedMinigameKeys = new Set<string>()
  for (const step of steps) { const p = step.payload; if (typeof p.dialogue_id === 'string') usedDialogueKeys.add(p.dialogue_id); if (typeof p.instance_id === 'string') usedMinigameKeys.add(p.instance_id); if (typeof p.instance_key === 'string') usedMinigameKeys.add(p.instance_key) }
  const dialogueByKey = recordMap(current.dialogues); const minigameByKey = recordMap(current.minigames)
  const dialogues: Dialogue[] = []; const dialogueLines: DialogueLine[] = []
  for (const item of (Array.isArray(source.dialogues) ? source.dialogues : [])) {
    if (!usedDialogueKeys.has(String(item.key))) continue
    const existing = dialogueByKey.get(String(item.key)); const id = existing?.id ?? makeLocalId('dialogue')
    dialogues.push({ id, key: String(item.key), speaker_external_id: item.speaker_external_id ?? null, source_path: item.source_path ?? null, source_metadata: item.source_metadata ?? {} })
    for (const lineItem of (Array.isArray(item.lines) ? item.lines : [])) dialogueLines.push({ id: makeLocalId('dialogue-line'), dialogue_id: id, locale: String(lineItem.locale ?? 'he'), line_order: Number(lineItem.line_order ?? 0), content: String(lineItem.content ?? ''), line_format: 'plain_text' })
  }
  const minigames: MinigameInstance[] = []
  for (const item of (Array.isArray(source.minigame_instances) ? source.minigame_instances : [])) {
    if (!usedMinigameKeys.has(String(item.key))) continue
    const existing = minigameByKey.get(String(item.key))
    minigames.push({ id: existing?.id ?? makeLocalId('minigame'), key: String(item.key), locale: String(item.locale ?? 'he'), instruction: item.instruction ?? null, tasks: Array.isArray(item.tasks) ? item.tasks.map(String) : [], target: item.target ?? null, variant: item.variant ?? null, success: item.success ?? null, minigame_id: item.minigame_id ?? null, params: item.params ?? {}, source_path: item.source_path ?? null, source_metadata: item.source_metadata ?? {} })
  }
  return { line: { ...line, status: 'draft', display_name: String(doc.display_name ?? line.display_name), theme: doc.theme ?? line.theme, default_giver_external_id: doc.default_giver_external_id ?? line.default_giver_external_id }, quests, steps, prerequisites, rewards, dialogues, dialogueLines, minigames, oldQuestIds, oldStepIds, oldDialogueIds: dialogues.filter((item) => dialogueByKey.has(item.key)).map((item) => item.id), oldMinigameIds: minigames.filter((item) => minigameByKey.has(item.key)).map((item) => item.id) }
}
