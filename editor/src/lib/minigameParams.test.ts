import { describe, expect, it } from 'vitest'
import {
  MINIGAME_PARAM_FIELDS,
  defaultParamsForEntry,
  defaultValueForType,
  getMinigameParamFieldNames,
  getMinigameParamFieldsForInstance,
  getMinigameParamsForEntry,
  getMinigameVariantsForEntry,
  normalizeParamValue,
  readMinigameParam,
  type MinigameParamField,
} from './minigameParams'
import type { CatalogEntry, EditorData, MinigameInstance } from './types'

function entry(externalId: string, contentFields: string[], variants: string[] = []): CatalogEntry {
  return {
    id: 1,
    kind: 'minigame',
    external_id: externalId,
    name: externalId,
    description: null,
    status: 'live_used',
    image_path: null,
    metadata: { content_fields: contentFields, variants },
  }
}

const letterOrdering = entry('letter_ordering', ['prompt', 'targetWord', 'extraDistractorCount', 'customDistractors', 'wordRevealDatabase'], ['word_spelling'])
const speakAloud = entry('speak_aloud', ['prompt', 'targetWords', 'targetPhrase', 'silenceTimeoutSeconds', 'allowFuzzyMatch', 'referenceClip', 'wordRevealDatabase'], ['single_word', 'short_phrase'])

const data: EditorData = {
  questlines: [],
  quests: [],
  steps: [],
  prerequisites: [],
  rewards: [],
  dialogues: [],
  dialogueLines: [],
  minigames: [],
  catalog: [letterOrdering, speakAloud],
  stepTypes: [],
  revisions: [],
}

function minigame(overrides: Partial<MinigameInstance> = {}): MinigameInstance {
  return {
    id: 'm1',
    key: 'demo_minigame_1',
    locale: 'he',
    instruction: null,
    tasks: [],
    target: null,
    variant: null,
    success: null,
    params: {},
    source_path: null,
    source_metadata: {},
    ...overrides,
  }
}

describe('minigameParams schema', () => {
  it('declares a field definition for every Unity content field', () => {
    for (const [name, field] of Object.entries(MINIGAME_PARAM_FIELDS)) {
      expect(field.name).toBe(name)
      expect(field.type).toBeTruthy()
      expect(field.labelKey).toBeTruthy()
    }
  })

  it('returns the content_fields declared on the catalog entry', () => {
    expect(getMinigameParamFieldNames(letterOrdering)).toEqual([
      'prompt', 'targetWord', 'extraDistractorCount', 'customDistractors', 'wordRevealDatabase',
    ])
    expect(getMinigameParamFieldNames(undefined)).toEqual([])
  })

  it('resolves only declared fields that have a known definition', () => {
    const fields = getMinigameParamsForEntry(letterOrdering)
    expect(fields.map((field) => field.name)).toEqual([
      'prompt', 'targetWord', 'extraDistractorCount', 'customDistractors', 'wordRevealDatabase',
    ])
  })

  it('returns catalog gameplay variants', () => {
    expect(getMinigameVariantsForEntry(speakAloud)).toEqual(['single_word', 'short_phrase'])
    expect(getMinigameVariantsForEntry(undefined)).toEqual([])
  })
})

describe('defaultParamsForEntry', () => {
  it('seeds every declared field with its default', () => {
    const params = defaultParamsForEntry(speakAloud)
    expect(params.prompt).toBe('Arrange the letters')
    expect(params.targetPhrase).toBe('')
    expect(params.allowFuzzyMatch).toBe(true)
    expect(params.targetWords).toEqual([])
    expect(params.wordRevealDatabase).toBe('')
  })

  it('returns an empty object for unknown entries', () => {
    expect(defaultParamsForEntry(undefined)).toEqual({})
  })
})

describe('getMinigameParamFieldsForInstance', () => {
  it('resolves fields by catalog variant when the variant is a game external id', () => {
    const instance = minigame({ variant: 'letter_ordering', params: { prompt: 'x' } })
    const fields = getMinigameParamFieldsForInstance(data, instance)
    expect(fields.map((field) => field.name)).toContain('targetWord')
  })

  it('falls back to the parameter keys already present on the instance', () => {
    const instance = minigame({ variant: 'word_spelling', params: { targetWord: 'cat', allowFuzzyMatch: true } })
    const fields = getMinigameParamFieldsForInstance(data, instance)
    expect(fields.map((field) => field.name)).toEqual(['targetWord', 'allowFuzzyMatch'])
  })

  it('returns an empty field list for an instance with no params', () => {
    expect(getMinigameParamFieldsForInstance(data, minigame())).toEqual([])
  })
})

describe('readMinigameParam', () => {
  const field: MinigameParamField = { name: 'extraDistractorCount', labelKey: 'x', type: 'integer', default: 2 }

  it('falls back to the field default when unset', () => {
    expect(readMinigameParam(minigame(), field)).toBe(2)
    expect(readMinigameParam(minigame({ params: { extraDistractorCount: '' } }), field)).toBe(2)
  })

  it('returns the stored value when set', () => {
    expect(readMinigameParam(minigame({ params: { extraDistractorCount: 5 } }), field)).toBe(5)
  })
})

describe('normalizeParamValue', () => {
  it('coerces booleans', () => {
    const field: MinigameParamField = { name: 'allowFuzzyMatch', labelKey: 'x', type: 'boolean' }
    expect(normalizeParamValue(field, true)).toBe(true)
    expect(normalizeParamValue(field, 'false')).toBe(false)
    expect(normalizeParamValue(field, 1)).toBe(true)
  })

  it('truncates integers', () => {
    const field: MinigameParamField = { name: 'extraDistractorCount', labelKey: 'x', type: 'integer' }
    expect(normalizeParamValue(field, 3.9)).toBe(3)
    expect(normalizeParamValue(field, 'nope')).toBe(0)
  })

  it('keeps arrays of strings and ints', () => {
    const strings: MinigameParamField = { name: 'targetWords', labelKey: 'x', type: 'stringArray' }
    expect(normalizeParamValue(strings, ['cat', 'dog'])).toEqual(['cat', 'dog'])
    const ints: MinigameParamField = { name: 'preFilledIndices', labelKey: 'x', type: 'integerArray' }
    expect(normalizeParamValue(ints, [0, 1.5, 'x'])).toEqual([0, 1])
  })

  it('reduces charArray entries to single characters', () => {
    const field: MinigameParamField = { name: 'customDistractors', labelKey: 'x', type: 'charArray' }
    expect(normalizeParamValue(field, ['ab', ' c ', ''])).toEqual(['a', 'c', ''])
  })

  it('passes json values through untouched', () => {
    const field: MinigameParamField = { name: 'wordTasks', labelKey: 'x', type: 'json' }
    const value = [{ id: 'a', fullWord: 'cat' }]
    expect(normalizeParamValue(field, value)).toEqual(value)
  })

  it('strings arbitrary scalars', () => {
    const field: MinigameParamField = { name: 'targetWord', labelKey: 'x', type: 'string' }
    expect(normalizeParamValue(field, 42)).toBe('42')
    expect(normalizeParamValue(field, null)).toBe('')
  })
})

describe('defaultValueForType', () => {
  it('returns the right primitive per type', () => {
    expect(defaultValueForType('boolean')).toBe(false)
    expect(defaultValueForType('number')).toBe(0)
    expect(defaultValueForType('integer')).toBe(0)
    expect(defaultValueForType('stringArray')).toEqual([])
    expect(defaultValueForType('json')).toEqual([])
    expect(defaultValueForType('string')).toBe('')
    expect(defaultValueForType('asset')).toBe('')
  })
})
