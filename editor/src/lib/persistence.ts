import { supabase } from './supabase'
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
  QuestlineRevision,
} from './types'
import { buildSnapshotDocument } from './editorData'

/** Error raised when the questline was changed by another editor since load. */
export class SaveConflictError extends Error {
  constructor() {
    super('conflict')
    this.name = 'SaveConflictError'
  }
}

export interface QuestlineSavePayload {
  questline: Questline
  quests: Quest[]
  steps: QuestStep[]
  prerequisites: QuestPrerequisite[]
  rewards: QuestReward[]
  /** Only dialogues touched (created or edited) in this session. */
  dialogues: Dialogue[]
  /** Lines for every dialogue in `dialogues`. */
  dialogueLines: DialogueLine[]
  /** Only minigames touched in this session. */
  minigames: MinigameInstance[]
  deletedQuestIds: string[]
  deletedStepIds: string[]
  deletedDialogueIds: string[]
  deletedMinigameIds: string[]
  expectedUpdatedAt: string | null
  force?: boolean
}

export interface SaveResult {
  questlineId: string
  updatedAt: string
}

export const signIn = async (email: string, password: string): Promise<void> => {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export const signUp = async (email: string, password: string): Promise<void> => {
  if (!supabase) return
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.session) {
    throw new Error('confirm_email')
  }
}

export const signOut = async (): Promise<void> => {
  if (supabase) await supabase.auth.signOut()
}

function isFunctionMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
  return code === 'PGRST202' || message.includes('PGRST202') || message.includes('Could not find the function')
}

async function saveViaRpc(payload: QuestlineSavePayload): Promise<SaveResult> {
  if (!supabase) throw new Error('Supabase is not configured')
  const expectedUpdatedAt = payload.expectedUpdatedAt?.trim() ? payload.expectedUpdatedAt : null
  const { data, error } = await supabase.rpc('save_questline', {
    p_questline: payload.questline,
    p_quests: payload.quests,
    p_steps: payload.steps,
    p_prerequisites: payload.prerequisites,
    p_rewards: payload.rewards,
    p_dialogues: payload.dialogues,
    p_dialogue_lines: payload.dialogueLines,
    p_minigames: payload.minigames,
    p_deleted_quest_ids: payload.deletedQuestIds,
    p_deleted_step_ids: payload.deletedStepIds,
    p_deleted_dialogue_ids: payload.deletedDialogueIds,
    p_deleted_minigame_ids: payload.deletedMinigameIds,
    p_expected_updated_at: expectedUpdatedAt,
    p_force: payload.force ?? false,
  })
  if (error) {
    if (isFunctionMissingError(error)) {
      return saveViaClient(payload)
    }
    if (error.message?.includes('CONFLICT')) throw new SaveConflictError()
    throw error
  }
  const result = data as { questline_id?: string; updated_at?: string } | null
  return {
    questlineId: result?.questline_id ?? payload.questline.id,
    updatedAt: result?.updated_at ?? new Date().toISOString(),
  }
}

/**
 * Fallback when the `save_questline` RPC is not deployed yet.
 * Still scoped: only touched shared rows are written, never the whole catalog.
 */
async function saveViaClient(payload: QuestlineSavePayload): Promise<SaveResult> {
  if (!supabase) throw new Error('Supabase is not configured')
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null
  const line = payload.questline

  await supabase
    .from('questlines')
    .upsert({
      id: line.id,
      key: line.key,
      display_name: line.display_name,
      theme: line.theme,
      default_giver_external_id: line.default_giver_external_id,
      status: 'draft',
      level_min: line.level_min,
      level_max: line.level_max,
      source_path: line.source_path,
      source_metadata: line.source_metadata,
      created_by: userId,
      updated_by: userId,
    })
    .then((result) => {
      if (result.error) throw result.error
    })

  const savedQuestIds = payload.quests.map((quest) => quest.id)
  await supabase
    .from('quests')
    .upsert(
      payload.quests.map((quest) => ({
        id: quest.id,
        questline_id: line.id,
        key: quest.key,
        position: quest.position,
        name: quest.name,
        level_required: quest.level_required,
        giver_external_id: quest.giver_external_id,
        summary: quest.summary,
        wait_for_npc_turn_in: quest.wait_for_npc_turn_in ?? false,
        start_dialogue_id: quest.start_dialogue_id || null,
        turn_in_dialogue_id: quest.turn_in_dialogue_id || null,
        status: quest.status === 'published' ? 'draft' : quest.status,
        source_path: quest.source_path,
        source_metadata: quest.source_metadata,
        created_by: userId,
        updated_by: userId,
      })),
      { onConflict: 'id' },
    )
    .then((result) => {
      if (result.error) throw result.error
    })

  // Bump positions first so reorders don't hit unique (quest_id, position).
  if (payload.steps.length) {
    await Promise.all(
      payload.steps.map((step, index) =>
        supabase
          .from('quest_steps')
          .update({ position: -1 - index })
          .eq('id', step.id)
          .then((result) => {
            if (result.error) throw result.error
          }),
      ),
    )
  }
  await supabase
    .from('quest_steps')
    .upsert(
      payload.steps.map((step) => ({
        id: step.id,
        quest_id: step.quest_id,
        key: step.key,
        position: step.position,
        step_type: step.step_type,
        payload: step.payload,
        source_metadata: step.source_metadata,
      })),
      { onConflict: 'id' },
    )
    .then((result) => {
      if (result.error) throw result.error
    })

  if (savedQuestIds.length) {
    await supabase
      .from('quest_prerequisites')
      .delete()
      .in('quest_id', savedQuestIds)
      .then((result) => {
        if (result.error) throw result.error
      })
    await supabase
      .from('quest_prerequisites')
      .delete()
      .in('prerequisite_quest_id', savedQuestIds)
      .then((result) => {
        if (result.error) throw result.error
      })
  }
  if (payload.prerequisites.length) {
    await supabase
      .from('quest_prerequisites')
      .insert(payload.prerequisites)
      .then((result) => {
        if (result.error) throw result.error
      })
  }

  if (savedQuestIds.length) {
    await supabase
      .from('quest_rewards')
      .delete()
      .in('quest_id', savedQuestIds)
      .then((result) => {
        if (result.error) throw result.error
      })
  }
  const savedStepIds = payload.steps.map((step) => step.id)
  if (savedStepIds.length) {
    await supabase
      .from('quest_rewards')
      .delete()
      .in('step_id', savedStepIds)
      .then((result) => {
        if (result.error) throw result.error
      })
  }
  if (payload.rewards.length) {
    await supabase
      .from('quest_rewards')
      .insert(payload.rewards)
      .then((result) => {
        if (result.error) throw result.error
      })
  }

  if (payload.dialogues.length) {
    await supabase
      .from('dialogues')
      .upsert(
        payload.dialogues.map((dialogue) => ({
          id: dialogue.id,
          key: dialogue.key,
          speaker_external_id: dialogue.speaker_external_id,
          source_path: dialogue.source_path,
          source_metadata: dialogue.source_metadata,
        })),
        { onConflict: 'id' },
      )
      .then((result) => {
        if (result.error) throw result.error
      })
    const touchedIds = payload.dialogues.map((dialogue) => dialogue.id)
    await supabase
      .from('dialogue_lines')
      .delete()
      .in('dialogue_id', touchedIds)
      .then((result) => {
        if (result.error) throw result.error
      })
    if (payload.dialogueLines.length) {
      await supabase
        .from('dialogue_lines')
        .insert(payload.dialogueLines)
        .then((result) => {
          if (result.error) throw result.error
        })
    }
  }

  if (payload.minigames.length) {
    await supabase
      .from('minigame_instances')
      .upsert(
        payload.minigames.map((minigame) => ({
          id: minigame.id,
          key: minigame.key,
          locale: minigame.locale,
          instruction: minigame.instruction,
          tasks: minigame.tasks,
          target: minigame.target,
          variant: minigame.variant,
          success: minigame.success,
          minigame_id: minigame.minigame_id,
          params: minigame.params,
          source_path: minigame.source_path,
          source_metadata: minigame.source_metadata,
        })),
        { onConflict: 'id' },
      )
      .then((result) => {
        if (result.error) throw result.error
      })
  }

  const deletes: Array<{ table: string; column: string; ids: string[] }> = [
    { table: 'quests', column: 'id', ids: payload.deletedQuestIds },
    { table: 'quest_steps', column: 'id', ids: payload.deletedStepIds },
    { table: 'dialogues', column: 'id', ids: payload.deletedDialogueIds },
    { table: 'minigame_instances', column: 'id', ids: payload.deletedMinigameIds },
  ]
  for (const deleteOp of deletes) {
    if (!deleteOp.ids.length) continue
    const result = await supabase.from(deleteOp.table as 'quests').delete().in(deleteOp.column, deleteOp.ids)
    if (result.error) throw result.error
  }

  return { questlineId: line.id, updatedAt: new Date().toISOString() }
}

export async function saveQuestlineDraft(payload: QuestlineSavePayload): Promise<SaveResult> {
  return saveViaRpc(payload)
}

export interface PublishResult {
  version: number
  updatedAt: string
  revision: QuestlineRevision
}

export async function publishQuestline(opts: {
  data: EditorData
  line: Questline
  userId: string | null
  warningCount: number
}): Promise<PublishResult> {
  const { data, line, userId, warningCount } = opts
  const document = buildSnapshotDocument(data, line)
  const version = Math.max(0, ...data.revisions.filter((revision) => revision.questline_id === line.id).map((revision) => revision.version)) + 1
  const validationSummary = { error_count: 0, warning_count: warningCount, editor_publish: true }
  const publishedAt = new Date().toISOString()

  if (supabase) {
    const { error: revisionError } = await supabase.from('questline_revisions').insert({
      questline_id: line.id,
      version,
      schema_version: 1,
      status: 'published',
      document,
      validation_summary: validationSummary,
      created_by: userId,
      published_at: publishedAt,
    })
    if (revisionError) throw revisionError
    const { error: lineError } = await supabase
      .from('questlines')
      .update({ status: 'published', updated_by: userId })
      .eq('id', line.id)
    if (lineError) throw lineError
    const { error: auditError } = await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'publish',
      entity_type: 'questline',
      entity_id: line.id,
      details: { version },
    })
    if (auditError) throw auditError
  }

  const revision: QuestlineRevision = {
    id: supabase ? `published-${line.id}-${version}` : `local-revision-${crypto.randomUUID()}`,
    questline_id: line.id,
    version,
    schema_version: 1,
    status: 'published',
    document,
    validation_summary: validationSummary,
    created_at: publishedAt,
    published_at: publishedAt,
  }
  return { version, updatedAt: publishedAt, revision }
}
