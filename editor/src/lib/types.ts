export type QuestlineStatus = 'draft' | 'published' | 'archived'
export type QuestStatus = 'draft' | 'complete' | 'published' | 'archived'
export type CatalogKind = 'area' | 'npc' | 'interactable' | 'item' | 'minigame'

export interface Questline {
  id: string
  key: string
  display_name: string
  theme: string | null
  default_giver_external_id: string | null
  status: QuestlineStatus
  level_min: number | null
  level_max: number | null
  source_path: string | null
  source_metadata: Record<string, unknown>
  created_by?: string | null
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface Quest {
  id: string
  questline_id: string
  key: string
  position: number
  name: string
  level_required: number
  giver_external_id: string | null
  summary: string | null
  status: QuestStatus
  source_path: string | null
  source_metadata: Record<string, unknown>
  created_by?: string | null
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface QuestStep {
  id: string
  quest_id: string
  key: string
  position: number
  step_type: string
  payload: Record<string, unknown>
  source_metadata: Record<string, unknown>
}

export interface QuestPrerequisite {
  quest_id: string
  prerequisite_quest_id: string
}

export interface QuestReward {
  id: string
  scope: 'quest' | 'step'
  quest_id: string | null
  step_id: string | null
  reward_type: 'xp' | 'item'
  xp_amount: number | null
  item_external_id: string | null
  amount: number | null
  source_metadata: Record<string, unknown>
}

export interface CatalogEntry {
  id: number
  kind: CatalogKind
  external_id: string
  name: string
  description: string | null
  status: string | null
  image_path: string | null
  metadata: Record<string, unknown>
}

export interface StepField {
  name: string
  type: string
  required?: boolean
  description?: string
  ref?: string
  min?: number
  max?: number
  default?: unknown
}

export interface StepTypeDefinition {
  id: string
  unity_objective: string | null
  description: string | null
  fields: StepField[]
  metadata: Record<string, unknown>
}

export interface Dialogue {
  id: string
  key: string
  speaker_external_id: string | null
  source_path: string | null
  source_metadata: Record<string, unknown>
}

export interface DialogueLine {
  id: string
  dialogue_id: string
  locale: string
  line_order: number
  content: string
  line_format: 'plain_text' | 'safe_rich_text'
}

export interface MinigameInstance {
  id: string
  key: string
  locale: string
  instruction: string | null
  tasks: string[]
  target: string | null
  variant: string | null
  success: string | null
  source_path: string | null
  source_metadata: Record<string, unknown>
}

export interface QuestlineRevision {
  id: string
  questline_id: string
  version: number
  schema_version: number
  status: QuestlineStatus
  document: Record<string, unknown>
  validation_summary: Record<string, unknown>
  created_at?: string
  published_at?: string | null
}

export interface EditorData {
  questlines: Questline[]
  quests: Quest[]
  steps: QuestStep[]
  prerequisites: QuestPrerequisite[]
  rewards: QuestReward[]
  catalog: CatalogEntry[]
  stepTypes: StepTypeDefinition[]
  dialogues: Dialogue[]
  dialogueLines: DialogueLine[]
  minigames: MinigameInstance[]
  revisions: QuestlineRevision[]
}

export interface ValidationIssue {
  severity: 'error' | 'warning'
  code: string
  message: string
  entityId?: string
}

export interface AuthUser {
  id: string
  email?: string
}

export const emptyEditorData = (): EditorData => ({
  questlines: [],
  quests: [],
  steps: [],
  prerequisites: [],
  rewards: [],
  catalog: [],
  stepTypes: [],
  dialogues: [],
  dialogueLines: [],
  minigames: [],
  revisions: [],
})
