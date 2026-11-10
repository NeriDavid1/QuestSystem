import { hasSupabaseConfig, supabase } from '../lib/supabase'
import type { People, VoiceDecision, VoiceGroup, VoiceItem, VoiceSpeaker } from './voiceReview'

// Filled from the Unity project by scripts/voice_review_sync.py; see supabase/migrations/*_voice_review.sql.
const BUCKET = 'voice-review'
const ITEM_COLUMNS = 'clip_path,source,variant,speaker_key,group_key,section,position,speaker,voice_name,on_screen_text,tts_text,take_hash,audio_path,alternate_audio_path'
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
  try {
    return await allRows<VoiceItem>('voice_review_items', ITEM_COLUMNS)
  } catch (error) {
    if (!isMissingSchema(error)) throw error
    return allRows<VoiceItem>('voice_review_items', OLD_ITEM_COLUMNS)
  }
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
  clip_path: `Assets/_OurAssets/Art/Audio/Voice/Quests/demo/line_${index + 1}.mp3`,
  source,
  variant,
  speaker_key: key,
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
