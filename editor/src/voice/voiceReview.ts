// Voice Review logic for the guide page: no React, no Supabase, so it is easy to test.
// A decision counts only while it was made on the item's current take (same rule as Unity's ReviewStore).

export type ReviewStatus = 'pending' | 'accepted' | 'rejected'

/** Where a line stands, as the list shows it. */
export type ItemState = 'toReview' | 'newTake' | 'accepted' | 'rejected'

export type Filter = 'toReview' | 'rejected' | 'accepted' | 'all'

/** How the side list groups the lines: by quest line (as the player meets them) or by character. */
export type GroupMode = 'questline' | 'character'

/** dialogue = a dialogue node; bubble = speech bubble; cutscene = cutscene subtitle; ambient = townsfolk in the street. */
export type LineSource = 'dialogue' | 'bubble' | 'cutscene' | 'ambient'

export interface VoiceItem {
  clip_path: string
  source?: LineSource | string
  variant?: string                  // 'girl' = the take a girl player hears
  speaker_key?: string              // voice_review_speakers.speaker_key
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

export interface VoiceSpeaker {
  speaker_key: string
  display_name: string
  voice_name: string
  brief: string
  image_path: string | null
}

export interface VoiceGroup {
  group_key: string
  title: string
  sort_order: number
  speaker_key: string
}

/** Lookups the page needs next to the lines; empty maps when the sync has not filled them yet. */
export interface People {
  speakers: Map<string, VoiceSpeaker>
  groups: Map<string, VoiceGroup>
}

export const SOURCE_LABEL: Record<string, string> = {
  bubble: 'בועת דיבור',
  cutscene: 'סרטון',
  ambient: 'משפט ברחוב',
}

export function speakerKeyOf(item: VoiceItem): string {
  return item.speaker_key || item.speaker
}

/** The key of the side-list entry a line belongs to in this mode. */
export function groupKeyOf(item: VoiceItem, mode: GroupMode): string {
  return mode === 'character' ? speakerKeyOf(item) : item.group_key
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

const NO_PEOPLE: People = { speakers: new Map(), groups: new Map() }

/** Legacy quest lines go last; otherwise the order the sync gave (voice_review_groups.sort_order). */
function questlineRank(key: string, people: People): [number, number, string] {
  const order = people.groups.get(key)?.sort_order
  return [Number(key.startsWith('Legacy')), order ?? Number.MAX_SAFE_INTEGER, key]
}

function compareRanks(a: [number, number, string], b: [number, number, string]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2])
}

/**
 * Side-list entries with their progress. By quest line: in the sync's order, legacy last.
 * By character: who has the most lines first.
 */
export function summarizeGroups(
  items: VoiceItem[],
  decisions: Map<string, VoiceDecision>,
  mode: GroupMode = 'questline',
  people: People = NO_PEOPLE,
): GroupSummary[] {
  const groups = new Map<string, GroupSummary>()
  for (const item of items) {
    const key = groupKeyOf(item, mode)
    let summary = groups.get(key)
    if (!summary) {
      summary = { key, total: 0, accepted: 0, rejected: 0, toReview: 0 }
      groups.set(key, summary)
    }
    summary.total += 1
    const state = stateOf(item, decisions.get(item.clip_path))
    if (state === 'accepted') summary.accepted += 1
    else if (state === 'rejected') summary.rejected += 1
    else summary.toReview += 1
  }
  const list = [...groups.values()]
  if (mode === 'character') return list.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
  return list.sort((a, b) => compareRanks(questlineRank(a.key, people), questlineRank(b.key, people)))
}

/**
 * The lines of one side-list entry in listening order. By character, a line's section is its quest line,
 * so the guide hears one character quest line by quest line.
 */
export function itemsOfGroup(items: VoiceItem[], group: string, mode: GroupMode = 'questline', people: People = NO_PEOPLE): VoiceItem[] {
  const list = items.filter((item) => groupKeyOf(item, mode) === group)
  if (mode === 'questline') return list.sort((a, b) => a.position - b.position)
  return list
    .map((item) => ({ ...item, section: groupTitle(item.group_key, people) }))
    .sort((a, b) => compareRanks(questlineRank(a.group_key, people), questlineRank(b.group_key, people)) || a.position - b.position)
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

/** The quest line's Hebrew title from the sync, else "the_royal_impostor" -> "The royal impostor". */
export function groupTitle(key: string, people: People = NO_PEOPLE): string {
  const title = people.groups.get(key)?.title
  if (title) return title
  const text = key.replace(/^Legacy\//, 'Legacy · ').replace(/_/g, ' ').trim()
  return text ? text[0].toUpperCase() + text.slice(1) : key
}

/** The name a guide knows a character by. */
export function speakerTitle(key: string, people: People = NO_PEOPLE): string {
  return people.speakers.get(key)?.display_name || key
}

/** Whose face a side-list entry shows: the character itself, or the quest line's NPC. */
export function faceOf(key: string, mode: GroupMode, people: People = NO_PEOPLE): string {
  return mode === 'character' ? key : people.groups.get(key)?.speaker_key ?? ''
}
