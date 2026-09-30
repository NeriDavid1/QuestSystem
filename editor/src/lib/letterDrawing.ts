import type { CatalogEntry } from './types'

export const TRACING_SYMBOLS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz']
export const LETTER_DRAWING_METADATA = {
  unity_config: 'LetterTracingQuestConfigSO',
  unity_content: 'TracingLessonSO',
  category: 'motor_skills',
  english_focus: 'Letter formation, stroke order',
  difficulty_range: [1, 4],
  content_fields: ['drawingInputMode', 'word', 'symbols'],
  variants: ['trace_guided'],
  typical_stations: ['shop', 'chest', 'cart'],
}
export const LETTER_DRAWING_DESCRIPTION = 'Trace selected letters, a typed English word, or selected letters followed by a word. Letter case and authored order are preserved.'

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
  const mode = drawingInputMode(params)
  if (mode === 'Word' || mode === 'SymbolsThenWord') {
    const word = typeof params.word === 'string' ? params.word.trim() : ''
    if (!/^[A-Za-z]+$/.test(word)) return []
    if (mode === 'Word') return [...word]
  }
  if (mode !== 'Symbols' && mode !== 'SymbolsThenWord') return []
  if (Object.hasOwn(params, 'symbols')) {
    const symbols = Array.isArray(params.symbols) ? params.symbols.map(String) : []
    if (mode === 'SymbolsThenWord' && (symbols.length === 0 || symbols.some((symbol) => !/^[A-Za-z]$/.test(symbol)))) return []
    return mode === 'SymbolsThenWord' ? [...symbols, ...(params.word as string).trim()] : symbols
  }
  const legacy = typeof params.letter === 'string' ? params.letter : target
  return legacy ? (mode === 'SymbolsThenWord' ? [legacy, ...(params.word as string).trim()] : [legacy]) : []
}

export function tracingSteps(params: Record<string, unknown>, target?: string | null): string[] {
  const symbols = tracingSymbols(params, target)
  if (!symbols.length) return []
  const mode = drawingInputMode(params)
  const word = typeof params.word === 'string' ? params.word.trim() : ''
  if (mode === 'Word') return [word]
  if (mode === 'SymbolsThenWord') return [...symbols.slice(0, -word.length), word]
  return symbols
}
