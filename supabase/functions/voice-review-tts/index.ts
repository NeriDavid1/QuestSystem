// Voice Review: make a new take of a voice line with the character's own ElevenLabs voice.
//
// POST { action: "status" }                       -> is a key saved, its last four characters, credits left
// POST { action: "generate", clip_path, text }    -> a new take (row of voice_review_takes) for that line
//
// The caller must be a quest editor (checked through row-level security on voice_review_items). The voice,
// model and settings come from voice_review_voices (voice_cast.json, synced by scripts/voice_review_sync.py),
// so the request is the one Unity's generators would send. The key is read from Vault and never returned.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const ELEVENLABS = 'https://api.elevenlabs.io'
const BUCKET = 'voice-review'
const MAX_TEXT = 1000
const MAX_TAKES_PER_MINUTE = 10

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function fail(error: string, message: string, status = 400): Response {
  return reply({ error, message }, status)
}

async function pathId(clipPath: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(clipPath))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

async function creditsLeft(key: string): Promise<number | null> {
  try {
    const response = await fetch(`${ELEVENLABS}/v1/user/subscription`, { headers: { 'xi-api-key': key } })
    if (!response.ok) return null
    const data = await response.json()
    return Math.max(0, (data.character_limit ?? 0) - (data.character_count ?? 0))
  } catch {
    return null
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return fail('method', 'POST only', 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const authorization = request.headers.get('Authorization') ?? ''
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: { user } } = await asUser.auth.getUser()
  if (!user) return fail('not_signed_in', 'Sign in first.', 401)

  let body: { action?: string; clip_path?: string; text?: string }
  try {
    body = await request.json()
  } catch {
    return fail('bad_request', 'Expected JSON.')
  }

  // Editors only: row-level security hides the settings row from anyone else.
  const { data: settings, error: settingsError } = await asUser.from('voice_review_settings').select('api_key_hint,api_key_set_by,api_key_set_at').maybeSingle()
  if (settingsError) return fail('not_allowed', settingsError.message, 403)

  const { data: key } = await admin.rpc('voice_review_api_key')

  if (body.action === 'status') {
    return reply({
      saved: Boolean(key),
      hint: settings?.api_key_hint ?? '',
      set_by: settings?.api_key_set_by ?? '',
      set_at: settings?.api_key_set_at ?? null,
      characters_left: key ? await creditsLeft(key as string) : null,
    })
  }

  if (body.action !== 'generate') return fail('bad_request', 'Unknown action.')
  if (!key) return fail('no_key', 'No ElevenLabs key is saved yet.', 409)

  const clipPath = body.clip_path ?? ''
  const text = (body.text ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return fail('empty_text', 'There is no text to say.')
  if (text.length > MAX_TEXT) return fail('too_long', `The text is longer than ${MAX_TEXT} characters.`)

  const { data: item } = await asUser.from('voice_review_items').select('clip_path,voice_key,source').eq('clip_path', clipPath).maybeSingle()
  if (!item) return fail('not_allowed', 'This line is not in the review list, or you are not an editor.', 403)

  const { data: voice } = await admin.from('voice_review_voices').select('voice_key,request,approved').eq('voice_key', item.voice_key).maybeSingle()
  if (!voice || !voice.approved || !voice.request?.voice_id) {
    return fail('no_voice', `The character's voice (${item.voice_key || 'unknown'}) is not set up in voice_cast.json yet.`, 409)
  }

  const since = new Date(Date.now() - 60_000).toISOString()
  const { count } = await admin.from('voice_review_takes').select('id', { count: 'exact', head: true })
    .eq('created_by', user.id).gte('created_at', since)
  if ((count ?? 0) >= MAX_TAKES_PER_MINUTE) return fail('slow_down', 'Too many takes in a minute. Wait a moment.', 429)

  // Same request as Unity's generate_dialogue_voices.tts().
  const req = { ...voice.request, text }
  const payload: Record<string, unknown> = { text, model_id: req.model_id, voice_settings: req.voice_settings }
  if (req.language_code) payload.language_code = req.language_code
  if (req.seed !== null && req.seed !== undefined) payload.seed = req.seed
  if (req.pronunciation_dictionaries?.length) payload.pronunciation_dictionary_locators = req.pronunciation_dictionaries

  const response = await fetch(
    `${ELEVENLABS}/v1/text-to-speech/${encodeURIComponent(req.voice_id)}?output_format=${encodeURIComponent(req.output_format ?? 'mp3_44100_128')}`,
    { method: 'POST', headers: { 'xi-api-key': key as string, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(payload) },
  )
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400)
    const quota = /quota|credits|character_limit/i.test(detail)
    if (response.status === 401 && !quota) return fail('bad_key', `ElevenLabs refused the key: ${detail}`, 502)
    if (quota) return fail('no_credits', `ElevenLabs: not enough credits. ${detail}`, 502)
    return fail('elevenlabs', `ElevenLabs error ${response.status}: ${detail}`, 502)
  }
  const audio = new Uint8Array(await response.arrayBuffer())

  const id = crypto.randomUUID()
  const audioPath = `takes/${await pathId(clipPath)}/${id}.mp3`
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(audioPath, audio, { contentType: 'audio/mpeg', upsert: false })
  if (uploadError) return fail('storage', uploadError.message, 500)

  const { data: take, error: insertError } = await admin.from('voice_review_takes').insert({
    id,
    clip_path: clipPath,
    voice_key: item.voice_key,
    text,
    request: req,
    audio_path: audioPath,
    characters: text.length,
    created_by: user.id,
    creator_name: user.email ?? '',
  }).select().single()
  if (insertError) return fail('database', insertError.message, 500)

  return reply({ take, characters_left: await creditsLeft(key as string) })
})
