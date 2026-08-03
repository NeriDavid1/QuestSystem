import { createClient } from '@supabase/supabase-js'
import type { EditorData } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

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
    supabase.from('questlines').select('*').order('display_name'),
    supabase.from('quests').select('*').order('position'),
    supabase.from('quest_steps').select('*').order('position'),
    supabase.from('quest_prerequisites').select('*'),
    supabase.from('quest_rewards').select('*'),
    supabase.from('catalog_entries').select('*').order('name'),
    supabase.from('step_type_definitions').select('*').order('id'),
    supabase.from('dialogues').select('*').order('key'),
    supabase.from('dialogue_lines').select('*').order('line_order'),
    supabase.from('minigame_instances').select('*').order('key'),
    supabase.from('questline_revisions').select('*').order('version', { ascending: false }),
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
    quests: quests.data ?? [],
    steps: steps.data ?? [],
    prerequisites: prerequisites.data ?? [],
    rewards: rewards.data ?? [],
    catalog: catalog.data ?? [],
    stepTypes: stepTypes.data ?? [],
    dialogues: dialogues.data ?? [],
    dialogueLines: dialogueLines.data ?? [],
    minigames: minigames.data ?? [],
    revisions: revisions.data ?? [],
  } as EditorData
}
