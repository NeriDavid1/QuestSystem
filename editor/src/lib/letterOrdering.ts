import type { CatalogEntry } from './types'
import { currentLetterDrawingCatalog } from './letterDrawing'

export const LISTENING_LETTER_ORDERING_ID = 'listening_letter_ordering'
export const ORDERING_FIELDS = ['prompt', 'targetWord', 'extraDistractorCount', 'customDistractors', 'visualVariant', 'promptAudio', 'hintMode', 'wordRevealDatabase']
export const LISTENING_DESCRIPTION = 'Listen to the assigned English recording, then arrange letters to spell the word. Separate teal and gold visuals, replay button, and optional text clue. Uses the shared Letter Ordering validation.'
const orderingMetadata = {
  unity_config: 'LetterOrderingQuestConfigSO', unity_content: 'LetterOrderingDataSO',
  category: 'spelling', difficulty_range: [1, 6], content_fields: ORDERING_FIELDS,
  typical_stations: ['chest', 'cart', 'tombstone', 'exam_table'],
}

export function isLetterOrdering(kind: unknown): boolean {
  return kind === 'letter_ordering' || kind === LISTENING_LETTER_ORDERING_ID
}

export function orderingVisual(kind: unknown, params: Record<string, unknown>): unknown {
  return params.visualVariant ?? (kind === LISTENING_LETTER_ORDERING_ID ? 'ListenAndBuild' : 'Classic')
}

/** Shipped schemas remain available with older database catalogs. */
export function currentLetterOrderingCatalog(entry: CatalogEntry): CatalogEntry {
  if (entry.kind !== 'minigame' || !isLetterOrdering(entry.external_id)) return entry
  const listening = entry.external_id === LISTENING_LETTER_ORDERING_ID
  return {
    ...entry,
    ...(listening ? { name: 'Listen & Build', description: LISTENING_DESCRIPTION, image_path: 'images/minigames/listening_letter_ordering.png' } : {}),
    metadata: { ...entry.metadata, ...orderingMetadata,
      english_focus: listening ? 'Listening comprehension, spelling' : 'Spelling, letter recognition',
      variants: listening ? ['listening_spelling'] : ['word_spelling'],
    },
  }
}

export function currentMiniGameCatalog(catalog: CatalogEntry[]): CatalogEntry[] {
  const entries = catalog.map(currentLetterDrawingCatalog).map(currentLetterOrderingCatalog)
  if (!entries.some(e => e.kind === 'minigame' && e.external_id === LISTENING_LETTER_ORDERING_ID)) {
    entries.push(currentLetterOrderingCatalog({
      id: Math.min(0, ...catalog.map(e => e.id)) - 1, kind: 'minigame',
      external_id: LISTENING_LETTER_ORDERING_ID, name: 'Listen & Build',
      description: LISTENING_DESCRIPTION, status: 'live_used',
      image_path: 'images/minigames/listening_letter_ordering.png', metadata: {},
    }))
  }
  return entries
}
