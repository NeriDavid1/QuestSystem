import { describe, expect, it } from 'vitest'
import { createDemoData } from './demoData'
import { getCatalogKindForRef, getQuestSteps, getQuestlineQuests, getStepType } from './editorData'

describe('demoData integrity', () => {
  const data = createDemoData()

  it('has at least one questline, quest, step, dialogue, and catalog entry', () => {
    expect(data.questlines.length).toBeGreaterThan(0)
    expect(data.quests.length).toBeGreaterThan(0)
    expect(data.steps.length).toBeGreaterThan(0)
    expect(data.dialogues.length).toBeGreaterThan(0)
    expect(data.catalog.length).toBeGreaterThan(0)
  })

  it('keeps every quest pointing at an existing questline', () => {
    const lineIds = new Set(data.questlines.map((line) => line.id))
    for (const quest of data.quests) {
      expect(lineIds.has(quest.questline_id), `quest ${quest.key}`).toBe(true)
    }
  })

  it('keeps every step pointing at an existing quest', () => {
    const questIds = new Set(data.quests.map((quest) => quest.id))
    for (const step of data.steps) {
      expect(questIds.has(step.quest_id), `step ${step.key}`).toBe(true)
    }
  })

  it('keeps quest and step positions contiguous starting at 0', () => {
    for (const line of data.questlines) {
      const quests = getQuestlineQuests(data, line.id)
      quests.forEach((quest, index) => expect(quest.position).toBe(index))
      for (const quest of quests) {
        const steps = getQuestSteps(data, quest.id)
        steps.forEach((step, index) => expect(step.position).toBe(index))
      }
    }
  })

  it('keeps every quest key unique within its questline', () => {
    for (const line of data.questlines) {
      const keys = getQuestlineQuests(data, line.id).map((quest) => quest.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('references only step types that have a definition', () => {
    for (const step of data.steps) {
      expect(getStepType(data, step.step_type), `step ${step.key}`).toBeDefined()
    }
  })

  it('resolves every catalog ref value in step payloads to a real catalog entry or dialogue', () => {
    for (const step of data.steps) {
      const definition = getStepType(data, step.step_type)!
      for (const field of definition.fields) {
        const value = step.payload[field.name]
        if (value === undefined || value === null || value === '') continue
        const kind = getCatalogKindForRef(field.ref)
        if (kind) {
          expect(
            data.catalog.some((entry) => entry.kind === kind && entry.external_id === String(value)),
            `step ${step.key} field ${field.name} -> ${String(value)} (${kind})`,
          ).toBe(true)
        } else if (field.ref?.includes('dialogues')) {
          expect(
            data.dialogues.some((dialogue) => dialogue.key === String(value)),
            `step ${step.key} field ${field.name} -> ${String(value)}`,
          ).toBe(true)
        }
      }
    }
  })

  it('references only existing dialogues and speakers for dialogues', () => {
    const dialogueIds = new Set(data.dialogues.map((dialogue) => dialogue.id))
    for (const line of data.dialogueLines) {
      expect(dialogueIds.has(line.dialogue_id), `line for ${line.dialogue_id}`).toBe(true)
    }
    const npcIds = new Set(data.catalog.filter((entry) => entry.kind === 'npc').map((entry) => entry.external_id))
    for (const dialogue of data.dialogues) {
      if (dialogue.speaker_external_id) {
        expect(npcIds.has(dialogue.speaker_external_id), `speaker ${dialogue.speaker_external_id}`).toBe(true)
      }
    }
  })

  it('keeps rewards scoped to existing quests and steps', () => {
    const questIds = new Set(data.quests.map((quest) => quest.id))
    const stepIds = new Set(data.steps.map((step) => step.id))
    for (const reward of data.rewards) {
      if (reward.scope === 'quest') {
        expect(questIds.has(reward.quest_id!), `reward ${reward.id}`).toBe(true)
      } else {
        expect(stepIds.has(reward.step_id!), `reward ${reward.id}`).toBe(true)
      }
    }
  })

  it('resolves every item reward to a catalog item', () => {
    const itemIds = new Set(data.catalog.filter((entry) => entry.kind === 'item').map((entry) => entry.external_id))
    for (const reward of data.rewards.filter((item) => item.reward_type === 'item')) {
      expect(itemIds.has(reward.item_external_id!), `item reward ${reward.id}`).toBe(true)
    }
  })

  it('keeps prerequisites scoped to quests of the same questline', () => {
    for (const line of data.questlines) {
      const questIds = new Set(getQuestlineQuests(data, line.id).map((quest) => quest.id))
      const scoped = data.prerequisites.filter((edge) => questIds.has(edge.quest_id))
      for (const edge of scoped) {
        expect(questIds.has(edge.prerequisite_quest_id), `prerequisite of ${edge.quest_id}`).toBe(true)
      }
    }
  })

  it('matches every step-type field ref format used by the DB seed', () => {
    for (const type of data.stepTypes) {
      for (const field of type.fields) {
        if (!field.ref) continue
        if (field.ref.includes('dialogues') || field.ref.includes('minigame_instances')) {
          expect(field.ref).toMatch(/^_registry\//)
        } else {
          expect(field.ref).toMatch(/\.(yaml|yml)$/)
        }
      }
    }
  })
})
