import { describe, expect, it } from 'vitest'
import { createDemoData } from './demoData'
import { importBundleIntoLine } from './bundleImport'

describe('questline bundle replacement', () => {
  it.each([true, false])('keeps quest bindings when source keys are already scoped: %s', (scoped) => {
    const data = createDemoData()
    const line = { ...data.questlines[0], key: 'the_alphabet_adventure' }
    const first = scoped ? `${line.key}__q01_a_a` : 'q01_a_a'
    const second = scoped ? `${line.key}__q02_b_b` : 'q02_b_b'
    const bundle = { revision_documents: [{ key: line.key, quests: [
      { key: first, name: 'A', steps: [{ key: 'draw_a', type: 'play_minigame', payload: { minigame_id: 'letter_drawing' } }], rewards: [{ reward_type: 'xp', xp_amount: 50 }] },
      { key: second, name: 'B', prerequisites: [first], steps: [{ key: 'draw_b', type: 'play_minigame', payload: { minigame_id: 'letter_drawing' } }] },
    ] }] }
    const imported = importBundleIntoLine(bundle, data, line, line.key)
    expect(imported.quests.map((quest) => quest.key)).toEqual([`${line.key}__q01_a_a`, `${line.key}__q02_b_b`])
    expect(imported.steps.map((step) => step.quest_id)).toEqual(imported.quests.map((quest) => quest.id))
    expect(imported.rewards[0].quest_id).toBe(imported.quests[0].id)
    expect(imported.prerequisites).toEqual([{ quest_id: imported.quests[1].id, prerequisite_quest_id: imported.quests[0].id }])
    expect(imported.line.id).toBe(line.id)
  })
})
