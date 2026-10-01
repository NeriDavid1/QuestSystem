import type { MessageKey } from '../i18n/messages'
import type { Translate } from './labels'
import type { EditorData, MinigameInstance, QuestStep } from './types'

/**
 * Steps of type `custom` are built in Unity (a scene reactor runs them and binds to the objective
 * index), so the editor never changes their structure. For a task set, each task is one spot in the
 * world (a chest, an egg...) whose minigame can be chosen: `scene` keeps Unity's, `none` plays nothing,
 * `minigame` plays `instance_key`. Unity's "Sync Custom Step Minigames" brings the choices back.
 */

export const CUSTOM_STEP = 'custom'

export type CustomTaskMode = 'scene' | 'none' | 'minigame'

export interface CustomTask {
  index: number
  name?: string
  trigger?: string
  prompt?: string
  npc_id?: string
  intercepted?: boolean
  scene_minigame?: string
  scene_minigame_id?: string
  scene_no_minigame?: boolean
  mode?: CustomTaskMode
  minigame_id?: string
  instance_key?: string
}

const REACTORS = ['task_set', 'cutscene', 'escort', 'monster_encounter', 'choice_rounds', 'wave_defense', 'museum']

export function isCustomStep(step: QuestStep): boolean {
  return step.step_type === CUSTOM_STEP
}

/** A quest with a Unity-built step keeps its step list as built: nothing is added, moved or deleted. */
export function isStructureLocked(steps: QuestStep[]): boolean {
  return steps.some(isCustomStep)
}

export function customTasks(step: QuestStep): CustomTask[] {
  const tasks = step.payload.tasks
  return Array.isArray(tasks) ? (tasks as CustomTask[]) : []
}

export function taskMode(task: CustomTask): CustomTaskMode {
  return task.mode === 'none' || task.mode === 'minigame' ? task.mode : 'scene'
}

export function reactorName(t: Translate, reactor: unknown): string {
  const id = typeof reactor === 'string' && REACTORS.includes(reactor) ? reactor : 'unknown'
  return t(`customReactor_${id}` as MessageKey)
}

export function taskMinigame(data: EditorData, task: CustomTask): MinigameInstance | undefined {
  return task.instance_key ? data.minigames.find((minigame) => minigame.key === task.instance_key) : undefined
}

export function countTaskMinigames(step: QuestStep): number {
  return customTasks(step).filter((task) => taskMode(task) === 'minigame').length
}

/** Payload with one task changed; a task leaving `minigame` drops its instance link. */
export function withTask(step: QuestStep, index: number, patch: Partial<CustomTask>): Record<string, unknown> {
  const tasks = customTasks(step).map((task) => {
    if (task.index !== index) return task
    const next: CustomTask = { ...task, ...patch }
    if (taskMode(next) !== 'minigame') {
      delete next.instance_key
      delete next.minigame_id
    }
    return next
  })
  return { ...step.payload, tasks }
}

export function customStepSummary(t: Translate, step: QuestStep): string {
  const text = typeof step.payload.display_text === 'string' && step.payload.display_text
    ? step.payload.display_text
    : reactorName(t, step.payload.reactor)
  const games = countTaskMinigames(step)
  return games > 0 ? t('stepSummary_custom', { text, games: String(games) }) : text
}
