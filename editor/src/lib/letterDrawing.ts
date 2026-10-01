import type { CatalogEntry } from './types'

export const LETTER_DRAWING_METADATA = {
  unity_config: 'LetterTracingQuestConfigSO',
  unity_content: 'TracingLessonSO',
  category: 'motor_skills',
  english_focus: 'Letter formation, stroke order',
  difficulty_range: [1, 4],
  content_fields: ['symbols'],
  variants: ['trace_guided'],
  typical_stations: ['shop', 'chest', 'cart'],
}
export const LETTER_DRAWING_DESCRIPTION = 'Type letters or English words in the order they should be traced. Each entry is one round; letter case is preserved.'

/** Keep the shipped runtime contract current even when a DB catalog row predates it. */
export function currentLetterDrawingCatalog(entry: CatalogEntry): CatalogEntry {
  if (entry.kind !== 'minigame' || entry.external_id !== 'letter_drawing') return entry
  return {
    ...entry,
    description: LETTER_DRAWING_DESCRIPTION,
    image_path: 'images/minigames/letter_drawing.png',
    metadata: { ...entry.metadata, ...LETTER_DRAWING_METADATA },
  }
}

export function drawingInputMode(params: Record<string, unknown>): string {
  if (params.drawingInputMode === 'SymbolsThenWord') return 'SymbolsThenWord'
  if (typeof params.word === 'string' && params.word.trim()) return 'Word'
  if (Object.hasOwn(params, 'drawingInputMode')) return String(params.drawingInputMode)
  return 'Symbols'
}

export function tracingSymbols(params: Record<string, unknown>, target?: string | null): string[] {
  const steps = tracingSteps(params, target)
  return steps.flatMap((step) => [...step])
}

export function tracingSteps(params: Record<string, unknown>, target?: string | null): string[] {
  const mode = drawingInputMode(params)
  if (mode !== 'Symbols' && mode !== 'Word' && mode !== 'SymbolsThenWord') return []
  const word = typeof params.word === 'string' ? params.word.trim() : ''
  // Published exercises with the old word field keep their original order.
  if (word || mode === 'Word' || mode === 'SymbolsThenWord') {
    if (!/^[A-Za-z]+$/.test(word)) return []
    if (mode === 'Word') return [word]
    if (mode === 'SymbolsThenWord') {
      const selected = Array.isArray(params.symbols) ? params.symbols.map(String) :
        [typeof params.letter === 'string' ? params.letter : target ?? '']
      return selected.length && selected.every((entry) => /^[A-Za-z]$/.test(entry)) ? [...selected, word] : []
    }
  }
  const entries = Object.hasOwn(params, 'symbols') ? params.symbols :
    [typeof params.letter === 'string' ? params.letter : target ?? '']
  if (!Array.isArray(entries) || !entries.length) return []
  const steps = entries.map(String)
  return steps.every((entry) => /^[A-Za-z]+$/.test(entry)) ? steps : []
}
