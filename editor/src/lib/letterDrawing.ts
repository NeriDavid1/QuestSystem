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
export const LETTER_DRAWING_DESCRIPTION = 'Trace a typed English word or selected letters in order along authored strokes and points. Letter case is preserved; Open World exercises do not require uppercase/lowercase pairs.'

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
  if (Object.hasOwn(params, 'drawingInputMode')) return String(params.drawingInputMode)
  return typeof params.word === 'string' && params.word.trim() ? 'Word' : 'Symbols'
}

export function tracingSymbols(params: Record<string, unknown>, target?: string | null): string[] {
  const mode = drawingInputMode(params)
  if (mode === 'Word') {
    const word = typeof params.word === 'string' ? params.word.trim() : ''
    return /^[A-Za-z]+$/.test(word) ? [...word] : []
  }
  if (mode !== 'Symbols') return []
  if (Object.hasOwn(params, 'symbols')) {
    return Array.isArray(params.symbols) ? params.symbols.map(String) : []
  }
  const legacy = typeof params.letter === 'string' ? params.letter : target
  return legacy ? [legacy] : []
}
