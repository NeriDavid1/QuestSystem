import { hasSupabaseConfig, supabase } from '../lib/supabase'
import type { People, VoiceDecision, VoiceGroup, VoiceItem, VoiceSetup, VoiceSpeaker, VoiceTake } from './voiceReview'

// Filled from the Unity project by scripts/voice_review_sync.py; see supabase/migrations/*_voice_review.sql.
const BUCKET = 'voice-review'
const ITEM_COLUMNS = 'clip_path,source,variant,speaker_key,voice_key,group_key,section,position,speaker,voice_name,on_screen_text,tts_text,take_hash,audio_path,alternate_audio_path'
const PEOPLE_ITEM_COLUMNS = 'clip_path,source,variant,speaker_key,group_key,section,position,speaker,voice_name,on_screen_text,tts_text,take_hash,audio_path,alternate_audio_path'
const OLD_ITEM_COLUMNS = 'clip_path,group_key,section,position,speaker,voice_name,on_screen_text,tts_text,take_hash,audio_path,alternate_audio_path'
const DECISION_COLUMNS = 'clip_path,status,tags,note,take_hash,speaker,text,reviewed_at,reviewer_name'

export const demoMode = !hasSupabaseConfig

async function allRows<T>(table: string, columns: string, key = 'clip_path'): Promise<T[]> {
  if (!supabase) return []
  const rows: T[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).order(key).range(offset, offset + pageSize - 1)
    if (error) throw error
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

/** True for "this column / table is not there yet" (the people migration has not been applied). */
function isMissingSchema(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? ''
  return code === '42703' || code === '42P01' || code === 'PGRST204' || code === 'PGRST205'
}

export async function loadItems(): Promise<VoiceItem[]> {
  if (demoMode) return demoItems
  // Newest columns first; a database without the latest migration still loads.
  for (const columns of [ITEM_COLUMNS, PEOPLE_ITEM_COLUMNS]) {
    try {
      return await allRows<VoiceItem>('voice_review_items', columns)
    } catch (error) {
      if (!isMissingSchema(error)) throw error
    }
  }
  return allRows<VoiceItem>('voice_review_items', OLD_ITEM_COLUMNS)
}

async function optionalRows<T>(table: string, columns: string, key: string): Promise<T[]> {
  try {
    return await allRows<T>(table, columns, key)
  } catch (error) {
    if (isMissingSchema(error)) return []
    throw error
  }
}

/** Characters (with their picture) and quest line titles; empty until the sync has filled them. */
export async function loadPeople(): Promise<People> {
  const [speakers, groups] = demoMode
    ? [demoSpeakers, demoGroups]
    : await Promise.all([
      optionalRows<VoiceSpeaker>('voice_review_speakers', 'speaker_key,display_name,voice_name,brief,image_path', 'speaker_key'),
      optionalRows<VoiceGroup>('voice_review_groups', 'group_key,title,sort_order,speaker_key', 'group_key'),
    ])
  return { speakers: new Map(speakers.map((s) => [s.speaker_key, s])), groups: new Map(groups.map((g) => [g.group_key, g])) }
}

/** Viewable URLs of the characters' pictures, by speaker key. */
export async function pictureUrls(people: People): Promise<Map<string, string>> {
  const keyByPath = new Map<string, string[]>()
  for (const speaker of people.speakers.values()) {
    if (speaker.image_path) keyByPath.set(speaker.image_path, [...(keyByPath.get(speaker.image_path) ?? []), speaker.speaker_key])
  }
  const paths = [...keyByPath.keys()]
  const urls = demoMode ? new Map(paths.map((path) => [path, `./${path}`])) : await audioUrls(paths)
  const result = new Map<string, string>()
  for (const [path, keys] of keyByPath) {
    const url = urls.get(path)
    if (url) for (const key of keys) result.set(key, url)
  }
  return result
}

// ---------- New takes in the character's voice (edge function voice-review-tts) ----------

const TAKE_COLUMNS = 'id,clip_path,voice_key,text,audio_path,characters,status,creator_name,created_at,chosen_by_name,imported_at'

export interface KeyStatus {
  saved: boolean
  hint: string
  set_by: string
  set_at: string | null
  characters_left: number | null
}

/** A failure the guide can understand; `code` comes from the edge function. */
export class TakeError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const TAKE_ERRORS: Record<string, string> = {
  no_key: 'עוד לא נשמר מפתח ElevenLabs. לחצו על "מפתח ElevenLabs" למעלה.',
  bad_key: 'ElevenLabs לא מקבלים את המפתח השמור. שמרו מפתח חדש.',
  no_credits: 'נגמרו התווים בחשבון ElevenLabs.',
  no_voice: 'לדמות הזו עוד אין קול מאושר ב-Unity.',
  slow_down: 'יותר מדי הקלטות בדקה. חכו רגע ונסו שוב.',
  too_long: 'הטקסט ארוך מדי.',
  empty_text: 'אין טקסט להקראה.',
  not_allowed: 'אין לכם הרשאה ליצור הקלטות.',
  not_signed_in: 'צריך להתחבר מחדש.',
}

async function callTakes<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new TakeError('demo', 'demo')
  const { data, error } = await supabase.functions.invoke('voice-review-tts', { body })
  if (error) {
    let code = 'failed'
    let message = error.message
    const response = (error as { context?: Response }).context
    if (response && typeof response.json === 'function') {
      try {
        const detail = await response.json()
        code = detail.error ?? code
        message = detail.message ?? message
      } catch { /* not JSON */ }
    }
    throw new TakeError(code, TAKE_ERRORS[code] ?? `משהו השתבש: ${message}`)
  }
  return data as T
}

export async function keyStatus(): Promise<KeyStatus> {
  if (demoMode) return { ...demoKey }
  return callTakes<KeyStatus>({ action: 'status' })
}

export async function saveApiKey(key: string): Promise<void> {
  if (!supabase) {
    Object.assign(demoKey, { saved: true, hint: `…${key.trim().slice(-4)}`, set_by: 'Demo', set_at: new Date().toISOString(), characters_left: 100000 })
    return
  }
  const { error } = await supabase.rpc('voice_review_set_api_key', { p_key: key })
  if (error) throw new TakeError('save', error.message.includes('ElevenLabs') ? 'זה לא נראה כמו מפתח של ElevenLabs.' : error.message)
}

export async function loadTakes(): Promise<VoiceTake[]> {
  if (demoMode) return demoTakes.map((take) => ({ ...take }))
  if (!supabase) return []
  const { data, error } = await supabase.from('voice_review_takes').select(TAKE_COLUMNS).is('imported_at', null).neq('status', 'discarded')
  if (error) {
    if (isMissingSchema(error)) return []
    throw error
  }
  return (data ?? []) as VoiceTake[]
}

export async function loadVoices(): Promise<Map<string, VoiceSetup>> {
  const rows = demoMode
    ? [{ voice_key: 'Nemo the Netless', voice_name: 'EK - Nemo the Netless', fx: null, approved: true },
      { voice_key: 'Teacher Maya', voice_name: 'EK - Teacher Maya', fx: 'atempo=1.1', approved: true }]
    : await optionalRows<VoiceSetup>('voice_review_voices', 'voice_key,voice_name,fx,approved', 'voice_key')
  return new Map(rows.map((row) => [row.voice_key, row]))
}

/** A new take of the line in its character's voice. Costs ElevenLabs credits (about one per character). */
export async function makeTake(item: VoiceItem, text: string, creator: string): Promise<{ take: VoiceTake; characters_left: number | null }> {
  if (demoMode) {
    if (!demoKey.saved) throw new TakeError('no_key', TAKE_ERRORS.no_key)
    await new Promise((resolve) => setTimeout(resolve, 900))
    const take: VoiceTake = {
      id: crypto.randomUUID(), clip_path: item.clip_path, voice_key: item.voice_key ?? '', text, audio_path: `takes/demo/${Date.now()}.wav`,
      characters: text.length, status: 'new', creator_name: creator, created_at: new Date().toISOString(), chosen_by_name: '', imported_at: null,
    }
    demoTakes.push(take)
    demoKey.characters_left = (demoKey.characters_left ?? 0) - text.length
    return { take: { ...take }, characters_left: demoKey.characters_left }
  }
  return callTakes({ action: 'generate', clip_path: item.clip_path, text })
}

export async function setTakeStatus(take: VoiceTake, status: VoiceTake['status'], who: string): Promise<void> {
  if (!supabase) {
    for (const other of demoTakes) {
      if (other.id === take.id) Object.assign(other, { status, chosen_by_name: status === 'chosen' ? who : '' })
      else if (status === 'chosen' && other.clip_path === take.clip_path && other.status === 'chosen') other.status = 'new'
    }
    return
  }
  const { error } = await supabase.rpc('voice_review_set_take_status', { p_take: take.id, p_status: status })
  if (error) throw new TakeError('status', error.message)
}

export async function loadDecisions(): Promise<VoiceDecision[]> {
  if (demoMode) return [...demoDecisions.values()]
  return allRows<VoiceDecision>('voice_review_decisions', DECISION_COLUMNS)
}

export async function saveDecision(decision: VoiceDecision): Promise<void> {
  if (!supabase) {
    demoDecisions.set(decision.clip_path, decision)
    return
  }
  const { data } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('voice_review_decisions')
    .upsert({ ...decision, reviewed_by: data.user?.id ?? null }, { onConflict: 'clip_path' })
  if (error) throw error
}

const urlCache = new Map<string, { url: string; expires: number }>()

/** Playable URLs for bucket objects (signed for an hour, cached for 50 minutes). */
export async function audioUrls(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const now = Date.now()
  const missing: string[] = []
  for (const path of new Set(paths)) {
    const cached = urlCache.get(path)
    if (cached && cached.expires > now) result.set(path, cached.url)
    else missing.push(path)
  }
  if (missing.length === 0) return result
  if (!supabase) {
    for (const path of missing) {
      const url = demoToneUrl(path)
      urlCache.set(path, { url, expires: Number.MAX_SAFE_INTEGER })
      result.set(path, url)
    }
    return result
  }
  for (let start = 0; start < missing.length; start += 100) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(missing.slice(start, start + 100), 3600)
    if (error) throw error
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) {
        urlCache.set(entry.path, { url: entry.signedUrl, expires: now + 50 * 60 * 1000 })
        result.set(entry.path, entry.signedUrl)
      }
    }
  }
  return result
}

// ---------- Demo data (no Supabase keys, e.g. local `npm run dev`) ----------

// [group, section, speaker shown, speaker key, source, variant, text]
const demoLines: Array<[string, string, string, string, string, string, string]> = [
  ['articles_a_an', 'Quest 1 · start', 'Nemo', 'Nemo the Netless', 'dialogue', '', 'שלום חברים! אני נמו, ואיבדתי את הרשת שלי.'],
  ['articles_a_an', 'Quest 1 · start', 'Nemo', 'Nemo the Netless', 'dialogue', '', 'אתם יכולים לעזור לי למצוא a fish או an octopus?'],
  ['articles_a_an', 'Quest 1 · start', 'Nemo', 'Nemo the Netless', 'dialogue', 'girl', 'את יכולה לעזור לי למצוא a fish או an octopus?'],
  ['articles_a_an', 'Quest 1 · finish', 'Nemo', 'Nemo the Netless', 'dialogue', '', 'וואו, מצאתם! תודה רבה לכם!'],
  ['articles_a_an', 'Quest 2 · start', 'Teacher Maya', 'Teacher Maya', 'dialogue', '', 'היי לכם, בואו נבדוק מה למדתם היום.'],
  ['articles_a_an', 'Quest 2 · finish', 'Teacher Maya', 'Teacher Maya', 'dialogue', '', 'כל הכבוד! הנה פרס על ההשקעה.'],
  ['abc_valley', 'Cutscene · Intro1 Opening', 'סבא טוביאס', 'סבא טוביאס', 'cutscene', '', 'פעם, מזמן, האותיות לא היו אבן...'],
  ['abc_valley', 'Speech bubbles · Quest D', 'פיפ', 'פיפ', 'bubble', '', 'גרב?! איכס! ויש פתק: Go to the water.'],
  ['ambient', 'מיה האופה', 'מיה האופה', 'Mia the Baker', 'ambient', '', 'שלום! Hello! הלחם יצא עכשיו מהתנור, הוא עוד חם!'],
]

const demoItems: VoiceItem[] = demoLines.map(([group, section, speaker, key, source, variant, text], index) => ({
  // A girl version is <line>_girl.mp3 next to the line it replaces (the one before it here).
  clip_path: `Assets/_OurAssets/Art/Audio/Voice/Quests/demo/line_${variant === 'girl' ? `${index}_girl` : index + 1}.mp3`,
  source,
  variant,
  speaker_key: key,
  voice_key: key,
  group_key: group,
  section,
  position: index,
  speaker,
  voice_name: `EK - ${key}`,
  on_screen_text: text,
  tts_text: text,
  take_hash: `demo${index}`,
  audio_path: `${source}/demo/${index}.wav`,
  alternate_audio_path: index === 0 ? 'dialogue/demo/legacy.wav' : null,
}))

// Demo pictures are the catalog images the dev server already serves (/images/npcs/...).
const demoSpeakers: VoiceSpeaker[] = ([
  ['Nemo the Netless', 'Nemo the Netless', 'images/npcs/Fisherman.png'],
  ['Teacher Maya', "טיצ'ר (Teacher Maya)", 'images/npcs/teacher_maya.png'],
  ['סבא טוביאס', 'סבא טוביאס', 'images/npcs/grandpa_tobias.png'],
  ['פיפ', 'פיפ', 'images/npcs/pip_bellringer.png'],
  ['Mia the Baker', 'מיה האופה (Mia the Baker)', null],
] as Array<[string, string, string | null]>).map(([speaker_key, display_name, image_path]) => ({
  speaker_key, display_name, voice_name: `EK - ${speaker_key}`, brief: 'Warm, friendly, medium pace.', image_path,
}))

const demoGroups: VoiceGroup[] = [
  { group_key: 'abc_valley', title: 'עמק האותיות', sort_order: 0, speaker_key: 'סבא טוביאס' },
  { group_key: 'articles_a_an', title: 'A / An - a או an', sort_order: 1, speaker_key: 'Nemo the Netless' },
  { group_key: 'ambient', title: 'אנשי העיר (משפטים ברחוב)', sort_order: 2, speaker_key: 'Mia the Baker' },
]

const demoKey: KeyStatus = { saved: false, hint: '', set_by: '', set_at: null, characters_left: null }
const demoTakes: VoiceTake[] = []

const demoDecisions = new Map<string, VoiceDecision>([
  [demoItems[1].clip_path, {
    clip_path: demoItems[1].clip_path, status: 'rejected', tags: ['Pronunciation'], note: 'octopus נשמע כמו אוקטופוס בעברית',
    take_hash: 'older-take', speaker: demoItems[1].speaker, text: demoItems[1].tts_text,
    reviewed_at: new Date().toISOString(), reviewer_name: 'Unity',
  }],
  [demoItems[3].clip_path, {
    clip_path: demoItems[3].clip_path, status: 'rejected', tags: ['Too fast'], note: 'לדבר קצת יותר לאט',
    take_hash: 'demo3', speaker: demoItems[3].speaker, text: demoItems[3].tts_text,
    reviewed_at: new Date().toISOString(), reviewer_name: 'Demo',
  }],
])

/** A short tone so the player works without real clips. */
function demoToneUrl(path: string): string {
  const rate = 8000
  const seconds = 1.2
  const samples = Math.floor(rate * seconds)
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  write(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); write(8, 'WAVE'); write(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  write(36, 'data'); view.setUint32(40, samples * 2, true)
  const pitch = 300 + (path.length % 7) * 40
  for (let i = 0; i < samples; i += 1) {
    const envelope = Math.min(1, i / 400, (samples - i) / 400)
    view.setInt16(44 + i * 2, Math.sin((2 * Math.PI * pitch * i) / rate) * 9000 * envelope, true)
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}
