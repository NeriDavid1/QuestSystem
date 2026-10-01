import { describe, expect, it } from 'vitest'
import { createDemoData } from './demoData'
import { currentMiniGameCatalog, LISTENING_LETTER_ORDERING_ID, orderingVisual } from './letterOrdering'
import { defaultParamsForEntry } from './minigameParams'
import { validateQuestline } from './validation'

describe('Letter Ordering presentation contract', () => {
  it('adds the listening catalog to old connected catalogs once, retaining unrelated entries', () => {
    const original = createDemoData().catalog.filter(e => e.external_id !== LISTENING_LETTER_ORDERING_ID)
    const catalog = currentMiniGameCatalog(original)
    expect(catalog.filter(e => e.external_id === LISTENING_LETTER_ORDERING_ID)).toHaveLength(1)
    expect(currentMiniGameCatalog(catalog)).toEqual(catalog)
    expect(catalog.find(e => e.external_id === 'teacher_maya')).toEqual(original.find(e => e.external_id === 'teacher_maya'))
    const classic = catalog.find(e => e.external_id === 'letter_ordering')
    const listening = catalog.find(e => e.external_id === LISTENING_LETTER_ORDERING_ID)
    expect(defaultParamsForEntry(classic).visualVariant).toBe('Classic')
    expect(defaultParamsForEntry(listening).visualVariant).toBe('ListenAndBuild')
    expect(listening?.metadata.unity_config).toBe(classic?.metadata.unity_config)
    expect(listening?.image_path).toBe('images/minigames/listening_letter_ordering.png')
  })

  it('uses the selected minigame even when old presentation params disagree', () => {
    expect(orderingVisual('letter_ordering', {})).toBe('Classic')
    expect(orderingVisual(LISTENING_LETTER_ORDERING_ID, {})).toBe('ListenAndBuild')
    expect(orderingVisual(LISTENING_LETTER_ORDERING_ID, { visualVariant: 'Classic' })).toBe('ListenAndBuild')
    expect(orderingVisual('letter_ordering', { visualVariant: 'ListenAndBuild' })).toBe('Classic')
  })

  it('allows optional recording and validates enum selections before publishing', () => {
    const data = createDemoData()
    const line = data.questlines[0]
    const quest = data.quests.find(q => q.questline_id === line.id)!
    const step = data.steps.find(s => s.quest_id === quest.id)!
    const game = data.minigames[0]
    step.payload = { minigame_id: LISTENING_LETTER_ORDERING_ID, world_object_id: 'WoodenCart3_The_Oath_stone_Bridge', instance_key: game.key }
    game.params = { targetWord: 'bee' }
    const codes = () => validateQuestline(data, line, key => key).filter(i => i.entityId === step.id).map(i => i.code)
    expect(codes()).not.toContain('missing_ordering_audio')
    game.params.promptAudio = 'Assets/_OurAssets/Art/Audio/Museum sounds/SOUNDS FOR MUSEUM new/BEE.mp3'
    expect(codes()).not.toContain('missing_ordering_audio')
    game.params.visualVariant = 'Classic'
    delete game.params.promptAudio
    expect(codes()).not.toContain('missing_ordering_audio')
    game.params.hintMode = 'unsupported'
    expect(codes()).toContain('invalid_ordering_presentation')
  })
})
