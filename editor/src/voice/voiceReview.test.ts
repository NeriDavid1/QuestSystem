import { describe, expect, it } from 'vitest'
import { buildDecision, groupTitle, matchesFilter, nextToReview, sectionsOf, stateOf, summarizeGroups, whisperHint, type VoiceDecision, type VoiceItem } from './voiceReview'

const item = (n: number, group = 'articles_a_an', section = 'Quest 1 · start'): VoiceItem => ({
  clip_path: `clip_${group}_${n}.mp3`, group_key: group, section, position: n, speaker: 'Nemo', voice_name: 'EK - Nemo',
  on_screen_text: `line ${n}`, tts_text: `line ${n}`, take_hash: `take${n}`, audio_path: `dialogue/x/take${n}.mp3`, alternate_audio_path: null,
})

const decided = (it: VoiceItem, status: VoiceDecision['status'], take = it.take_hash): VoiceDecision => ({
  clip_path: it.clip_path, status, tags: [], note: '', take_hash: take, speaker: it.speaker, text: it.tts_text,
  reviewed_at: '2026-09-30T12:00:00Z', reviewer_name: 'guide',
})

describe('voice review', () => {
  it('counts a decision only on the take it was made on', () => {
    const line = item(1)
    expect(stateOf(line, undefined)).toBe('toReview')
    expect(stateOf(line, decided(line, 'accepted'))).toBe('accepted')
    expect(stateOf(line, decided(line, 'rejected'))).toBe('rejected')
    expect(stateOf(line, decided(line, 'accepted', 'older'))).toBe('newTake')
    expect(stateOf(line, decided(line, 'pending'))).toBe('toReview')
  })

  it('finds the next line to review after the current one and wraps around', () => {
    const list = [item(0), item(1), item(2)]
    const decisions = new Map([[list[1].clip_path, decided(list[1], 'accepted')]])
    expect(nextToReview(list, decisions, list[0].clip_path)?.clip_path).toBe(list[2].clip_path)
    expect(nextToReview(list, decisions, list[2].clip_path)?.clip_path).toBe(list[0].clip_path)
    decisions.set(list[0].clip_path, decided(list[0], 'accepted'))
    decisions.set(list[2].clip_path, decided(list[2], 'rejected'))
    expect(nextToReview(list, decisions, list[0].clip_path)).toBeNull()
  })

  it('saves decisions in the review file shape; accepting clears the reasons and keeps the note', () => {
    const line = item(1)
    const rejected = buildDecision(line, 'rejected', undefined, { tags: ['Too fast'], note: 'slower' }, 'guide@x', new Date('2026-09-30T10:00:00Z'))
    expect(rejected).toMatchObject({ status: 'rejected', tags: ['Too fast'], note: 'slower', take_hash: 'take1', speaker: 'Nemo', text: 'line 1' })
    const accepted = buildDecision(line, 'accepted', rejected, {}, 'guide@x', new Date())
    expect(accepted.tags).toEqual([])
    expect(accepted.note).toBe('slower')
    // Reasons from an older take are not carried over to a new one.
    const newTake = { ...line, take_hash: 'take1b' }
    expect(buildDecision(newTake, 'rejected', rejected, {}, 'g', new Date()).tags).toEqual([])
  })

  it('summarizes groups with legacy groups last, and splits sections in order', () => {
    const items = [item(0, 'Legacy/Level1'), item(0, 'wh_questions'), item(1, 'wh_questions', 'Quest 1 · finish')]
    const decisions = new Map([[items[1].clip_path, decided(items[1], 'rejected')]])
    const groups = summarizeGroups(items, decisions)
    expect(groups.map((g) => g.key)).toEqual(['wh_questions', 'Legacy/Level1'])
    expect(groups[0]).toMatchObject({ total: 2, rejected: 1, toReview: 1 })
    expect(sectionsOf(items.slice(1)).map((s) => s.section)).toEqual(['Quest 1 · start', 'Quest 1 · finish'])
    expect(groupTitle('the_royal_impostor')).toBe('The royal impostor')
    expect(groupTitle('Legacy/Level1')).toBe('Legacy · Level1')
  })

  it('shows Whisper hints only for the take it checked, and filters lines that need attention', () => {
    const line = { ...item(1), asr_take_hash: 'take1', asr_level: 'check' as const, asr_text: 'לאבחן', asr_flags: ['words'], asr_missing: ['להבחן'], asr_extra: ['לאבחן'] }
    expect(whisperHint(line)?.messages[0]).toContain('להבחן')
    expect(matchesFilter('toReview', 'attention', line)).toBe(true)
    expect(matchesFilter('accepted', 'attention', line)).toBe(false)
    expect(whisperHint({ ...line, asr_take_hash: 'older' })).toBeNull()
    expect(whisperHint({ ...line, asr_level: 'ok' })).toBeNull()
    expect(whisperHint({ ...line, asr_flags: ['no_speech'], asr_missing: [], asr_extra: [] })?.messages).toEqual(['לא נשמע דיבור בהקלטה.'])
    expect(summarizeGroups([line, item(2)], new Map())[0]).toMatchObject({ toReview: 2, attention: 1 })
  })
})
