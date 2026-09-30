import { createClient } from '@supabase/supabase-js'
import type { EditorData } from './types'
import { currentMiniGameCatalog } from './letterOrdering'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

// PostgREST caps each response. In particular, ordering all dialogue lines by
// line_order used to load the openings while silently dropping later lines.
async function allRows<T>(query: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> }) {
  const rows: T[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const response = await query.range(offset, offset + pageSize - 1)
    if (response.error) return response
    const page = response.data ?? []
    rows.push(...page)
    if (page.length < pageSize) return { data: rows, error: null }
  }
}

export async function loadEditorData(): Promise<EditorData> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const [
    questlines,
    quests,
    steps,
    prerequisites,
    rewards,
    catalog,
    stepTypes,
    dialogues,
    dialogueLines,
    minigames,
    revisions,
  ] = await Promise.all([
    allRows(supabase.from('questlines').select('*').order('display_name').order('id')),
    allRows(supabase.from('quests').select('*').order('position').order('id')),
    allRows(supabase.from('quest_steps').select('*').order('position').order('id')),
    allRows(supabase.from('quest_prerequisites').select('*').order('quest_id').order('prerequisite_quest_id')),
    allRows(supabase.from('quest_rewards').select('*').order('id')),
    allRows(supabase.from('catalog_entries').select('*').order('name').order('id')),
    allRows(supabase.from('step_type_definitions').select('*').order('id')),
    allRows(supabase.from('dialogues').select('*').order('key').order('id')),
    allRows(supabase.from('dialogue_lines').select('*').order('line_order').order('id')),
    allRows(supabase.from('minigame_instances').select('*').order('key').order('id')),
    allRows(supabase.from('questline_revisions').select('*').order('version', { ascending: false }).order('id')),
  ])

  const responses = [
    questlines,
    quests,
    steps,
    prerequisites,
    rewards,
    catalog,
    stepTypes,
    dialogues,
    dialogueLines,
    minigames,
    revisions,
  ]

  const failed = responses.find((response) => response.error)
  if (failed?.error) {
    throw failed.error
  }

  return {
    questlines: questlines.data ?? [],
    quests: (quests.data ?? []).map((quest) => ({
      ...quest,
      wait_for_npc_turn_in: quest.wait_for_npc_turn_in ?? false,
      start_dialogue_id: quest.start_dialogue_id ?? null,
      turn_in_dialogue_id: quest.turn_in_dialogue_id ?? null,
    })),
    steps: steps.data ?? [],
    prerequisites: prerequisites.data ?? [],
    rewards: rewards.data ?? [],
    catalog: currentMiniGameCatalog(catalog.data ?? []),
    stepTypes: stepTypes.data ?? [],
    dialogues: dialogues.data ?? [],
    dialogueLines: dialogueLines.data ?? [],
    minigames: minigames.data ?? [],
    revisions: revisions.data ?? [],
  } as EditorData
}
