import { describe, expect, it } from 'vitest'
import { formatMessage, messages, type MessageKey } from '../i18n/messages'
import { createDemoData } from './demoData'
import { getStepType } from './editorData'
import {
  defaultStepPayload,
  orderedStepTypes,
  parseNumberInput,
  retypeStepPayload,
  stepFieldLabel,
  stepSummary,
  stepTypeName,
} from './stepPresentation'
import type { QuestStep } from './types'

const en = (key: MessageKey, vars?: Record<string, string | number>) => formatMessage(messages.en[key], vars)

function step(step_type: string, payload: Record<string, unknown>): QuestStep {
  return { id: 's', quest_id: 'q', key: 'k', position: 0, step_type, payload, source_metadata: {} }
}

describe('step presentation', () => {
  const data = createDemoData()

  it('names known step types and falls back to the id for others', () => {
    expect(stepTypeName(en, 'deliver_item')).toBe('Deliver items')
    expect(stepTypeName(en, 'defeat_monsters')).toBe('defeat monsters')
    expect(stepFieldLabel(en, 'world_object_id')).toBe('World station')
    expect(stepFieldLabel(en, 'custom_field')).toBe('custom field')
  })

  it('summarises a step with catalog names', () => {
    const maya = data.catalog.find((entry) => entry.kind === 'npc' && entry.external_id === 'teacher_maya')
    const gem = data.catalog.find((entry) => entry.kind === 'item' && entry.external_id === 'gem')
    expect(stepSummary(en, data, step('deliver_item', { npc_id: 'teacher_maya', item_id: 'gem', amount: 2 })))
      .toBe(`Bring 2 × ${gem?.name} to ${maya?.name}`)
    expect(stepSummary(en, data, step('reach_location', {}))).toBe('Go to not set')
  })

  it('lists step types in quest-flow order', () => {
    expect(orderedStepTypes(data).map((type) => type.id).slice(0, 3)).toEqual(['talk_to_npc', 'return_to_npc', 'reach_location'])
  })

  it('pre-fills a delivery with the item the previous step rewarded', () => {
    const previous = step('play_minigame', { minigame_id: 'letter_ordering', reward_item_id: 'oak_log', reward_amount: 3 })
    expect(defaultStepPayload(getStepType(data, 'deliver_item'), { giver: 'teacher_maya', previousStep: previous }))
      .toEqual({ npc_id: 'teacher_maya', item_id: 'oak_log', amount: 3 })
  })

  it('starts a minigame step with required fields only', () => {
    expect(defaultStepPayload(getStepType(data, 'play_minigame'), { giver: null }))
      .toEqual({ minigame_id: '', world_object_id: '', difficulty: 1, success_required: true })
  })

  it('drops fields the new step type does not declare', () => {
    const payload = retypeStepPayload(getStepType(data, 'reach_location'), { npc_id: 'teacher_maya', dialogue_id: 'd1' }, { giver: null })
    expect(payload).toEqual({ location_id: '' })
  })

  it('keeps shared fields and the minigame content link', () => {
    const payload = retypeStepPayload(
      getStepType(data, 'play_minigame'),
      { minigame_id: 'word_ordering', instance_key: 'inst_1', npc_id: 'x' },
      { giver: null },
    )
    expect(payload).toMatchObject({ minigame_id: 'word_ordering', instance_key: 'inst_1' })
    expect(payload).not.toHaveProperty('npc_id')
  })

  it('keeps a cleared number empty and clamps to min/max', () => {
    const field = { type: 'integer', min: 1, max: 10 }
    expect(parseNumberInput('', field)).toBe('')
    expect(parseNumberInput('0', field)).toBe(1)
    expect(parseNumberInput('42', field)).toBe(10)
    expect(parseNumberInput('2.6', field)).toBe(3)
    expect(parseNumberInput('2.5', { type: 'float' })).toBe(2.5)
  })
})
