import { describe, expect, it } from 'vitest'
import type { EditorData, Questline } from './types'
import { validateQuestline } from './validation'
import { createDemoData } from './demoData'

const t = (key: string): string => key

function makeData(): EditorData {
  return createDemoData()
}

function lineOf(data: EditorData): Questline {
  return data.questlines[0]
}

describe('validateQuestline', () => {
  it('reports when no questline is selected', () => {
    const issues = validateQuestline(makeData(), undefined, t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'missing_line', severity: 'error' }))
  })

  it('flags an empty questline', () => {
    const data = makeData()
    const line = data.questlines[0]
    const modified: EditorData = { ...data, quests: data.quests.filter((quest) => quest.questline_id !== line.id) }
    const issues = validateQuestline(modified, line, t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'empty_questline', entityId: line.id }))
  })

  it('flags a quest with no name', () => {
    const data = makeData()
    const quest = data.quests[0]
    const modified: EditorData = {
      ...data,
      quests: data.quests.map((item) => (item.id === quest.id ? { ...item, name: '   ' } : item)),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'missing_quest_name', entityId: quest.id }))
  })

  it('warns when a quest has no giver', () => {
    const data = makeData()
    const quest = data.quests[0]
    const modified: EditorData = {
      ...data,
      quests: data.quests.map((item) => (item.id === quest.id ? { ...item, giver_external_id: null } : item)),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'missing_giver', severity: 'warning', entityId: quest.id }))
  })

  it('warns when a quest has no start dialogue', () => {
    const data = makeData()
    const quest = data.quests[0]
    const modified: EditorData = {
      ...data,
      quests: data.quests.map((item) =>
        item.id === quest.id ? { ...item, start_dialogue_id: null, turn_in_dialogue_id: null } : item),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'missing_start_dialogue', severity: 'warning', entityId: quest.id }),
    )
    expect(issues.filter((issue) => issue.code === 'missing_turn_in_dialogue')).toHaveLength(0)
  })

  it('does not warn about missing turn-in dialogue when start dialogue is set', () => {
    const data = makeData()
    const quest = data.quests[0]
    const dialogueKey = 'quest_start_dialogue_ok'
    const modified: EditorData = {
      ...data,
      dialogues: [
        ...data.dialogues,
        {
          id: 'dlg-start-ok',
          key: dialogueKey,
          speaker_external_id: null,
          source_path: null,
          source_metadata: {},
        },
      ],
      quests: data.quests.map((item) =>
        item.id === quest.id
          ? { ...item, start_dialogue_id: dialogueKey, turn_in_dialogue_id: null }
          : item),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues.filter((issue) => issue.entityId === quest.id && issue.code === 'missing_start_dialogue')).toHaveLength(0)
    expect(issues.filter((issue) => issue.code === 'missing_turn_in_dialogue')).toHaveLength(0)
  })

  it('warns when start dialogue key is unresolved', () => {
    const data = makeData()
    const quest = data.quests[0]
    const modified: EditorData = {
      ...data,
      quests: data.quests.map((item) =>
        item.id === quest.id ? { ...item, start_dialogue_id: 'missing_start_dialogue_key' } : item),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'unresolved_start_dialogue', severity: 'warning', entityId: quest.id }),
    )
  })

  it('flags duplicate quest keys within a questline', () => {
    const data = makeData()
    const first = data.quests[0]
    const second = data.quests[1]
    const modified: EditorData = {
      ...data,
      quests: data.quests.map((item) => (item.id === second.id ? { ...item, key: first.key } : item)),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'duplicate_quest_key', entityId: second.id }))
  })

  it('flags duplicate quest keys across questlines', () => {
    const data = makeData()
    expect(data.questlines.length).toBeGreaterThan(1)
    const line = data.questlines[0]
    const otherLine = data.questlines[1]
    const localQuest = data.quests.find((quest) => quest.questline_id === line.id)!
    const foreignQuest = data.quests.find((quest) => quest.questline_id === otherLine.id)!
    const modified: EditorData = {
      ...data,
      quests: data.quests.map((item) => (item.id === localQuest.id ? { ...item, key: foreignQuest.key } : item)),
    }
    const issues = validateQuestline(modified, line, t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'duplicate_quest_key', entityId: localQuest.id }))
  })

  it('warns when a quest key is missing the line scope prefix', () => {
    const data = makeData()
    const line = lineOf(data)
    const quest = data.quests.find((item) => item.questline_id === line.id)!
    const modified: EditorData = {
      ...data,
      quests: data.quests.map((item) => (item.id === quest.id ? { ...item, key: 'q01_legacy_unscoped' } : item)),
    }
    const issues = validateQuestline(modified, line, t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'unscoped_quest_key', severity: 'warning', entityId: quest.id }))
  })

  it('flags a quest with no steps', () => {
    const data = makeData()
    const quest = data.quests[0]
    const modified: EditorData = {
      ...data,
      steps: data.steps.filter((step) => step.quest_id !== quest.id),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'empty_quest', entityId: quest.id }))
  })

  it('flags missing required step fields', () => {
    const data = makeData()
    const step = data.steps[0]
    const definition = data.stepTypes.find((item) => item.id === step.step_type)
    expect(definition).toBeDefined()
    const emptyPayload = Object.fromEntries(Object.entries(step.payload).map(([key]) => [key, null]))
    const modified: EditorData = {
      ...data,
      steps: data.steps.map((item) => (item.id === step.id ? { ...item, payload: emptyPayload } : item)),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    const stepFieldIssues = issues.filter((issue) => issue.code === 'missing_step_field' && issue.entityId === step.id)
    expect(stepFieldIssues.length).toBeGreaterThanOrEqual(definition!.fields.filter((field) => field.required).length)
    expect(stepFieldIssues[0].message).toBe('validationMissingField')
  })

  it('warns on unresolved catalog references', () => {
    const data = makeData()
    const step = data.steps[0]
    const definition = data.stepTypes.find((item) => item.id === step.step_type)!
    const refField = definition.fields.find((field) => field.ref && !field.ref.includes('dialogues'))!
    const modified: EditorData = {
      ...data,
      steps: data.steps.map((item) => (item.id === step.id ? { ...item, payload: { ...item.payload, [refField.name]: 'does_not_exist_xyz' } } : item)),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'unresolved_reference', entityId: step.id }))
  })

  it('warns on unresolved dialogue references', () => {
    const data = makeData()
    const step = data.steps[0]
    const definition = data.stepTypes.find((item) => item.id === step.step_type)!
    const dialogueField = definition.fields.find((field) => field.ref?.includes('dialogues'))
    if (dialogueField) {
      const modified: EditorData = {
        ...data,
        steps: data.steps.map((item) => (item.id === step.id ? { ...item, payload: { ...item.payload, [dialogueField.name]: 'missing_dialogue_key' } } : item)),
      }
      const issues = validateQuestline(modified, lineOf(data), t)
      expect(issues).toContainEqual(expect.objectContaining({ code: 'unresolved_dialogue', entityId: step.id }))
    } else {
      // The demo first step has no dialogue field; exercise the check with a dialogue-bearing step instead.
      const withDialogue = data.steps.find((item) => {
        const def = data.stepTypes.find((d) => d.id === item.step_type)
        return def?.fields.some((field) => field.ref?.includes('dialogues'))
      })!
      const def = data.stepTypes.find((d) => d.id === withDialogue.step_type)!
      const dialogueField = def.fields.find((field) => field.ref?.includes('dialogues'))!
      const modified: EditorData = {
        ...data,
        steps: data.steps.map((item) => (item.id === withDialogue.id ? { ...item, payload: { ...item.payload, [dialogueField.name]: 'missing_dialogue_key' } } : item)),
      }
      const issues = validateQuestline(modified, lineOf(data), t)
      expect(issues).toContainEqual(expect.objectContaining({ code: 'unresolved_dialogue', entityId: withDialogue.id }))
    }
  })

  it('warns on unresolved minigame instance references', () => {
    const data = makeData()
    const playStep = data.steps.find((step) => step.step_type === 'play_minigame')
    expect(playStep).toBeDefined()
    const step = playStep!
    const modified: EditorData = {
      ...data,
      steps: data.steps.map((item) =>
        item.id === step.id ? { ...item, payload: { ...item.payload, instance_id: 'missing_instance_key' } } : item),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'unresolved_minigame', severity: 'warning', entityId: step.id }))
  })

  it('flags an unknown step type', () => {
    const data = makeData()
    const step = data.steps[0]
    const modified: EditorData = {
      ...data,
      steps: data.steps.map((item) => (item.id === step.id ? { ...item, step_type: 'no_such_type' } : item)),
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'unknown_step_type', entityId: step.id }))
  })

  it('flags a prerequisite cycle', () => {
    const data = makeData()
    const quests = data.quests.filter((quest) => quest.questline_id === lineOf(data).id)
    const [a, b] = quests
    const modified: EditorData = {
      ...data,
      prerequisites: [
        { quest_id: a.id, prerequisite_quest_id: b.id },
        { quest_id: b.id, prerequisite_quest_id: a.id },
      ],
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'cycle', entityId: lineOf(data).id }))
  })

  it('flags invalid xp rewards', () => {
    const data = makeData()
    const quest = data.quests[0]
    const modified: EditorData = {
      ...data,
      rewards: [
        ...data.rewards,
        {
          id: 'bad-xp',
          scope: 'quest',
          quest_id: quest.id,
          step_id: null,
          reward_type: 'xp',
          amount: null,
          item_external_id: null,
          xp_amount: -5,
          source_metadata: {},
        },
      ],
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'invalid_xp_reward' }))
  })

  it('flags invalid item rewards', () => {
    const data = makeData()
    const quest = data.quests[0]
    const modified: EditorData = {
      ...data,
      rewards: [
        ...data.rewards,
        {
          id: 'bad-item',
          scope: 'quest',
          quest_id: quest.id,
          step_id: null,
          reward_type: 'item',
          amount: 0,
          item_external_id: null,
          xp_amount: null,
          source_metadata: {},
        },
      ],
    }
    const issues = validateQuestline(modified, lineOf(data), t)
    expect(issues).toContainEqual(expect.objectContaining({ code: 'invalid_item_reward' }))
  })

  it('passes the untouched demo data with zero errors', () => {
    const issues = validateQuestline(makeData(), lineOf(makeData()), t)
    expect(issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })
})
