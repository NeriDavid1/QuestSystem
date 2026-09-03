import type { ReactNode } from 'react'
import { useT } from '../../i18n'

type MockParams = Record<string, unknown>

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function stableShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items]
  let state = hashSeed(seed || 'mock')
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const DISTRACTOR_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')

function buildLetterPool(targetWord: string, extraCount: number, custom: string[], seed: string): string[] {
  const letters = targetWord.toLowerCase().split('').filter(Boolean)
  const customs = custom.map((c) => c.toLowerCase()).filter((c) => c.length === 1)
  const pool = [...letters, ...customs]
  const needed = Math.max(0, extraCount - customs.length)
  const fillers = DISTRACTOR_LETTERS.filter((ch) => !letters.includes(ch))
  const picked = stableShuffle(fillers.length ? fillers : DISTRACTOR_LETTERS, `${seed}-fill`).slice(0, needed)
  pool.push(...picked)
  return stableShuffle(pool, seed)
}

function gapifyWord(fullWord: string, missingIndices: number[]): string {
  const chars = fullWord.split('')
  for (const idx of missingIndices) {
    if (idx >= 0 && idx < chars.length) chars[idx] = '_'
  }
  return chars.join('')
}

function ParchmentShell({
  children,
  closeClass = 'brown',
}: {
  children: ReactNode
  closeClass?: 'brown' | 'red'
}) {
  return (
    <div className="mg-mock-parchment" aria-hidden="true">
      <span className={`mg-mock-close ${closeClass}`}>×</span>
      {children}
    </div>
  )
}

function LetterOrderingMock({ params, prompt, seed }: { params: MockParams; prompt: string; seed: string }) {
  const targetWord = asString(params.targetWord) || asString(params.target) || 'word'
  const extra = asNumber(params.extraDistractorCount, 2)
  const custom = asStringArray(params.customDistractors)
  const pool = buildLetterPool(targetWord, extra, custom, seed)
  return (
    <ParchmentShell>
      <div className="mg-mock-prompt" dir="auto">{prompt || '…'}</div>
      <div className="mg-mock-slots">
        {Array.from({ length: Math.max(1, targetWord.length) }, (_, i) => (
          <span className="mg-mock-slot" key={i} />
        ))}
      </div>
      <div className="mg-mock-letter-pool">
        {pool.map((ch, i) => (
          <span className="mg-mock-letter-tile" key={`${ch}-${i}`}>{ch}</span>
        ))}
      </div>
    </ParchmentShell>
  )
}

function WordOrderingMock({ params, prompt, seed }: { params: MockParams; prompt: string; seed: string }) {
  const words = asStringArray(params.englishWordsInOrder)
  const preFilled = new Set(asNumberArray(params.preFilledIndices))
  const distractors = asStringArray(params.distractorWords)
  const bank = stableShuffle(
    [...words.filter((_, i) => !preFilled.has(i)), ...distractors],
    seed,
  )
  const slotCount = Math.max(words.length, 1)
  return (
    <ParchmentShell>
      <div className="mg-mock-prompt" dir="auto">{prompt || '…'}</div>
      <div className="mg-mock-slots mg-mock-word-slots">
        {Array.from({ length: slotCount }, (_, i) => {
          const filled = preFilled.has(i) && words[i]
          return (
            <span className={`mg-mock-slot mg-mock-word-slot ${filled ? 'filled' : ''}`} key={i}>
              {filled ? words[i].toUpperCase() : ''}
            </span>
          )
        })}
      </div>
      <div className="mg-mock-word-bank">
        {bank.map((word, i) => (
          <span className="mg-mock-word-chip" key={`${word}-${i}`}>{word.toUpperCase()}</span>
        ))}
      </div>
    </ParchmentShell>
  )
}

function WordMatchingMock({ params }: { params: MockParams }) {
  const lettersRaw = Array.isArray(params.letters) ? params.letters : []
  const tasksRaw = Array.isArray(params.wordTasks) ? params.wordTasks : []
  const letters = lettersRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const value = asString(row.value)
      const id = asString(row.id) || value
      return value ? { id, value } : null
    })
    .filter((item): item is { id: string; value: string } => Boolean(item))
  const tasks = tasksRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const fullWord = asString(row.fullWord)
      const id = asString(row.id) || fullWord
      const missing = asNumberArray(row.missingIndices)
      const image = asString(row.image)
      return fullWord ? { id, fullWord, missing, image } : null
    })
    .filter((item): item is { id: string; fullWord: string; missing: number[]; image: string } => Boolean(item))

  const sampleMatch = letters[0] && tasks[0]

  return (
    <div className="mg-mock-match-frame" aria-hidden="true">
      <span className="mg-mock-close red">×</span>
      <div className="mg-mock-match-body">
        <div className="mg-mock-match-left">
          {letters.map((letter) => (
            <span className="mg-mock-match-letter" key={letter.id}>{letter.value}</span>
          ))}
        </div>
        <div className="mg-mock-match-mid">
          {sampleMatch && <div className="mg-mock-match-line" />}
        </div>
        <div className="mg-mock-match-right">
          {tasks.map((task) => (
            <div className="mg-mock-match-card" key={task.id}>
              <span className="mg-mock-match-word">{gapifyWord(task.fullWord, task.missing)}</span>
              {task.image ? (
                <img className="mg-mock-match-icon" src={task.image} alt="" />
              ) : (
                <span className="mg-mock-match-icon-fallback" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpeakAloudMock({ params, prompt, speakLabel }: { params: MockParams; prompt: string; speakLabel: string }) {
  const targetWords = asStringArray(params.targetWords)
  const phrase = asString(params.targetPhrase) || targetWords[0] || '…'
  const hero = phrase
  const showChip = targetWords.length > 0 && targetWords[0].toLowerCase() !== phrase.toLowerCase()
  return (
    <ParchmentShell>
      <div className="mg-mock-speak-hero">{hero}</div>
      {showChip && <div className="mg-mock-speak-chip">{targetWords[0]}</div>}
      <div className="mg-mock-prompt mg-mock-speak-hint" dir="auto">{prompt || '…'}</div>
      <button type="button" className="mg-mock-speak-btn" disabled>{speakLabel}</button>
    </ParchmentShell>
  )
}

function LetterDrawingMock({ params, clearLabel, doneLabel }: { params: MockParams; clearLabel: string; doneLabel: string }) {
  const letter = asString(params.letter) || 'A'
  const preview = asString(params.previewImage)
  return (
    <ParchmentShell>
      <div className="mg-mock-draw-canvas">
        {preview ? (
          <img src={preview} alt={letter} className="mg-mock-draw-preview" />
        ) : (
          <span className="mg-mock-draw-letter">{letter.toUpperCase()}</span>
        )}
      </div>
      <div className="mg-mock-draw-actions">
        <button type="button" className="mg-mock-draw-btn" disabled>{clearLabel}</button>
        <button type="button" className="mg-mock-draw-btn primary" disabled>{doneLabel}</button>
      </div>
    </ParchmentShell>
  )
}

export function MinigameMock({
  minigameId,
  params,
  instruction,
  seed = 'mock',
}: {
  minigameId: string | null | undefined
  params: MockParams
  instruction?: string | null
  seed?: string
}) {
  const t = useT()
  const prompt = asString(params.prompt) || instruction || ''
  const id = minigameId || ''

  let body: ReactNode = null
  switch (id) {
    case 'letter_ordering':
      body = <LetterOrderingMock params={params} prompt={prompt} seed={seed} />
      break
    case 'word_ordering':
      body = <WordOrderingMock params={params} prompt={prompt} seed={seed} />
      break
    case 'word_matching':
      body = <WordMatchingMock params={params} />
      break
    case 'speak_aloud':
      body = <SpeakAloudMock params={params} prompt={prompt} speakLabel={t('mgMockSpeak')} />
      break
    case 'letter_drawing':
      body = <LetterDrawingMock params={params} clearLabel={t('mgMockClear')} doneLabel={t('mgMockDone')} />
      break
    default:
      body = (
        <ParchmentShell>
          <div className="mg-mock-prompt" dir="auto">{prompt || id || '…'}</div>
        </ParchmentShell>
      )
  }

  return (
    <div className="mg-mock">
      <small className="eyebrow mg-mock-badge">{t('mgMockPreviewOnly')}</small>
      <div className="mg-mock-board" dir="ltr">
        {body}
      </div>
    </div>
  )
}
