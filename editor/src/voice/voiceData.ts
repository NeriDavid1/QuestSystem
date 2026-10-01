import { hasSupabaseConfig, supabase } from '../lib/supabase'
import type { VoiceDecision, VoiceItem } from './voiceReview'

// Filled from the Unity project by scripts/voice_review_sync.py; see supabase/migrations/*_voice_review.sql.
const BUCKET = 'voice-review'
const ITEM_COLUMNS = 'clip_path,group_key,section,position,speaker,voice_name,on_screen_text,tts_text,take_hash,audio_path,alternate_audio_path'
const ASR_COLUMNS = 'asr_take_hash,asr_text,asr_score,asr_level,asr_flags,asr_missing,asr_extra'
const DECISION_COLUMNS = 'clip_path,status,tags,note,take_hash,speaker,text,reviewed_at,reviewer_name'

export const demoMode = !hasSupabaseConfig

async function allRows<T>(table: string, columns: string): Promise<T[]> {
  if (!supabase) return []
  const rows: T[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).order('clip_path').range(offset, offset + pageSize - 1)
    if (error) throw error
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

export async function loadItems(): Promise<VoiceItem[]> {
  if (demoMode) return demoItems
  try {
    return await allRows<VoiceItem>('voice_review_items', `${ITEM_COLUMNS},${ASR_COLUMNS}`)
  } catch (error) {
    // Before the Whisper migration is applied the page still works, without hints.
    if (!isMissingColumn(error)) throw error
    return allRows<VoiceItem>('voice_review_items', ITEM_COLUMNS)
  }
}

function isMissingColumn(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''
  return code === '42703' || code === 'PGRST204'
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

const demoItems: VoiceItem[] = [
  ['Quest 1 · start', 'Nemo', 'EK - Nemo the Netless', 'שלום חברים! אני נמו, ואיבדתי את הרשת שלי.'],
  ['Quest 1 · start', 'Nemo', 'EK - Nemo the Netless', 'אתם יכולים לעזור לי למצוא a fish או an octopus?'],
  ['Quest 1 · finish', 'Nemo', 'EK - Nemo the Netless', 'וואו, מצאתם! תודה רבה לכם!'],
  ['Quest 2 · start', 'Teacher Maya', 'EK - Maya', 'היי לכם, בואו נבדוק מה למדתם היום.'],
  ['Quest 2 · finish', 'Teacher Maya', 'EK - Maya', 'כל הכבוד! הנה פרס על ההשקעה.'],
].map(([section, speaker, voice, text], index) => ({
  clip_path: `Assets/_OurAssets/Art/Audio/Voice/Quests/demo/line_${index + 1}.mp3`,
  group_key: 'articles_a_an',
  section,
  position: index,
  speaker,
  voice_name: voice,
  on_screen_text: text,
  tts_text: text,
  take_hash: `demo${index}`,
  audio_path: `dialogue/demo/${index}.wav`,
  alternate_audio_path: index === 0 ? 'dialogue/demo/legacy.wav' : null,
  ...(index === 1 ? {
    asr_take_hash: `demo${index}`, asr_level: 'check' as const, asr_score: 0.78, asr_flags: ['words'],
    asr_text: 'אתם יכולים לעזור לי למצוא a fish or an octopus', asr_missing: ['או'], asr_extra: [],
  } : {}),
}))

const demoDecisions = new Map<string, VoiceDecision>([
  [demoItems[2].clip_path, {
    clip_path: demoItems[2].clip_path, status: 'rejected', tags: ['Too fast'], note: 'לדבר קצת יותר לאט',
    take_hash: 'demo2', speaker: demoItems[2].speaker, text: demoItems[2].tts_text,
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
