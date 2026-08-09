import type { EditorData, Questline } from './types'
import { buildSnapshotDocument } from './editorData'

type SnapshotQuest = {
  key?: string
  name?: string
  level_required?: number
  position?: number
  giver_external_id?: string
  prerequisites?: string[]
  rewards?: SnapshotReward[]
  steps?: SnapshotStep[]
  summary?: string
  wait_for_npc_turn_in?: boolean
}

type SnapshotStep = {
  type?: string
  payload?: Record<string, unknown>
  position?: number
  key?: string
  rewards?: SnapshotReward[]
}

type SnapshotReward = {
  amount?: number | null
  item_external_id?: string | null
  reward_type?: string
  scope?: string
  xp_amount?: number | null
}

type SnapshotDocument = {
  key?: string
  display_name?: string
  theme?: string
  default_giver_external_id?: string
  quests?: SnapshotQuest[]
}

export interface QuestlineExportFile {
  path: string
  content: string
}

const PLAIN_SAFE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/
const RESERVED_WORDS = new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off', '~'])

function scalar(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  const text = String(value)
  if (PLAIN_SAFE.test(text) && !RESERVED_WORDS.has(text.toLowerCase())) return text
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function flowList(values: unknown[]): string {
  return `[${values.map((value) => scalar(value)).join(', ')}]`
}

function flowPrerequisite(prerequisites: string[] | undefined): string {
  if (!prerequisites?.length) return 'null'
  if (prerequisites.length === 1) return scalar(prerequisites[0])
  return flowList(prerequisites)
}

function questRewards(quest: SnapshotQuest): { xp: number; items: Array<{ id: string; amount: number }> } {
  let xp = 0
  const items: Array<{ id: string; amount: number }> = []
  for (const reward of quest.rewards ?? []) {
    if (reward.scope !== 'quest') continue
    if (reward.reward_type === 'xp') {
      xp += Number(reward.xp_amount ?? 0)
    } else if (reward.reward_type === 'item' && reward.item_external_id) {
      items.push({ id: reward.item_external_id, amount: Number(reward.amount ?? 1) })
    }
  }
  return { xp, items }
}

function flowRewards(xp: number, items: Array<{ id: string; amount: number }>): string {
  const renderedItems = items.map((item) => `{ id: ${scalar(item.id)}, amount: ${scalar(item.amount)} }`).join(', ')
  return `{ xp: ${xp}, items: [${renderedItems}] }`
}

function stepItemReward(step: SnapshotStep): { item_external_id: string; amount: number } | null {
  const reward = (step.rewards ?? []).find((item) => item.reward_type === 'item' && item.item_external_id)
  if (!reward?.item_external_id) return null
  return { item_external_id: reward.item_external_id, amount: Number(reward.amount ?? 1) }
}

function renderStep(step: SnapshotStep): string[] {
  const payload = { ...(step.payload ?? {}) }
  if (typeof payload.instance_key === 'string' && !payload.instance_id) {
    payload.instance_id = payload.instance_key
  }
  delete payload.instance_key

  const lines = [`  - type: ${scalar(step.type ?? '')}`]
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'reward_item_id' || key === 'reward_amount') continue
    lines.push(`    ${key}: ${scalar(value)}`)
  }

  const reward = stepItemReward(step)
  if (reward) {
    lines.push(`    reward_item_id: ${scalar(reward.item_external_id)}`)
    lines.push(`    reward_amount: ${scalar(reward.amount)}`)
  }
  return lines
}

function questYaml(quest: SnapshotQuest, document: SnapshotDocument): string {
  const { xp, items } = questRewards(quest)
  const giver = quest.giver_external_id || document.default_giver_external_id || ''
  const lines = [
    'quest:',
    `  id: ${scalar(quest.key)}`,
    `  name: ${scalar(quest.name || quest.key)}`,
    `  level_required: ${scalar(quest.level_required ?? 0)}`,
    `  giver_npc: ${scalar(giver)}`,
    `  prerequisite: ${flowPrerequisite(quest.prerequisites)}`,
    `  summary: ${scalar(quest.summary || '')}`,
    `  wait_for_npc_turn_in: ${quest.wait_for_npc_turn_in ? 'true' : 'false'}`,
    '',
    `rewards: ${flowRewards(xp, items)}`,
    '',
    'steps:',
  ]

  const steps = [...(quest.steps ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.key ?? '').localeCompare(String(b.key ?? '')))
  for (const [index, step] of steps.entries()) {
    if (index > 0) lines.push('')
    lines.push(...renderStep(step))
  }
  return `${lines.join('\n')}\n`
}

function indexYaml(document: SnapshotDocument): string {
  const quests = [...(document.quests ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.key ?? '').localeCompare(String(b.key ?? '')))
  const levels = quests.map((quest) => Number(quest.level_required ?? 0))
  const levelMin = levels.length ? Math.min(...levels) : 0
  const levelMax = levels.length ? Math.max(...levels) : 0
  const lines = [
    'questline:',
    `  id: ${scalar(document.key)}`,
    `  npc_id: ${scalar(document.default_giver_external_id)}`,
    `  display_name: ${scalar(document.display_name || document.key)}`,
    `  theme: ${scalar(document.theme || '')}`,
    `  quest_count: ${quests.length}`,
    `  level_range: [${levelMin}, ${levelMax}]`,
    '',
    'quests:',
  ]

  for (const quest of quests) {
    const { xp, items } = questRewards(quest)
    lines.push(`  - id: ${scalar(quest.key)}`)
    lines.push(`    name: ${scalar(quest.name || quest.key)}`)
    lines.push(`    level: ${scalar(quest.level_required ?? 0)}`)
    lines.push(`    prerequisite: ${flowPrerequisite(quest.prerequisites)}`)
    lines.push(`    rewards: ${flowRewards(xp, items)}`)
  }
  return `${lines.join('\n')}\n`
}

export function buildQuestlineExportFiles(data: EditorData, line: Questline): QuestlineExportFile[] {
  const document = buildSnapshotDocument(data, line) as SnapshotDocument
  const root = `questlines/${document.key || line.key}`
  const files: QuestlineExportFile[] = [
    { path: `${root}/_index.yaml`, content: indexYaml(document) },
    { path: `${root}/_snapshot.json`, content: `${JSON.stringify(document, null, 2)}\n` },
  ]

  for (const quest of [...(document.quests ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.key ?? '').localeCompare(String(b.key ?? '')))) {
    files.push({ path: `${root}/${quest.key || 'quest'}.yaml`, content: questYaml(quest, document) })
  }
  return files
}
