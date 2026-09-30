// Voice Review logic for the guide page: no React, no Supabase, so it is easy to test.
// A decision counts only while it was made on the item's current take (same rule as Unity's ReviewStore).

export type ReviewStatus = 'pending' | 'accepted' | 'rejected'

/** Where a line stands, as the list shows it. */
export type ItemState = 'toReview' | 'newTake' | 'accepted' | 'rejected'

export type Filter = 'toReview' | 'rejected' | 'accepted' | 'all'

export interface VoiceItem {
  clip_path: string
  group_key: string
  section: string
  position: number
  speaker: string
  voice_name: string
  on_screen_text: string
  tts_text: string
  take_hash: string
  audio_path: string
  alternate_audio_path: string | null
}

export interface VoiceDecision {
  clip_path: string
  status: ReviewStatus
  tags: string[]
  note: string
  take_hash: string
  speaker: string
  text: string
  reviewed_at: string
  reviewer_name: string
}

/**
 * Reject reasons. `tag` is saved in the review file exactly as Unity's Dialogue tab saves it
 * (the voice-over tools and Claude read these); `label` is what the guide sees.
 */
export const REJECT_REASONS: Array<{ tag: string; label: string }> = [
  { tag: 'Pronunciation', label: 'הגייה לא נכונה' },
  { tag: 'English word', label: 'מילה באנגלית' },
  { tag: 'Wrong emotion', label: 'רגש לא מתאים' },
  { tag: 'Too fast', label: 'מהיר מדי' },
  { tag: 'Too slow', label: 'איטי מדי' },
  { tag: 'Wrong gender', label: 'מגדר לא נכון' },
  { tag: 'Sounds like other character', label: 'נשמע כמו דמות אחרת' },
  { tag: 'Audio glitch', label: 'רעש או תקלה בשמע' },
  { tag: 'Script text wrong', label: 'הטקסט עצמו שגוי' },
]

export function reasonLabel(tag: string): string {
  return REJECT_REASONS.find((reason) => reason.tag === tag)?.label ?? tag
}

export function stateOf(item: VoiceItem, decision: VoiceDecision | undefined): ItemState {
  if (!decision || decision.status === 'pending') return 'toReview'
  if (decision.take_hash !== item.take_hash) return 'newTake'
  return decision.status === 'accepted' ? 'accepted' : 'rejected'
}

export function needsReview(state: ItemState): boolean {
  return state === 'toReview' || state === 'newTake'
}

export function matchesFilter(state: ItemState, filter: Filter): boolean {
  switch (filter) {
    case 'toReview': return needsReview(state)
    case 'rejected': return state === 'rejected'
    case 'accepted': return state === 'accepted'
    default: return true
  }
}

export interface GroupSummary {
  key: string
  total: number
  accepted: number
  rejected: number
  toReview: number
}

/** Groups in the order the sync script listed them (quest lines first, legacy last). */
export function summarizeGroups(items: VoiceItem[], decisions: Map<string, VoiceDecision>): GroupSummary[] {
  const groups = new Map<string, GroupSummary>()
  for (const item of items) {
    let summary = groups.get(item.group_key)
    if (!summary) {
      summary = { key: item.group_key, total: 0, accepted: 0, rejected: 0, toReview: 0 }
      groups.set(item.group_key, summary)
    }
    summary.total += 1
    const state = stateOf(item, decisions.get(item.clip_path))
    if (state === 'accepted') summary.accepted += 1
    else if (state === 'rejected') summary.rejected += 1
    else summary.toReview += 1
  }
  return [...groups.values()].sort((a, b) =>
    Number(a.key.startsWith('Legacy')) - Number(b.key.startsWith('Legacy')) || a.key.localeCompare(b.key))
}

export function itemsOfGroup(items: VoiceItem[], group: string): VoiceItem[] {
  return items.filter((item) => item.group_key === group).sort((a, b) => a.position - b.position)
}

/** The next line after `current` (wrapping around) that still needs a decision, or null when all are done. */
export function nextToReview(
  list: VoiceItem[],
  decisions: Map<string, VoiceDecision>,
  current: string | null,
): VoiceItem | null {
  if (list.length === 0) return null
  const start = Math.max(0, list.findIndex((item) => item.clip_path === current))
  for (let offset = 1; offset <= list.length; offset += 1) {
    const item = list[(start + offset) % list.length]
    if (needsReview(stateOf(item, decisions.get(item.clip_path)))) return item
  }
  return null
}

/**
 * The decision to save. Accepting clears the reasons but keeps the note, as in Unity.
 * `reviewed_at` is set by the caller (the time the guide clicked).
 */
export function buildDecision(
  item: VoiceItem,
  status: ReviewStatus,
  previous: VoiceDecision | undefined,
  change: { tags?: string[]; note?: string },
  reviewerName: string,
  now: Date,
): VoiceDecision {
  const tags = status === 'accepted' ? [] : change.tags ?? (previous?.take_hash === item.take_hash ? previous.tags : [])
  return {
    clip_path: item.clip_path,
    status,
    tags: [...tags],
    note: change.note ?? previous?.note ?? '',
    take_hash: item.take_hash,
    speaker: item.speaker,
    text: item.tts_text,
    reviewed_at: now.toISOString(),
    reviewer_name: reviewerName,
  }
}

export function sectionsOf(list: VoiceItem[]): Array<{ section: string; items: VoiceItem[] }> {
  const sections: Array<{ section: string; items: VoiceItem[] }> = []
  for (const item of list) {
    const last = sections[sections.length - 1]
    if (last && last.section === item.section) last.items.push(item)
    else sections.push({ section: item.section, items: [item] })
  }
  return sections
}

/** "the_royal_impostor" -> "The royal impostor" for the group picker. */
export function groupTitle(key: string): string {
  const text = key.replace(/^Legacy\//, 'Legacy · ').replace(/_/g, ' ').trim()
  return text ? text[0].toUpperCase() + text.slice(1) : key
}
