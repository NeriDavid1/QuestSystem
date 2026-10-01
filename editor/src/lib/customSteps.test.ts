import { describe, expect, it } from 'vitest'
import { countTaskMinigames, customTasks, isStructureLocked, taskMode, withTask } from './customSteps'
import type { QuestStep } from './types'

function step(overrides: Partial<QuestStep> = {}): QuestStep {
  return {
    id: 'step-1',
    quest_id: 'quest-1',
    key: 'abc_a_shards_custom_o1',
    position: 1,
    step_type: 'custom',
    payload: {
      handler_id: 'abc_a_chests',
      unity_objective_index: 1,
      reactor: 'task_set',
      tasks: [
        { index: 0, name: 'Chest_1', mode: 'minigame', minigame_id: 'dwarf_miner', instance_key: 'abc_valley__abc_a_shards__o1_t0' },
        { index: 1, name: 'Chest_2', mode: 'none' },
        { index: 2, name: 'Chest_3' },
      ],
    },
    source_metadata: {},
    ...overrides,
  }
}

describe('custom steps', () => {
  it('reads tasks and treats a missing mode as the scene setup', () => {
    expect(customTasks(step()).map(taskMode)).toEqual(['minigame', 'none', 'scene'])
    expect(countTaskMinigames(step())).toBe(1)
  })

  it('changes one task and drops the instance when it stops playing a minigame', () => {
    const payload = withTask(step(), 0, { mode: 'none' })
    const tasks = payload.tasks as Array<Record<string, unknown>>
    expect(tasks[0]).toEqual({ index: 0, name: 'Chest_1', mode: 'none' })
    expect(tasks[1]).toEqual({ index: 1, name: 'Chest_2', mode: 'none' })
    expect(payload.handler_id).toBe('abc_a_chests')
  })

  it('locks the structure of a quest that has a Unity-built step', () => {
    expect(isStructureLocked([step()])).toBe(true)
    expect(isStructureLocked([step({ step_type: 'talk_to_npc' })])).toBe(false)
  })
})
