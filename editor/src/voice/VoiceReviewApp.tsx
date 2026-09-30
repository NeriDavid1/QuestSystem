import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { signIn, signOut, signUp } from '../lib/persistence'
import { audioUrls, demoMode, loadDecisions, loadItems, saveDecision } from './voiceData'
import {
  REJECT_REASONS,
  buildDecision,
  groupTitle,
  itemsOfGroup,
  matchesFilter,
  nextToReview,
  reasonLabel,
  sectionsOf,
  stateOf,
  summarizeGroups,
  type Filter,
  type ItemState,
  type ReviewStatus,
  type VoiceDecision,
  type VoiceItem,
} from './voiceReview'

const STATE_TEXT: Record<ItemState, string> = {
  toReview: 'לבדיקה',
  newTake: 'הקלטה חדשה',
  accepted: 'מאושר',
  rejected: 'לא טוב',
}

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'toReview', label: 'לבדיקה' },
  { id: 'rejected', label: 'לא טובים' },
  { id: 'accepted', label: 'מאושרים' },
  { id: 'all', label: 'הכל' },
]

const GROUP_KEY = 'voiceReview.group'

function readStored(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeStored(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* private window */ }
}

export function VoiceReviewApp() {
  const [authReady, setAuthReady] = useState(demoMode)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    void client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!authReady) return <main className="vr-center"><span className="vr-spinner" />טוען…</main>
  if (!demoMode && !user) return <SignIn />
  return <Reviewer reviewerName={user?.email ?? 'Demo'} />
}

function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') await signUp(email, password)
      else await signIn(email, password)
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure)
      setError(message === 'confirm_email'
        ? 'החשבון נוצר. אשרו את המייל שקיבלתם ואז היכנסו.'
        : mode === 'signin' ? 'המייל או הסיסמה לא נכונים.' : message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="vr-center">
      <form className="vr-card vr-signin" onSubmit={submit}>
        <div className="vr-logo">🎧</div>
        <h1>בדיקת הקלטות</h1>
        <p>מקשיבים לכל משפט של הדמויות, ומסמנים אם הוא טוב או צריך תיקון.</p>
        <label>מייל<input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>סיסמה<input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
        {error && <p className="vr-error">{error}</p>}
        <button className="vr-button primary" disabled={busy}>{busy ? 'רגע…' : mode === 'signin' ? 'כניסה' : 'יצירת חשבון'}</button>
        <button type="button" className="vr-link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}>
          {mode === 'signin' ? 'אין לכם חשבון? יצירת חשבון' : 'כבר יש לכם חשבון? כניסה'}
        </button>
        <small>אותו חשבון כמו בעורך המשימות.</small>
      </form>
    </main>
  )
}

function Reviewer({ reviewerName }: { reviewerName: string }) {
  const [items, setItems] = useState<VoiceItem[] | null>(null)
  const [decisions, setDecisions] = useState<Map<string, VoiceDecision>>(new Map())
  const [loadError, setLoadError] = useState('')
  const [group, setGroup] = useState<string>(() => readStored(GROUP_KEY) ?? '')
  const [filter, setFilter] = useState<Filter>('toReview')
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showGroups, setShowGroups] = useState(false)

  const refreshDecisions = useCallback(async () => {
    const rows = await loadDecisions()
    setDecisions(new Map(rows.map((row) => [row.clip_path, row])))
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        if (supabase) await supabase.rpc('ensure_workspace_member', { p_display_name: null })
        const [loaded] = await Promise.all([loadItems(), refreshDecisions()])
        setItems(loaded)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : String(error))
      }
    })()
    // Other guides review at the same time: pick up their decisions when the tab comes back.
    const onFocus = () => { void refreshDecisions().catch(() => undefined) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshDecisions])

  const groups = useMemo(() => summarizeGroups(items ?? [], decisions), [items, decisions])
  const activeGroup = groups.some((g) => g.key === group) ? group : groups.find((g) => g.toReview > 0)?.key ?? groups[0]?.key ?? ''
  const groupItems = useMemo(() => itemsOfGroup(items ?? [], activeGroup), [items, activeGroup])
  const visible = useMemo(
    () => groupItems.filter((item) => matchesFilter(stateOf(item, decisions.get(item.clip_path)), filter) || item.clip_path === selected),
    [groupItems, decisions, filter, selected],
  )
  const current = groupItems.find((item) => item.clip_path === selected) ?? visible[0] ?? null
  const summary = groups.find((g) => g.key === activeGroup)

  const chooseGroup = (key: string) => {
    setGroup(key)
    writeStored(GROUP_KEY, key)
    setSelected(null)
    setShowGroups(false)
  }

  const decide = useCallback(async (item: VoiceItem, status: ReviewStatus, change: { tags?: string[]; note?: string } = {}) => {
    const decision = buildDecision(item, status, decisions.get(item.clip_path), change, reviewerName, new Date())
    setDecisions((before) => new Map(before).set(item.clip_path, decision))
    setSaving(true)
    setSaveError('')
    try {
      await saveDecision(decision)
    } catch (error) {
      setSaveError(`לא נשמר: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSaving(false)
    }
  }, [decisions, reviewerName])

  const goNext = useCallback(() => {
    const next = nextToReview(groupItems, decisions, current?.clip_path ?? null)
    if (next) setSelected(next.clip_path)
    return next
  }, [groupItems, decisions, current])

  if (loadError) {
    return <main className="vr-center"><div className="vr-card"><h1>משהו השתבש</h1><p className="vr-error">{loadError}</p>
      <button className="vr-button" onClick={() => window.location.reload()}>לנסות שוב</button></div></main>
  }
  if (!items) return <main className="vr-center"><span className="vr-spinner" />טוען את ההקלטות…</main>
  if (items.length === 0) {
    return <main className="vr-center"><div className="vr-card"><h1>אין עדיין הקלטות לבדיקה</h1>
      <p>ההקלטות מגיעות מ-Unity. מי שמכין אותן צריך להריץ את הסנכרון (scripts/voice_review_sync.py).</p></div></main>
  }

  const totals = groups.reduce((sum, g) => ({ total: sum.total + g.total, done: sum.done + g.accepted + g.rejected }), { total: 0, done: 0 })

  return (
    <div className="vr-app">
      <header className="vr-top">
        <button className="vr-groups-toggle" onClick={() => setShowGroups(!showGroups)} aria-expanded={showGroups}>☰</button>
        <div className="vr-title"><span className="vr-logo small">🎧</span><div><strong>בדיקת הקלטות</strong>
          <small>{totals.done} מתוך {totals.total} נבדקו</small></div></div>
        <span className="vr-save-state" aria-live="polite">{saveError ? <span className="vr-error">{saveError}</span> : saving ? 'שומר…' : 'הכל נשמר ✓'}</span>
        <div className="vr-top-actions">
          {demoMode && <span className="vr-chip">מצב הדגמה</span>}
          <a className="vr-link" href="./">לעורך המשימות</a>
          {!demoMode && <button className="vr-link" onClick={() => void signOut()}>יציאה</button>}
        </div>
      </header>

      <div className="vr-body">
        <nav className={`vr-groups${showGroups ? ' open' : ''}`} aria-label="קווי משימות">
          <p className="vr-eyebrow">קווי משימות</p>
          {groups.map((g) => (
            <button key={g.key} className={g.key === activeGroup ? 'active' : ''} onClick={() => chooseGroup(g.key)}>
              <span className="vr-group-name" dir="ltr">{groupTitle(g.key)}</span>
              <span className="vr-group-count">{g.toReview > 0 ? `${g.toReview} לבדיקה` : '✓'}</span>
              <Progress accepted={g.accepted} rejected={g.rejected} total={g.total} />
            </button>
          ))}
        </nav>

        <section className="vr-list">
          <div className="vr-list-head">
            <h2 dir="ltr">{groupTitle(activeGroup)}</h2>
            {summary && <Progress accepted={summary.accepted} rejected={summary.rejected} total={summary.total} />}
            <div className="vr-filters" role="tablist">
              {FILTERS.map((f) => {
                const count = groupItems.filter((item) => matchesFilter(stateOf(item, decisions.get(item.clip_path)), f.id)).length
                return <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'active' : ''}
                  onClick={() => setFilter(f.id)}>{f.label} <b>{count}</b></button>
              })}
            </div>
          </div>
          <div className="vr-rows">
            {visible.length === 0 && <p className="vr-empty">{filter === 'toReview' ? 'סיימתם את קו המשימות הזה! 🎉' : 'אין משפטים כאן.'}</p>}
            {sectionsOf(visible).map(({ section, items: rows }) => (
              <div key={section}>
                <p className="vr-section" dir="ltr">{section}</p>
                {rows.map((item) => {
                  const state = stateOf(item, decisions.get(item.clip_path))
                  return (
                    <button key={item.clip_path} className={`vr-row ${state}${item.clip_path === current?.clip_path ? ' selected' : ''}`}
                      onClick={() => setSelected(item.clip_path)}>
                      <span className={`vr-dot ${state}`} aria-label={STATE_TEXT[state]} />
                      <span className="vr-row-text"><strong>{item.speaker}</strong><span dir="auto">{item.on_screen_text}</span></span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {current
          ? <LineCard key={current.clip_path} item={current} decision={decisions.get(current.clip_path)} onDecide={decide} onNext={goNext} />
          : <section className="vr-detail vr-empty">בחרו משפט מהרשימה.</section>}
      </div>
    </div>
  )
}

function Progress({ accepted, rejected, total }: { accepted: number; rejected: number; total: number }) {
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`
  return (
    <span className="vr-progress" role="img" aria-label={`${accepted} מאושרים, ${rejected} לא טובים, מתוך ${total}`}>
      <i className="accepted" style={{ width: pct(accepted) }} /><i className="rejected" style={{ width: pct(rejected) }} />
    </span>
  )
}

function LineCard({ item, decision, onDecide, onNext }: {
  item: VoiceItem
  decision: VoiceDecision | undefined
  onDecide: (item: VoiceItem, status: ReviewStatus, change?: { tags?: string[]; note?: string }) => Promise<void>
  onNext: () => VoiceItem | null
}) {
  const state = stateOf(item, decision)
  const onThisTake = decision?.take_hash === item.take_hash
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [useLegacy, setUseLegacy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [note, setNote] = useState(onThisTake ? decision?.note ?? '' : '')
  const [tags, setTags] = useState<string[]>(onThisTake ? decision?.tags ?? [] : [])
  const audio = useRef<HTMLAudioElement>(null)
  const noteBox = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const paths = [item.audio_path, item.alternate_audio_path].filter((p): p is string => Boolean(p))
    void audioUrls(paths).then(setUrls).catch((error) => setAudioError(error instanceof Error ? error.message : String(error)))
  }, [item])

  const src = urls.get(useLegacy && item.alternate_audio_path ? item.alternate_audio_path : item.audio_path)

  // A new line starts playing by itself, so the guide only has to listen and decide.
  useEffect(() => {
    if (src && audio.current && !useLegacy) void audio.current.play().catch(() => undefined)
  }, [src, useLegacy])

  const toggle = useCallback(() => {
    const player = audio.current
    if (!player) return
    if (player.paused) { if (player.ended) player.currentTime = 0; void player.play().catch(() => undefined) } else player.pause()
  }, [])

  const accept = useCallback(async () => {
    await onDecide(item, 'accepted', { note })
    onNext()
  }, [item, note, onDecide, onNext])

  const reject = useCallback(async () => {
    await onDecide(item, 'rejected', { tags, note })
    noteBox.current?.focus()
  }, [item, tags, note, onDecide])

  const undo = useCallback(() => onDecide(item, 'pending', { tags: [], note }), [item, note, onDecide])

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    setTags(next)
    void onDecide(item, 'rejected', { tags: next, note })
  }

  const saveNote = () => {
    if (onThisTake && decision && note !== decision.note) void onDecide(item, decision.status, { tags, note })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.ctrlKey || event.metaKey || event.altKey || target.closest('input, textarea, select')) return
      // event.code is the physical key, so the shortcuts also work on a Hebrew keyboard layout.
      if (event.code === 'Space') { event.preventDefault(); toggle() }
      else if (event.code === 'KeyA') void accept()
      else if (event.code === 'KeyR') { event.preventDefault(); void reject() }
      else if (event.code === 'KeyN') onNext()
      else if (event.code === 'KeyU') void undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, accept, reject, undo, onNext])

  const showReasons = state === 'rejected'
  return (
    <section className="vr-detail">
      <div className="vr-card vr-line">
        <div className="vr-line-head">
          <div><strong className="vr-speaker">{item.speaker}</strong><small dir="ltr">{item.voice_name}</small></div>
          <span className={`vr-badge ${state}`}>{STATE_TEXT[state]}</span>
        </div>
        {state === 'newTake' && <p className="vr-hint">יש הקלטה חדשה למשפט הזה מאז הבדיקה הקודמת. הקשיבו שוב.</p>}
        <p className="vr-script" dir="auto">{item.on_screen_text}</p>
        {item.tts_text && item.tts_text !== item.on_screen_text.replace(/\n/g, ' ').trim() && (
          <p className="vr-tts"><span>מה שנשלח להקלטה:</span> <span dir="auto">{item.tts_text}</span></p>
        )}

        <div className="vr-player">
          <button className="vr-play" onClick={toggle} aria-label={playing ? 'עצירה' : 'ניגון'} disabled={!src}>{playing ? '❚❚' : '▶'}</button>
          <audio ref={audio} src={src} controls preload="auto"
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
            onError={() => src && setAudioError('לא הצלחנו לנגן את ההקלטה.')} />
        </div>
        {audioError && <p className="vr-error">{audioError}</p>}
        {item.alternate_audio_path && (
          <div className="vr-compare" role="radiogroup" aria-label="איזו הקלטה">
            <button className={!useLegacy ? 'active' : ''} onClick={() => setUseLegacy(false)} aria-pressed={!useLegacy}>הקלטה חדשה</button>
            <button className={useLegacy ? 'active' : ''} onClick={() => setUseLegacy(true)} aria-pressed={useLegacy}>הקלטה ישנה</button>
          </div>
        )}

        <div className="vr-decide">
          <button className={`vr-button accept${state === 'accepted' ? ' on' : ''}`} onClick={() => void accept()}>✔ טוב <kbd>A</kbd></button>
          <button className={`vr-button reject${state === 'rejected' ? ' on' : ''}`} onClick={() => void reject()}>✘ לא טוב <kbd>R</kbd></button>
        </div>

        {showReasons && (
          <div className="vr-reasons">
            <p>מה לא טוב? (אפשר לבחור כמה)</p>
            <div className="vr-tags">
              {REJECT_REASONS.map((reason) => (
                <button key={reason.tag} className={tags.includes(reason.tag) ? 'on' : ''} aria-pressed={tags.includes(reason.tag)}
                  onClick={() => toggleTag(reason.tag)}>{reason.label}</button>
              ))}
            </div>
          </div>
        )}
        <label className="vr-note">
          {showReasons ? 'איזו מילה לא טובה, ואיך היא צריכה להישמע?' : 'הערה (לא חובה)'}
          <textarea ref={noteBox} dir="auto" rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote}
            placeholder={showReasons ? 'למשל: "להיבחן" ולא "לאבחן"' : ''} />
        </label>

        <div className="vr-foot">
          <button className="vr-button" onClick={() => onNext()}>למשפט הבא <kbd>N</kbd></button>
          {decision && decision.status !== 'pending' && onThisTake && (
            <>
              <button className="vr-link" onClick={() => void undo()}>ביטול הסימון <kbd>U</kbd></button>
              <small>{decision.reviewer_name ? `סומן על ידי ${decision.reviewer_name}` : ''}</small>
            </>
          )}
        </div>
        {decision && decision.status !== 'pending' && decision.tags.length > 0 && !showReasons && onThisTake && (
          <p className="vr-hint">{decision.tags.map(reasonLabel).join(' · ')}</p>
        )}
      </div>
      <p className="vr-keys">קיצורים: רווח = ניגון · A = טוב · R = לא טוב · N = הבא · U = ביטול</p>
    </section>
  )
}
