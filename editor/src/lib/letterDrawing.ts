import type { CatalogEntry } from './types'

export const TRACING_SYMBOLS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz']
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
export const LETTER_DRAWING_DESCRIPTION = 'Trace selected English letters in order along authored strokes and points. Letter case is preserved; Open World exercises do not require uppercase/lowercase pairs.'

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

export function tracingSymbols(params: Record<string, unknown>, target?: string | null): string[] {
  if (Object.hasOwn(params, 'symbols')) {
    return Array.isArray(params.symbols) ? params.symbols.map(String) : []
  }
  const legacy = typeof params.letter === 'string' ? params.letter : target
  return legacy ? [legacy] : []
}
