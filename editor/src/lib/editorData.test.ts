import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DIALOGUE_LOCALE,
  allocateQuestKey,
  allocateStepKey,
  buildSnapshotDocument,
  getCatalogKindForRef,
  getDialogueLines,
  getQuestSteps,
  getQuestlineQuests,
  getStepMinigame,
  getStepMinigameKey,
  isAutoManagedQuestKey,
  isLineScopedQuestKey,
  isLocalId,
  makeLocalId,
  normalizeContentKey,
  refreshDraftQuestKey,
  slugify,
  stepHasMinigameField,
  suggestDialogueBaseKey,
  suggestQuestBaseKey,
  suggestStepKey,
  uniqueDialogueKey,
  uniqueExactKey,
  uniqueKey,
  uniqueMinigameKey,
  uniqueQuestKey,
  uniqueQuestlineKey,
} from './editorData'
import { createDemoData } from './demoData'

const data = createDemoData()

describe('slugify', () => {
  it('lowercases and trims', () => {
    expect(slugify('  Hello World  ')).toBe('hello_world')
  })

  it('collapses non-alphanumeric runs to a single underscore', () => {
    expect(slugify('A--B!!!C')).toBe('a_b_c')
  })

  it('strips diacritics and transliterates accented latin', () => {
    expect(slugify('café')).toBe('cafe')
  })

  it('drops leading and trailing separators', () => {
    expect(slugify('---walk---')).toBe('walk')
  })

  it('falls back to a timestamp key for empty input', () => {
    expect(slugify('   ')).toMatch(/^line_[0-9a-z]+$/)
  })
})

describe('uniqueKey', () => {
  it('returns the base key when free', () => {
    expect(uniqueKey(['a', 'b'], 'c')).toBe('c')
  })

  it('appends _2, _3 when the key is taken', () => {
    expect(uniqueKey(['x', 'x_2'], 'x')).toBe('x_3')
  })

  it('produces a unique key when the slugified base is empty', () => {
    const key = uniqueKey(['nope'], '!!!', 'new_item')
    expect(key).not.toBe('nope')
    expect(key).not.toBe('new_item')
    expect(key.length).toBeGreaterThan(0)
  })
})

describe('uniqueExactKey / normalizeContentKey', () => {
  it('preserves double-underscore line scopes', () => {
    expect(normalizeContentKey('adjective_crown__q01_bridge')).toBe('adjective_crown__q01_bridge')
    expect(uniqueExactKey(['adjective_crown__q01_bridge'], 'adjective_crown__q01_bridge')).toBe(
      'adjective_crown__q01_bridge_2',
    )
  })
})

describe('suggestQuestBaseKey / allocateQuestKey', () => {
  it('builds line-scoped keys from line, position, and name', () => {
    expect(suggestQuestBaseKey('adjective_crown', 0, 'Bridge Too Short')).toBe(
      'adjective_crown__q01_bridge_too_short',
    )
    expect(suggestQuestBaseKey('kingdom_nouns', 6, 'Royal Noun Trial')).toBe(
      'kingdom_nouns__q07_royal_noun_trial',
    )
  })

  it('falls back to new_quest for Hebrew or empty names', () => {
    expect(suggestQuestBaseKey('linetest', 0, 'משימה חדשה')).toBe('linetest__q01_new_quest')
    expect(suggestQuestBaseKey('linetest', 1, '   ')).toBe('linetest__q02_new_quest')
  })

  it('allocates a globally unique key across all questlines', () => {
    const line = data.questlines[0]
    const key = allocateQuestKey(data, line.key, 0, 'Bridge Too Short')
    expect(key.startsWith(`${line.key}__`)).toBe(true)
    expect(data.quests.some((quest) => quest.key === key)).toBe(false)
  })

  it('does not collide with an existing scoped key', () => {
    const taken = suggestQuestBaseKey('demo_line', 0, 'Walk')
    const withTaken = {
      ...data,
      quests: [
        ...data.quests,
        {
          ...data.quests[0],
          id: 'taken-quest',
          questline_id: 'other-line',
          key: taken,
        },
      ],
    }
    expect(allocateQuestKey(withTaken, 'demo_line', 0, 'Walk')).toBe(`${taken}_2`)
  })
})

describe('suggestStepKey / allocateStepKey', () => {
  it('derives step keys from the quest key', () => {
    expect(suggestStepKey('adjective_crown__q01_bridge', 0)).toBe('adjective_crown__q01_bridge_s01')
    expect(suggestStepKey('q01_walk', 2)).toBe('q01_walk_s03')
  })

  it('allocates unique step keys within a quest', () => {
    const quest = data.quests[0]
    const key = allocateStepKey(data, quest.id, quest.key, 0)
    expect(key.startsWith(`${quest.key}_s`)).toBe(true)
    expect(data.steps.some((step) => step.quest_id === quest.id && step.key === key)).toBe(false)
  })
})

describe('isAutoManagedQuestKey / refreshDraftQuestKey', () => {
  it('treats scoped and placeholder keys as auto-managed', () => {
    expect(isAutoManagedQuestKey('adjective_crown__q01_bridge', 'adjective_crown')).toBe(true)
    expect(isAutoManagedQuestKey('q01_new_quest', 'linetest')).toBe(true)
    expect(isLineScopedQuestKey('adjective_crown__q01_bridge', 'adjective_crown')).toBe(true)
    expect(isLineScopedQuestKey('q01_bridge_too_short', 'adjective_crown')).toBe(false)
  })

  it('refreshes draft auto keys when the name changes', () => {
    const line = data.questlines[0]
    const draft = {
      ...data.quests[0],
      key: `${line.key}__q01_new_quest`,
      status: 'draft' as const,
      name: 'Old',
    }
    const withDraft = { ...data, quests: data.quests.map((quest) => (quest.id === draft.id ? draft : quest)) }
    const next = refreshDraftQuestKey(withDraft, draft, line.key, 'Bridge Too Short')
    expect(next).toBe(`${line.key}__q01_bridge_too_short`)
  })

  it('freezes published quest keys', () => {
    const line = data.questlines[0]
    const published = { ...data.quests[0], status: 'published' as const, key: `${line.key}__q01_new_quest` }
    expect(refreshDraftQuestKey(data, published, line.key, 'Bridge Too Short')).toBeNull()
  })
})

describe('unique* helpers', () => {
  it('produce keys not present in their scoped collections', () => {
    const allLineKeys = new Set(data.questlines.map((line) => line.key))
    const allQuestKeys = new Set(data.quests.map((quest) => quest.key))
    const allDialogueKeys = new Set(data.dialogues.map((dialogue) => dialogue.key))
    const lineKey = uniqueQuestlineKey(data, data.questlines[0].key)
    const questKey = uniqueQuestKey(data, data.quests[0].key)
    const dialogueKey = uniqueDialogueKey(data, data.dialogues[0].key)
    expect(allLineKeys.has(lineKey)).toBe(false)
    expect(allQuestKeys.has(questKey)).toBe(false)
    expect(allDialogueKeys.has(dialogueKey)).toBe(false)
  })

  it('uniqueDialogueKey can keep the current dialogue key when renaming', () => {
    const dialogue = data.dialogues[0]
    expect(uniqueDialogueKey(data, dialogue.key, dialogue.id)).toBe(dialogue.key)
    expect(uniqueDialogueKey(data, dialogue.key)).not.toBe(dialogue.key)
  })
})

describe('suggestDialogueBaseKey', () => {
  it('joins questline, quest, and role segments', () => {
    expect(suggestDialogueBaseKey('kingdom_nouns', 'q01_walk', 'start')).toBe('kingdom_nouns_q01_walk_start')
    expect(suggestDialogueBaseKey('kingdom_nouns', 'q01_walk_step_01')).toBe('kingdom_nouns_q01_walk_step_01')
  })

  it('skips empty and non-slugifiable segments', () => {
    expect(suggestDialogueBaseKey(null, 'q01_walk', 'turn_in')).toBe('q01_walk_turn_in')
    expect(suggestDialogueBaseKey('שלום', 'q01_walk', 'start')).toBe('q01_walk_start')
  })

  it('falls back when nothing usable remains', () => {
    expect(suggestDialogueBaseKey(null, '', '!!!')).toBe('new_dialogue')
  })
})

describe('makeLocalId', () => {
  it('generates valid non-prefixed UUIDs ready for direct upserts', () => {
    const id = makeLocalId('quest')
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(isLocalId(id)).toBe(false)
  })

  it('generates distinct ids', () => {
    expect(makeLocalId('quest')).not.toBe(makeLocalId('quest'))
  })
})

describe('getCatalogKindForRef', () => {
  it('maps registry ref patterns to catalog kinds', () => {
    expect(getCatalogKindForRef('npcs.yaml')).toBe('npc')
    expect(getCatalogKindForRef('areas.yaml')).toBe('area')
    expect(getCatalogKindForRef('interactables.yaml')).toBe('interactable')
    expect(getCatalogKindForRef('items.yaml')).toBe('item')
    expect(getCatalogKindForRef('minigames.yaml')).toBe('minigame')
  })

  it('returns null for dialogue refs and unknown refs', () => {
    expect(getCatalogKindForRef('_registry/dialogues/')).toBeNull()
    expect(getCatalogKindForRef(undefined)).toBeNull()
  })
})

describe('getQuestlineQuests / getQuestSteps', () => {
  it('sorts quests by position within a questline', () => {
    const quests = getQuestlineQuests(data, data.questlines[0].id)
    expect(quests.length).toBeGreaterThan(0)
    for (let i = 1; i < quests.length; i += 1) {
      expect(quests[i].position).toBeGreaterThanOrEqual(quests[i - 1].position)
    }
  })

  it('sorts steps by position within a quest', () => {
    const quest = data.quests[0]
    const steps = getQuestSteps(data, quest.id)
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i].position).toBeGreaterThanOrEqual(steps[i - 1].position)
    }
  })
})

describe('getDialogueLines', () => {
  it('orders lines by line_order then locale', () => {
    const dialogue = data.dialogues[0]
    const lines = getDialogueLines(data, dialogue.id)
    for (let i = 1; i < lines.length; i += 1) {
      const prev = lines[i - 1]
      const current = lines[i]
      expect(current.line_order > prev.line_order || (current.line_order === prev.line_order && current.locale >= prev.locale)).toBe(true)
    }
  })
})

describe('stepHasMinigameField / getStepMinigame', () => {
  it('detects play_minigame steps and resolves their attached instance', () => {
    const playStep = data.steps.find((step) => step.step_type === 'play_minigame')
    expect(playStep).toBeDefined()
    const step = playStep!
    expect(stepHasMinigameField(data, step)).toBe(true)
    const minigame = getStepMinigame(data, step)
    expect(minigame).toBeDefined()
    expect(minigame!.key).toBe(step.payload.instance_id)
    expect(Array.isArray(minigame!.tasks)).toBe(true)
  })

  it('returns undefined when no instance is attached', () => {
    const playStep = data.steps.find((step) => step.step_type === 'play_minigame')!
    const detached = { ...playStep, payload: { ...playStep.payload, instance_id: '' } }
    expect(getStepMinigame(data, detached)).toBeUndefined()
  })

  it('resolves steps imported from the pipeline via instance_key', () => {
    const playStep = data.steps.find((step) => step.step_type === 'play_minigame')!
    const imported = { ...playStep, payload: { ...playStep.payload, instance_id: '', instance_key: playStep.payload.instance_id } }
    const minigame = getStepMinigame(data, imported)
    expect(minigame).toBeDefined()
    expect(minigame!.key).toBe(playStep.payload.instance_id)
  })

  it('prefers instance_id over instance_key when both are present', () => {
    const playStep = data.steps.find((step) => step.step_type === 'play_minigame')!
    const dual = { ...playStep, payload: { ...playStep.payload, instance_id: 'other', instance_key: playStep.payload.instance_id } }
    expect(getStepMinigameKey(dual)).toBe('other')
    expect(getStepMinigame(data, dual)).toBeUndefined()
  })

  it('does not flag dialogue steps as minigame steps', () => {
    const talkStep = data.steps.find((step) => step.step_type === 'talk_to_npc')
    expect(talkStep).toBeDefined()
    expect(stepHasMinigameField(data, talkStep!)).toBe(false)
  })
})

describe('uniqueMinigameKey', () => {
  it('produces a key not present in the minigame collection', () => {
    const keys = new Set(data.minigames.map((minigame) => minigame.key))
    const key = uniqueMinigameKey(data, data.minigames[0].key)
    expect(keys.has(key)).toBe(false)
  })
})

describe('buildSnapshotDocument', () => {
  const line = data.questlines[0]
  const document = buildSnapshotDocument(data, line)

  it('includes questline fields', () => {
    expect(document.key).toBe(line.key)
    expect(document.display_name).toBe(line.display_name)
    expect(document.theme).toBe(line.theme)
  })

  it('maps every quest with its steps, rewards, and prerequisites', () => {
    const quests = document.quests as Array<{
      key: string
      steps: Array<{ key: string; type: string; payload: unknown }>
      rewards: unknown[]
      prerequisites: string[]
    }>
    const sourceQuests = getQuestlineQuests(data, line.id)
    expect(quests.length).toBe(sourceQuests.length)

    for (const [index, quest] of quests.entries()) {
      expect(quest.key).toBe(sourceQuests[index].key)
      const sourceSteps = getQuestSteps(data, sourceQuests[index].id)
      expect(quest.steps.length).toBe(sourceSteps.length)
      expect(quest.steps.map((step) => step.type)).toEqual(sourceSteps.map((step) => step.step_type))
      expect(quest.steps.map((step) => step.key)).toEqual(sourceSteps.map((step) => step.key))
    }
  })

  it('keeps step payloads intact', () => {
    const quests = document.quests as Array<{ steps: Array<{ payload: unknown }> }>
    const payloads = quests.flatMap((quest) => quest.steps.map((step) => step.payload))
    const sourceSteps = data.steps.filter((step) => getQuestlineQuests(data, line.id).some((quest) => quest.id === step.quest_id))
    expect(payloads).toEqual(sourceSteps.map((step) => step.payload))
  })

  it('includes quest-level dialogue keys on each quest snapshot', () => {
    const quests = document.quests as Array<Record<string, unknown>>
    expect(quests.length).toBeGreaterThan(0)
    for (const quest of quests) {
      expect(quest).toHaveProperty('start_dialogue_id')
      expect(quest).toHaveProperty('turn_in_dialogue_id')
      expect(quest).toHaveProperty('wait_for_npc_turn_in')
    }
  })

  it('embeds referenced dialogues and minigame instances', () => {
    expect(document).toHaveProperty('dialogues')
    expect(document).toHaveProperty('minigames')
    expect(typeof document.dialogues).toBe('object')
    expect(typeof document.minigames).toBe('object')
  })
})

describe('demoData contract', () => {
  it('uses the default dialogue locale constant', () => {
    expect(DEFAULT_DIALOGUE_LOCALE).toBe('he')
    expect(data.dialogueLines.every((line) => line.locale === DEFAULT_DIALOGUE_LOCALE)).toBe(true)
  })
})
