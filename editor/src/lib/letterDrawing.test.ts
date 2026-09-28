import { describe, expect, it } from 'vitest'
import { currentLetterDrawingCatalog, tracingSymbols, TRACING_SYMBOLS } from './letterDrawing'
import { defaultParamsForEntry, getMinigameParamsForEntry, readMinigameParam } from './minigameParams'
import type { CatalogEntry, MinigameInstance } from './types'

describe('current Letter Drawing contract', () => {
  const oldCatalog: CatalogEntry = { id: 1, name: 'Letter Drawing', description: null, status: 'live_used', image_path: null,
    kind: 'minigame', external_id: 'letter_drawing',
    metadata: { content_fields: ['letter', 'strokes', 'previewImage', 'clip'], variants: ['free_draw'] },
  }
  it('replaces an older connected catalog schema with ready-symbol selection', () => {
    const current = currentLetterDrawingCatalog(oldCatalog)
    expect(current.metadata.unity_config).toBe('LetterTracingQuestConfigSO')
    expect(current.metadata.variants).toEqual(['trace_guided'])
    expect(current.image_path).toBe('images/minigames/letter_drawing.png')
    expect(getMinigameParamsForEntry(oldCatalog).map((field) => field.name)).toEqual(['drawingInputMode', 'word', 'symbols'])
    expect(defaultParamsForEntry(oldCatalog)).toEqual({ drawingInputMode: 'Symbols', word: '', symbols: ['A'] })
    expect(TRACING_SYMBOLS).toHaveLength(52)
  })
  it('keeps arbitrary order, letter case and repetitions', () => {
    expect(tracingSymbols({ symbols: ['A', 'b', 'A', 'z'] })).toEqual(['A', 'b', 'A', 'z'])
  })
  it('reads legacy lowercase as one round without adding an uppercase pair', () => {
    expect(tracingSymbols({ letter: 'b' })).toEqual(['b'])
    const game: MinigameInstance = { id: 'm', key: 'm', locale: 'he', instruction: null, tasks: [],
      variant: null, success: null, minigame_id: 'letter_drawing', source_path: null, source_metadata: {},
      params: { letter: 'b' }, target: 'b' }
    expect(readMinigameParam(game, getMinigameParamsForEntry(oldCatalog).find(field => field.name === 'symbols')!)).toEqual(['b'])
  })
  it('does not replace an explicitly empty or malformed sequence with a legacy letter', () => {
    expect(tracingSymbols({ symbols: [], letter: 'A' })).toEqual([])
    expect(tracingSymbols({ symbols: 'A', letter: 'B' })).toEqual([])
  })
  it('resolves a typed word with case, repetitions and trimmed outer whitespace', () => {
    expect(tracingSymbols({ drawingInputMode: 'Word', word: ' Apple ', symbols: ['B'] })).toEqual(['A', 'p', 'p', 'l', 'e'])
    expect(tracingSymbols({ word: 'aAa' })).toEqual(['a', 'A', 'a'])
    expect(tracingSymbols({ drawingInputMode: 'Symbols', word: 'Apple', symbols: ['z'] })).toEqual(['z'])
  })
  it('rejects invalid words without falling back to selected symbols', () => {
    for (const word of ['', 'two words', 'abc1', 'é', 'a-b']) {
      expect(tracingSymbols({ drawingInputMode: 'Word', word, symbols: ['A'] })).toEqual([])
    }
    expect(tracingSymbols({ drawingInputMode: 'Unknown', symbols: ['A'] })).toEqual([])
  })

})
