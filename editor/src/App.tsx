import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from 'react'
import { catalogImageUrl } from './lib/catalogImages'
import { createDemoData } from './lib/demoData'
import { hasSupabaseConfig, loadEditorData, supabase } from './lib/supabase'
import { useLocale, useT } from './i18n'
import type {
  CatalogEntry,
  CatalogKind,
  Dialogue,
  DialogueLine,
  EditorData,
  Quest,
  QuestPrerequisite,
  QuestReward,
  QuestStep,
  Questline,
  QuestlineRevision,
  StepField,
  StepTypeDefinition,
  ValidationIssue,
} from './lib/types'
import { emptyEditorData } from './lib/types'

type View = 'overview' | 'editor' | 'library' | 'preview' | 'settings'
type LibraryTab = 'catalog' | 'dialogues' | 'minigames'

function getNavItems(t: ReturnType<typeof useT>): Array<{ id: View; label: string; icon: string }> {
  return [
    { id: 'overview', label: t('navOverview'), icon: 'grid' },
    { id: 'editor', label: t('navEditor'), icon: 'spark' },
    { id: 'library', label: t('navLibrary'), icon: 'book' },
    { id: 'preview', label: t('navPreview'), icon: 'eye' },
  ]
}

function getCatalogKindLabels(t: ReturnType<typeof useT>): Record<CatalogKind, string> {
  return {
    area: t('catalogAreas'),
    npc: t('catalogNpcs'),
    interactable: t('catalogStations'),
    item: t('catalogItems'),
    minigame: t('catalogMinigames'),
  }
}

function getCatalogKindSingular(t: ReturnType<typeof useT>, kind: CatalogKind): string {
  return {
    area: t('catalogArea'),
    npc: t('catalogNpc'),
    interactable: t('catalogStation'),
    item: t('catalogItem'),
    minigame: t('catalogMinigame'),
  }[kind]
}

function getCatalogStatusLabel(t: ReturnType<typeof useT>, status: string): string {
  if (status === 'live_used') return t('liveUsed')
  if (status === 'catalog_stub' || status === 'catalog') return t('catalogStub')
  return status.replace('_', ' ')
}

function getStatusLabel(t: ReturnType<typeof useT>, status: string): string {
  if (status === 'draft') return t('statusDraft')
  if (status === 'published') return t('statusPublished')
  if (status === 'complete') return t('statusComplete')
  return status.replace('_', ' ')
}

const catalogKindIcons: Record<CatalogKind, string> = {
  area: '⌖',
  npc: '♙',
  interactable: '▣',
  item: '✦',
  minigame: '⌘',
}

function makeLocalId(prefix: string): string {
  return `local-${prefix}-${crypto.randomUUID()}`
}

function isLocalId(id: string): boolean {
  return id.startsWith('local-')
}

function slugify(value: string): string {
  const ascii = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return ascii || `line_${Date.now().toString(36)}`
}

const DEFAULT_DIALOGUE_LOCALE = 'he'

function uniqueDialogueKey(data: EditorData, baseKey: string): string {
  const normalized = slugify(baseKey) || 'new_dialogue'
  if (!data.dialogues.some((dialogue) => dialogue.key === normalized)) return normalized
  let suffix = 2
  while (data.dialogues.some((dialogue) => dialogue.key === `${normalized}_${suffix}`)) suffix += 1
  return `${normalized}_${suffix}`
}

function getDialogueLines(data: EditorData, dialogueId: string): DialogueLine[] {
  return data.dialogueLines
    .filter((line) => line.dialogue_id === dialogueId)
    .sort((a, b) => a.line_order - b.line_order || a.locale.localeCompare(b.locale))
}

function stepHasDialogueField(data: EditorData, step: QuestStep): boolean {
  return Boolean(getStepType(data, step.step_type)?.fields.some((field) => field.ref?.includes('dialogues')))
}

function getQuestlineQuests(data: EditorData, questlineId: string): Quest[] {
  return data.quests
    .filter((quest) => quest.questline_id === questlineId)
    .sort((a, b) => a.position - b.position)
}

function getQuestSteps(data: EditorData, questId: string): QuestStep[] {
  return data.steps
    .filter((step) => step.quest_id === questId)
    .sort((a, b) => a.position - b.position)
}

function getQuestRewards(data: EditorData, questId: string): QuestReward[] {
  return data.rewards.filter((reward) => reward.scope === 'quest' && reward.quest_id === questId)
}

function getStepRewards(data: EditorData, stepId: string): QuestReward[] {
  return data.rewards.filter((reward) => reward.scope === 'step' && reward.step_id === stepId)
}

function getQuestPrerequisites(data: EditorData, questId: string): QuestPrerequisite[] {
  return data.prerequisites.filter((edge) => edge.quest_id === questId)
}

function getStepType(data: EditorData, stepType: string): StepTypeDefinition | undefined {
  return data.stepTypes.find((definition) => definition.id === stepType)
}

function getCatalogKindForRef(ref: string | undefined): CatalogKind | null {
  if (!ref) return null
  if (ref.includes('npcs')) return 'npc'
  if (ref.includes('areas')) return 'area'
  if (ref.includes('interactables')) return 'interactable'
  if (ref.includes('items')) return 'item'
  if (ref.includes('minigames')) return 'minigame'
  return null
}

function buildSnapshotDocument(data: EditorData, line: Questline): Record<string, unknown> {
  const quests = getQuestlineQuests(data, line.id).map((quest) => {
    const prerequisites = data.prerequisites
      .filter((edge) => edge.quest_id === quest.id)
      .map((edge) => data.quests.find((candidate) => candidate.id === edge.prerequisite_quest_id)?.key)
      .filter((key): key is string => Boolean(key))

    const rewards = getQuestRewards(data, quest.id).map((reward) => ({
      amount: reward.amount,
      item_external_id: reward.item_external_id,
      reward_type: reward.reward_type,
      scope: reward.scope,
      source_metadata: reward.source_metadata,
      step_key: null,
      xp_amount: reward.xp_amount,
    }))

    const steps = getQuestSteps(data, quest.id).map((step) => ({
      key: step.key,
      payload: step.payload,
      position: step.position,
      rewards: getStepRewards(data, step.id).map((reward) => ({
        amount: reward.amount,
        item_external_id: reward.item_external_id,
        reward_type: reward.reward_type,
        scope: reward.scope,
        source_metadata: reward.source_metadata,
        step_key: step.key,
        xp_amount: reward.xp_amount,
      })),
      source_metadata: step.source_metadata,
      type: step.step_type,
    }))

    return {
      giver_external_id: quest.giver_external_id,
      key: quest.key,
      level_required: quest.level_required,
      name: quest.name,
      position: quest.position,
      prerequisites,
      rewards,
      source_metadata: quest.source_metadata,
      source_path: quest.source_path,
      status: quest.status,
      steps,
      summary: quest.summary,
    }
  })

  return {
    default_giver_external_id: line.default_giver_external_id,
    display_name: line.display_name,
    key: line.key,
    quests,
    theme: line.theme,
  }
}

function validateQuestline(
  data: EditorData,
  line: Questline | undefined,
  t: ReturnType<typeof useT>,
): ValidationIssue[] {
  if (!line) {
    return [{ severity: 'error', code: 'missing_line', message: t('validationSelectLine') }]
  }

  const issues: ValidationIssue[] = []
  const quests = getQuestlineQuests(data, line.id)
  const keys = new Set<string>()

  if (quests.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty_questline',
      message: t('validationEmptyLine'),
      entityId: line.id,
    })
  }

  for (const quest of quests) {
    if (keys.has(quest.key)) {
      issues.push({
        severity: 'error',
        code: 'duplicate_quest_key',
        message: t('validationDuplicateKey', { key: quest.key }),
        entityId: quest.id,
      })
    }
    keys.add(quest.key)

    if (!quest.name.trim()) {
      issues.push({
        severity: 'error',
        code: 'missing_quest_name',
        message: t('validationMissingName'),
        entityId: quest.id,
      })
    }
    if (!quest.giver_external_id) {
      issues.push({
        severity: 'warning',
        code: 'missing_giver',
        message: t('validationMissingGiver', { name: quest.name || t('untitledQuest') }),
        entityId: quest.id,
      })
    }

    const steps = getQuestSteps(data, quest.id)
    if (steps.length === 0) {
      issues.push({
        severity: 'error',
        code: 'empty_quest',
        message: t('validationNoSteps', { name: quest.name || t('untitledQuest') }),
        entityId: quest.id,
      })
    }

    for (const step of steps) {
      const type = getStepType(data, step.step_type)
      if (!type) {
        issues.push({
          severity: 'error',
          code: 'unknown_step_type',
          message: t('validationUnknownStep', { key: step.key }),
          entityId: step.id,
        })
        continue
      }

      for (const field of type.fields) {
        const value = step.payload[field.name]
        if (field.required && (value === undefined || value === null || value === '')) {
          issues.push({
            severity: 'error',
            code: 'missing_step_field',
            message: t('validationMissingField', { field: field.name, type: type.id }),
            entityId: step.id,
          })
        }

        const kind = getCatalogKindForRef(field.ref)
        if (kind && value) {
          const found = data.catalog.some(
            (entry) => entry.kind === kind && entry.external_id === String(value),
          )
          if (!found) {
            issues.push({
              severity: 'warning',
              code: 'unresolved_reference',
              message: t('validationUnresolvedRef', { value: String(value), kind: getCatalogKindSingular(t, kind) }),
              entityId: step.id,
            })
          }
        }

        if (field.ref?.includes('dialogues') && value) {
          const found = data.dialogues.some((dialogue) => dialogue.key === String(value))
          if (!found) {
            issues.push({
              severity: 'warning',
              code: 'unresolved_dialogue',
              message: t('validationUnresolvedDialogue', { value: String(value) }),
              entityId: step.id,
            })
          }
        }
      }
    }
  }

  const questIds = new Set(quests.map((item) => item.id))
  const stepIds = new Set(data.steps.filter((step) => questIds.has(step.quest_id)).map((step) => step.id))
  for (const reward of data.rewards.filter((item) =>
    (item.scope === 'quest' && item.quest_id !== null && questIds.has(item.quest_id))
    || (item.scope === 'step' && item.step_id !== null && stepIds.has(item.step_id)),
  )) {
    if (reward.reward_type === 'xp' && (reward.xp_amount === null || reward.xp_amount < 0)) {
      issues.push({
        severity: 'error',
        code: 'invalid_xp_reward',
        message: t('validationInvalidXp'),
        entityId: reward.id,
      })
    }
    if (reward.reward_type === 'item' && (!reward.item_external_id || !reward.amount || reward.amount < 1)) {
      issues.push({
        severity: 'error',
        code: 'invalid_item_reward',
        message: t('validationInvalidItem'),
        entityId: reward.id,
      })
    }
  }

  const byId = new Map(quests.map((quest) => [quest.id, quest]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (questId: string): boolean => {
    if (visiting.has(questId)) return true
    if (visited.has(questId)) return false
    visiting.add(questId)
    const hasCycle = data.prerequisites
      .filter((edge) => edge.quest_id === questId)
      .some((edge) => byId.has(edge.prerequisite_quest_id) && visit(edge.prerequisite_quest_id))
    visiting.delete(questId)
    visited.add(questId)
    return hasCycle
  }

  if (quests.some((quest) => visit(quest.id))) {
    issues.push({
      severity: 'error',
      code: 'cycle',
      message: t('validationCycle'),
      entityId: line.id,
    })
  }

  return issues
}

function Icon({ name }: { name: string }) {
  const glyphs: Record<string, string> = {
    book: '▤',
    check: '✓',
    chevron: '›',
    close: '×',
    eye: '◉',
    grid: '▦',
    lock: '⌑',
    logout: '↪',
    plus: '+',
    refresh: '↻',
    save: '↓',
    search: '⌕',
    settings: '⚙',
    spark: '✦',
    redo: '↷',
    undo: '↶',
    users: '♙',
    warning: '!',
  }
  return <span className="icon" data-name={name} aria-hidden="true">{glyphs[name] ?? '•'}</span>
}

function StatusPill({ status }: { status: string }) {
  const t = useT()
  return <span className={`status-pill status-${status}`}>{getStatusLabel(t, status)}</span>
}

function AuthScreen({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}) {
  const t = useT()
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'signup') {
        await onSignUp(email, password)
        setInfo(t('authReadyOpening'))
      } else {
        await onSignIn(email, password)
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : t('authUnableEnter'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark large">Q</div>
        <p className="eyebrow">{t('authEyebrow')}</p>
        <h1>{t('authTitle')}</h1>
        <p className="auth-copy">{t('authCopy')}</p>
        <div className="auth-mode-tabs" role="tablist" aria-label={t('authModeAria')}>
          <button type="button" role="tab" className={mode === 'signup' ? 'active' : ''} aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); setInfo('') }}>{t('authCreateAccount')}</button>
          <button type="button" role="tab" className={mode === 'signin' ? 'active' : ''} aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); setInfo('') }}>{t('authSignIn')}</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            {t('authEmail')}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              dir="ltr"
              autoComplete="email"
              required
            />
          </label>
          <label>
            {t('authPassword')}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'signup' ? t('authPasswordPlaceholderSignup') : t('authPasswordPlaceholderSignin')}
              dir="ltr"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          {info && <p className="form-info">{info}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? (mode === 'signup' ? t('authCreating') : t('authSigningIn')) : mode === 'signup' ? t('authCreateAndEdit') : t('authEnterEditor')}
            <Icon name="chevron" />
          </button>
        </form>
        <div className="auth-note">
          <Icon name="spark" />
          <span>{t('authFirstAccountNote')}</span>
        </div>
      </section>
      <div className="auth-orbit orbit-one" />
      <div className="auth-orbit orbit-two" />
    </main>
  )
}

function GraphWithStepCounts({
  quests,
  prerequisites,
  steps,
  selectedQuestId,
  onSelect,
}: {
  quests: Quest[]
  prerequisites: QuestPrerequisite[]
  steps: QuestStep[]
  selectedQuestId: string
  onSelect: (questId: string) => void
}) {
  const t = useT()
  const nodeWidth = 192
  const nodeHeight = 110
  const gap = 22
  const padding = 30
  const width = Math.max(720, padding * 2 + quests.length * (nodeWidth + gap) - gap)
  const height = 248
  const positions = new Map(
    quests.map((quest, index) => [quest.id, { x: padding + index * (nodeWidth + gap), y: 55 }]),
  )

  return (
    <div className="graph-scroll">
      <svg
        className="quest-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('graphAria')}
        style={{ minWidth: width }}
      >
        <defs>
          <linearGradient id="edge-gradient-main" x1="0" x2="1">
            <stop offset="0%" stopColor="#8a79ff" />
            <stop offset="100%" stopColor="#5bddd1" />
          </linearGradient>
          <filter id="node-shadow-main" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#07152e" floodOpacity="0.12" />
          </filter>
          <marker id="arrowhead-main" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#8a79ff" />
          </marker>
        </defs>
        {prerequisites.map((edge) => {
          const from = positions.get(edge.prerequisite_quest_id)
          const to = positions.get(edge.quest_id)
          if (!from || !to) return null
          const startX = from.x + nodeWidth
          const endX = to.x
          const midX = (startX + endX) / 2
          return (
            <path
              key={`${edge.prerequisite_quest_id}-${edge.quest_id}`}
              d={`M ${startX} ${from.y + nodeHeight / 2} C ${midX} ${from.y + nodeHeight / 2}, ${midX} ${to.y + nodeHeight / 2}, ${endX} ${to.y + nodeHeight / 2}`}
              className="graph-edge"
              markerEnd="url(#arrowhead-main)"
            />
          )
        })}
        {quests.map((quest, index) => {
          const point = positions.get(quest.id)
          if (!point) return null
          const selected = quest.id === selectedQuestId
          const stepCount = steps.filter((step) => step.quest_id === quest.id).length
          return (
            <g
              key={quest.id}
              transform={`translate(${point.x}, ${point.y})`}
              className={`graph-node ${selected ? 'selected' : ''}`}
              onClick={() => onSelect(quest.id)}
              tabIndex={0}
              role="button"
              aria-label={t('openQuestAria', { name: quest.name })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(quest.id)
              }}
            >
              <rect width={nodeWidth} height={nodeHeight} rx="17" filter="url(#node-shadow-main)" />
              <rect className="node-accent" width="5" height={nodeHeight} rx="2.5" />
              <text className="node-index" x="20" y="28">{String(index + 1).padStart(2, '0')}</text>
              <text className="node-name content-text" x="20" y="55">
                {quest.name.length > 25 ? `${quest.name.slice(0, 24)}…` : quest.name}
              </text>
              <text className="node-meta" x="20" y="82">{stepCount}</text>
              <text className="node-meta-label" x="32" y="82">{t('stepsLabel')}</text>
              <text className="node-level" x={nodeWidth - 20} y="28" textAnchor="end">{t('levelShort', { level: quest.level_required })}</text>
              <circle className="node-status-dot" cx={nodeWidth - 24} cy={nodeHeight - 20} r="4" />
              <text className="node-status" x={nodeWidth - 34} y={nodeHeight - 16} textAnchor="end">
                {getStatusLabel(t, quest.status)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function EmptyState({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  )
}

function Overview({
  data,
  onOpenEditor,
}: {
  data: EditorData
  onOpenEditor: (questlineId?: string) => void
}) {
  const t = useT()
  const published = data.questlines.filter((line) => line.status === 'published').length
  const draft = data.questlines.filter((line) => line.status === 'draft').length
  const validation = data.questlines.map((line) => validateQuestline(data, line, t))
  const blockingIssues = validation.reduce(
    (total, issues) => total + issues.filter((issue) => issue.severity === 'error').length,
    0,
  )

  return (
    <div className="page-content overview-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('overviewEyebrow')}</p>
          <h1>{t('overviewTitle')}</h1>
          <p className="page-subtitle">{t('overviewSubtitle')}</p>
        </div>
        <button className="button primary" onClick={() => onOpenEditor()}>
          <Icon name="spark" /> {t('overviewOpenWorkspace')}
        </button>
      </div>
      <div className="metric-grid">
        <div className="metric-card metric-purple">
          <div className="metric-icon"><Icon name="book" /></div>
          <div><span className="metric-label">{t('metricQuestlines')}</span><strong>{data.questlines.length}</strong></div>
          <span className="metric-foot">{t('metricDrafts', { count: draft })}</span>
        </div>
        <div className="metric-card metric-mint">
          <div className="metric-icon"><Icon name="check" /></div>
          <div><span className="metric-label">{t('metricPublished')}</span><strong>{published}</strong></div>
          <span className="metric-foot">{t('metricSafeSnapshots')}</span>
        </div>
        <div className="metric-card metric-gold">
          <div className="metric-icon"><Icon name="warning" /></div>
          <div><span className="metric-label">{t('metricBlocking')}</span><strong>{blockingIssues}</strong></div>
          <span className="metric-foot">{t('metricAcrossLines')}</span>
        </div>
        <div className="metric-card metric-blue">
          <div className="metric-icon"><Icon name="spark" /></div>
          <div><span className="metric-label">{t('metricSteps')}</span><strong>{data.steps.length}</strong></div>
          <span className="metric-foot">{t('metricGuided')}</span>
        </div>
      </div>
      <div className="overview-grid">
        <section className="panel questline-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">{t('yourWorld')}</p><h2>{t('questlines')}</h2></div>
            <span className="muted">{t('linesCount', { count: data.questlines.length })}</span>
          </div>
          <div className="overview-lines">
            {data.questlines.map((line) => {
              const quests = getQuestlineQuests(data, line.id)
              const lineIssues = validateQuestline(data, line, t)
              return (
                <button className="line-row" key={line.id} onClick={() => onOpenEditor(line.id)}>
                  <span className="line-avatar">{line.display_name.slice(0, 1)}</span>
                  <span className="line-info">
                    <strong className="content-text" dir="auto">{line.display_name}</strong>
                    <small className="content-text" dir="auto">{t('questsCount', { count: quests.length })} · {line.theme ?? t('noThemeYet')}</small>
                  </span>
                  <span className="line-health">
                    {lineIssues.some((issue) => issue.severity === 'error') ? (
                      <span className="health-warning"><Icon name="warning" /> {t('needsWork')}</span>
                    ) : (
                      <span className="health-ready"><Icon name="check" /> {t('ready')}</span>
                    )}
                    <StatusPill status={line.status} />
                  </span>
                  <Icon name="chevron" />
                </button>
              )
            })}
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">{t('safePublishing')}</p><h2>{t('howLoopWorks')}</h2></div>
            <div className="pulse-dot" />
          </div>
          <div className="flow-list">
            <div className="flow-step"><span>01</span><div><strong>{t('flowEditTitle')}</strong><p>{t('flowEditCopy')}</p></div></div>
            <div className="flow-step"><span>02</span><div><strong>{t('flowValidateTitle')}</strong><p>{t('flowValidateCopy')}</p></div></div>
            <div className="flow-step"><span>03</span><div><strong>{t('flowPublishTitle')}</strong><p>{t('flowPublishCopy')}</p></div></div>
          </div>
          <div className="callout"><Icon name="spark" /><span>{t('yamlCallout')}</span></div>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading"><div><p className="eyebrow">{t('recentlyImported')}</p><h2>{t('contentCoverage')}</h2></div><span className="muted">{t('fromRegistry')}</span></div>
        <div className="coverage-grid">
          <CoverageItem label={t('coverageCatalog')} value={data.catalog.length} detail={t('coverageCatalogDetail')} />
          <CoverageItem label={t('coverageDialogues')} value={data.dialogues.length} detail={t('coverageDialogueLines', { count: data.dialogueLines.length })} />
          <CoverageItem label={t('coverageMinigames')} value={data.minigames.length} detail={t('coverageMinigamesDetail')} />
          <CoverageItem label={t('coverageSnapshots')} value={data.revisions.length} detail={t('coverageSnapshotsDetail')} />
        </div>
      </section>
    </div>
  )
}

function CoverageItem({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="coverage-item"><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>
}

function QuestlineRail({
  data,
  selectedQuestlineId,
  onSelect,
  onNew,
}: {
  data: EditorData
  selectedQuestlineId: string
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const t = useT()
  const [filter, setFilter] = useState('')
  const visibleLines = data.questlines.filter((line) =>
    line.display_name.toLowerCase().includes(filter.toLowerCase().trim()),
  )
  return (
    <aside className="questline-rail">
      <div className="rail-heading"><div><p className="eyebrow">{t('workspaceLabel')}</p><h2>{t('questlines')}</h2></div><button className="icon-button" onClick={onNew} aria-label={t('railCreateAria')}><Icon name="plus" /></button></div>
      <div className="rail-search"><Icon name="search" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t('railFilterPlaceholder')} /></div>
      <div className="rail-list">
        {visibleLines.map((line) => {
          const active = line.id === selectedQuestlineId
          const count = data.quests.filter((quest) => quest.questline_id === line.id).length
          return (
            <button className={`rail-line ${active ? 'active' : ''}`} key={line.id} onClick={() => onSelect(line.id)}>
              <span className="rail-line-icon">{line.display_name.slice(0, 1)}</span>
              <span><strong>{line.display_name}</strong><small>{t('questsCount', { count })}</small></span>
              <span className={`rail-status ${line.status}`} />
            </button>
          )
        })}
        {visibleLines.length === 0 && <span className="muted rail-empty">{t('railEmpty')}</span>}
      </div>
      <div className="rail-tip"><span className="tip-spark">✦</span><div><strong>{t('creatorTipTitle')}</strong><p>{t('creatorTipCopy')}</p></div></div>
    </aside>
  )
}

function GraphPanel({
  data,
  line,
  quests,
  selectedQuestId,
  onSelectQuest,
  onAddQuest,
}: {
  data: EditorData
  line: Questline
  quests: Quest[]
  selectedQuestId: string
  onSelectQuest: (id: string) => void
  onAddQuest: () => void
}) {
  const t = useT()
  const lineEdges = data.prerequisites.filter(
    (edge) => quests.some((quest) => quest.id === edge.quest_id) && quests.some((quest) => quest.id === edge.prerequisite_quest_id),
  )
  return (
    <section className="workspace-main">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">{t('visualFlow', { key: line.key })}</p>
          <h1 className="content-text" dir="auto">{line.display_name}</h1>
          <p className="page-subtitle content-text" dir="auto">{line.theme ?? t('addThemeHint')}</p>
        </div>
        <div className="heading-actions">
          <StatusPill status={line.status} />
          <button className="button subtle" onClick={onAddQuest}><Icon name="plus" /> {t('addQuest')}</button>
        </div>
      </div>
      <div className="graph-card">
        <div className="graph-toolbar"><div className="graph-legend"><span><i className="legend-dot done" /> {t('legendComplete')}</span><span><i className="legend-dot draft" /> {t('legendDraft')}</span><span><i className="legend-line" /> {t('legendPrerequisite')}</span></div><span className="muted">{t('graphHint', { count: quests.length })}</span></div>
        {quests.length ? (
          <GraphWithStepCounts
            quests={quests}
            prerequisites={lineEdges}
            steps={data.steps}
            selectedQuestId={selectedQuestId}
            onSelect={onSelectQuest}
          />
        ) : (
          <EmptyState icon="✦" title={t('storyStartsTitle')} copy={t('storyStartsCopy')} />
        )}
        <div className="graph-footer"><span><Icon name="spark" /> {t('graphSourceOfTruth')}</span><button className="text-button" onClick={onAddQuest}>{t('addAnotherQuest')}</button></div>
      </div>
      <div className="editor-hint"><div className="hint-icon">⌘</div><div><strong>{t('designForLearner')}</strong><p>{t('designForLearnerCopy')}</p></div></div>
    </section>
  )
}

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return <span className="field-label"><span>{children}</span>{hint && <small>{hint}</small>}</span>
}

function PrerequisiteEditor({
  quest,
  quests,
  prerequisites,
  onToggle,
}: {
  quest: Quest
  quests: Quest[]
  prerequisites: QuestPrerequisite[]
  onToggle: (prerequisiteQuestId: string, enabled: boolean) => void
}) {
  const t = useT()
  const candidates = quests.filter((candidate) => candidate.id !== quest.id)
  if (candidates.length === 0) {
    return <div className="empty-inline">{t('addPrerequisiteHint')}</div>
  }
  return (
    <div className="prerequisite-list">
      {candidates.map((candidate) => {
        const checked = prerequisites.some((edge) => edge.prerequisite_quest_id === candidate.id)
        return (
          <label className="checkbox-label prerequisite-option" key={candidate.id}>
            <input type="checkbox" checked={checked} onChange={(event) => onToggle(candidate.id, event.target.checked)} />
            <span><strong>{candidate.name || t('untitledQuest')}</strong><small dir="ltr">{candidate.key}</small></span>
          </label>
        )
      })}
    </div>
  )
}

function RewardEditor({
  data,
  rewards,
  onAdd,
  onUpdate,
  onRemove,
}: {
  data: EditorData
  rewards: QuestReward[]
  onAdd: () => void
  onUpdate: (rewardId: string, patch: Partial<QuestReward>) => void
  onRemove: (rewardId: string) => void
}) {
  const t = useT()
  return (
    <div className="reward-editor">
      {rewards.map((reward) => (
        <div className={`reward-editor-row ${reward.reward_type}`} key={reward.id}>
          <select
            aria-label={t('rewardTypeAria')}
            value={reward.reward_type}
            onChange={(event) => {
              const type = event.target.value as QuestReward['reward_type']
              onUpdate(
                reward.id,
                type === 'xp'
                  ? { reward_type: type, xp_amount: reward.xp_amount ?? 50, item_external_id: null, amount: null }
                  : {
                    reward_type: type,
                    xp_amount: null,
                    item_external_id: reward.item_external_id ?? data.catalog.find((entry) => entry.kind === 'item')?.external_id ?? null,
                    amount: reward.amount ?? 1,
                  },
              )
            }}
          >
            <option value="xp">{t('rewardXp')}</option>
            <option value="item">{t('rewardItem')}</option>
          </select>
          {reward.reward_type === 'xp' ? (
              <input
                aria-label={t('xpAmountAria')}
              type="number"
              min={0}
              value={reward.xp_amount ?? 0}
              onChange={(event) => onUpdate(reward.id, { xp_amount: Number(event.target.value) })}
            />
          ) : (
            <>
              <CatalogSelect
                kind="item"
                value={reward.item_external_id ?? ''}
                data={data}
                onChange={(value) => onUpdate(reward.id, { item_external_id: value || null })}
              />
              <input
                aria-label={t('itemAmountAria')}
                type="number"
                min={1}
                value={reward.amount ?? 1}
                onChange={(event) => onUpdate(reward.id, { amount: Number(event.target.value) })}
              />
            </>
          )}
          <button type="button" className="icon-button reward-remove" aria-label={t('removeRewardAria')} onClick={() => onRemove(reward.id)}><Icon name="close" /></button>
        </div>
      ))}
      <button type="button" className="add-inline-button" onClick={onAdd}><Icon name="plus" /> {t('addReward')}</button>
    </div>
  )
}

function QuestInspector({
  data,
  line,
  quest,
  selectedStepId,
  issues,
  onUpdateLine,
  onUpdateQuest,
  onUpdateStep,
  onSelectStep,
  onAddStep,
  onTogglePrerequisite,
  onAddReward,
  onUpdateReward,
  onRemoveReward,
  onUpdateDialogue,
  onUpdateDialogueLine,
  onAddDialogueLine,
  onRemoveDialogueLine,
  onMoveDialogueLine,
  onCreateDialogueForStep,
}: {
  data: EditorData
  line: Questline
  quest: Quest | undefined
  selectedStepId: string
  issues: ValidationIssue[]
  onUpdateLine: (patch: Partial<Questline>) => void
  onUpdateQuest: (patch: Partial<Quest>) => void
  onUpdateStep: (stepId: string, patch: Partial<QuestStep>) => void
  onSelectStep: (stepId: string) => void
  onAddStep: () => void
  onTogglePrerequisite: (prerequisiteQuestId: string, enabled: boolean) => void
  onAddReward: (scope: 'quest' | 'step', parentId: string) => void
  onUpdateReward: (rewardId: string, patch: Partial<QuestReward>) => void
  onRemoveReward: (rewardId: string) => void
  onUpdateDialogue: (dialogueId: string, patch: Partial<Dialogue>) => void
  onUpdateDialogueLine: (lineId: string, patch: Partial<DialogueLine>) => void
  onAddDialogueLine: (dialogueId: string, locale?: string) => void
  onRemoveDialogueLine: (lineId: string) => void
  onMoveDialogueLine: (lineId: string, direction: -1 | 1) => void
  onCreateDialogueForStep: (stepId: string) => void
}) {
  const t = useT()
  const [openSection, setOpenSection] = useState<'quest' | 'steps' | 'line'>('quest')
  const steps = quest ? getQuestSteps(data, quest.id) : []
  const selectedStep = steps.find((step) => step.id === selectedStepId)
  const questIssues = issues.filter((issue) => issue.entityId === quest?.id)
  const lineQuests = getQuestlineQuests(data, line.id)
  const questRewards = getQuestRewards(data, quest?.id ?? '')
  const questPrerequisites = getQuestPrerequisites(data, quest?.id ?? '')

  if (!quest) {
    return (
      <aside className="inspector">
        <div className="inspector-empty"><div className="empty-icon">⌘</div><h3>{t('selectQuestTitle')}</h3><p>{t('selectQuestCopy')}</p></div>
      </aside>
    )
  }

  return (
    <aside className="inspector">
      <div className="inspector-top"><div><p className="eyebrow">{t('questInspector')}</p><h2 className="content-text" dir="auto">{quest.name || t('untitledQuest')}</h2></div><span className="quest-number">Q{String(quest.position + 1).padStart(2, '0')}</span></div>
      {questIssues.length > 0 && <div className="inspector-alert"><Icon name="warning" /><span>{questIssues.length === 1 ? t('validationNote', { count: questIssues.length }) : t('validationNotes', { count: questIssues.length })}</span></div>}
      <div className="inspector-scroll">
        <InspectorSection title={t('questDetails')} open={openSection === 'quest'} onToggle={() => setOpenSection(openSection === 'quest' ? 'steps' : 'quest')}>
          <div className="form-stack">
            <label><FieldLabel hint={t('questNameHint')}>{t('questName')}</FieldLabel><input className="content-text" dir="auto" value={quest.name} onChange={(event) => onUpdateQuest({ name: event.target.value })} /></label>
            <label><FieldLabel hint={t('playerSummaryHint')}>{t('playerSummary')}</FieldLabel><textarea className="content-text" dir="auto" value={quest.summary ?? ''} onChange={(event) => onUpdateQuest({ summary: event.target.value })} rows={3} /></label>
            <div className="form-row">
              <label><FieldLabel>{t('level')}</FieldLabel><input type="number" min={0} value={quest.level_required} onChange={(event) => onUpdateQuest({ level_required: Number(event.target.value) })} /></label>
              <label><FieldLabel>{t('position')}</FieldLabel><input type="number" min={0} value={quest.position} onChange={(event) => onUpdateQuest({ position: Number(event.target.value) })} /></label>
            </div>
            <label><FieldLabel hint={t('questGiverHint')}>{t('questGiver')}</FieldLabel><CatalogSelect kind="npc" value={quest.giver_external_id ?? ''} data={data} onChange={(value) => onUpdateQuest({ giver_external_id: value })} /></label>
            <div className="editor-subsection"><FieldLabel hint={t('prerequisitesHint')}>{t('prerequisites')}</FieldLabel><PrerequisiteEditor quest={quest} quests={lineQuests} prerequisites={questPrerequisites} onToggle={onTogglePrerequisite} /></div>
            <div className="editor-subsection"><FieldLabel hint={t('questRewardsHint')}>{t('questRewards')}</FieldLabel><RewardEditor data={data} rewards={questRewards} onAdd={() => onAddReward('quest', quest.id)} onUpdate={onUpdateReward} onRemove={onRemoveReward} /></div>
          </div>
        </InspectorSection>
        <InspectorSection title={t('learningSteps', { count: steps.length })} open={openSection === 'steps'} onToggle={() => setOpenSection(openSection === 'steps' ? 'quest' : 'steps')}>
          <div className="step-list">
            {steps.map((step, index) => (
              <button key={step.id} className={`step-row ${selectedStep?.id === step.id ? 'selected' : ''}`} onClick={() => { onSelectStep(step.id); setOpenSection('steps') }}>
                <span className="step-index">{String(index + 1).padStart(2, '0')}</span><span className="step-copy"><strong>{step.step_type.replaceAll('_', ' ')}</strong><small>{step.key}</small></span><Icon name="chevron" />
              </button>
            ))}
            <button className="add-step-button" onClick={onAddStep}><Icon name="plus" /> {t('addLearningStep')}</button>
          </div>
        </InspectorSection>
        <InspectorSection title={t('lineSettings')} open={openSection === 'line'} onToggle={() => setOpenSection(openSection === 'line' ? 'quest' : 'line')}>
          <div className="form-stack">
            <label><FieldLabel>{t('questlineName')}</FieldLabel><input className="content-text" dir="auto" value={line.display_name} onChange={(event) => onUpdateLine({ display_name: event.target.value })} /></label>
            <label><FieldLabel>{t('themeLearningGoal')}</FieldLabel><textarea className="content-text" dir="auto" value={line.theme ?? ''} onChange={(event) => onUpdateLine({ theme: event.target.value })} rows={3} /></label>
            <label><FieldLabel>{t('defaultGiver')}</FieldLabel><CatalogSelect kind="npc" value={line.default_giver_external_id ?? ''} data={data} onChange={(value) => onUpdateLine({ default_giver_external_id: value })} /></label>
          </div>
        </InspectorSection>
        {selectedStep && (
          <StepEditor
            data={data}
            step={selectedStep}
            rewards={getStepRewards(data, selectedStep.id)}
            onUpdate={(patch) => onUpdateStep(selectedStep.id, patch)}
            onAddReward={() => onAddReward('step', selectedStep.id)}
            onUpdateReward={onUpdateReward}
            onRemoveReward={onRemoveReward}
            onUpdateDialogue={onUpdateDialogue}
            onUpdateDialogueLine={onUpdateDialogueLine}
            onAddDialogueLine={onAddDialogueLine}
            onRemoveDialogueLine={onRemoveDialogueLine}
            onMoveDialogueLine={onMoveDialogueLine}
            onCreateDialogueForStep={() => onCreateDialogueForStep(selectedStep.id)}
          />
        )}
      </div>
    </aside>
  )
}

function InspectorSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return <section className={`inspector-section ${open ? 'open' : ''}`}><button className="section-toggle" onClick={onToggle}><span>{title}</span><Icon name={open ? 'chevron' : 'plus'} /></button>{open && <div className="section-body">{children}</div>}</section>
}

function CatalogSelect({
  kind,
  value,
  data,
  onChange,
}: {
  kind: CatalogKind
  value: string
  data: EditorData
  onChange: (value: string) => void
}) {
  const t = useT()
  const options = data.catalog.filter((entry) => entry.kind === kind)
  return <select dir="ltr" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{t('chooseCatalog', { kind: getCatalogKindSingular(t, kind) })}</option>{options.map((entry) => <option key={entry.external_id} value={entry.external_id}>{entry.name} · {entry.external_id}</option>)}</select>
}

function StepEditor({
  data,
  step,
  rewards,
  onUpdate,
  onAddReward,
  onUpdateReward,
  onRemoveReward,
  onUpdateDialogue,
  onUpdateDialogueLine,
  onAddDialogueLine,
  onRemoveDialogueLine,
  onMoveDialogueLine,
  onCreateDialogueForStep,
}: {
  data: EditorData
  step: QuestStep
  rewards: QuestReward[]
  onUpdate: (patch: Partial<QuestStep>) => void
  onAddReward: () => void
  onUpdateReward: (rewardId: string, patch: Partial<QuestReward>) => void
  onRemoveReward: (rewardId: string) => void
  onUpdateDialogue: (dialogueId: string, patch: Partial<Dialogue>) => void
  onUpdateDialogueLine: (lineId: string, patch: Partial<DialogueLine>) => void
  onAddDialogueLine: (dialogueId: string, locale?: string) => void
  onRemoveDialogueLine: (lineId: string) => void
  onMoveDialogueLine: (lineId: string, direction: -1 | 1) => void
  onCreateDialogueForStep: () => void
}) {
  const t = useT()
  const definition = getStepType(data, step.step_type)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const updatePayload = (field: string, value: unknown) => onUpdate({ payload: { ...step.payload, [field]: value } })
  const payloadFields = definition?.fields.filter((field) => !field.ref?.includes('dialogues')) ?? []
  const showDialogue = stepHasDialogueField(data, step)
  return (
    <section className="step-editor">
      <div className="step-editor-heading"><div><p className="eyebrow">{t('selectedStep')}</p><h3>{step.step_type.replaceAll('_', ' ')}</h3></div><span className="step-type-tag">{definition?.unity_objective ?? t('customStep')}</span></div>
      <p className="step-description">{definition?.description ?? t('configurePayload')}</p>
      <div className="form-stack">
        <label><FieldLabel>{t('stepType')}</FieldLabel><select dir="ltr" value={step.step_type} onChange={(event) => onUpdate({ step_type: event.target.value })}>{data.stepTypes.map((type) => <option key={type.id} value={type.id}>{type.id.replaceAll('_', ' ')}</option>)}</select></label>
        {payloadFields.map((field) => <StepFieldEditor key={field.name} field={field} value={step.payload[field.name]} data={data} onChange={(value) => updatePayload(field.name, value)} />)}
        <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? t('hidePayload') : t('showPayload')} <Icon name="chevron" /></button>
        {showAdvanced && <div className="payload-preview"><code>{JSON.stringify(step.payload, null, 2)}</code></div>}
      </div>
      {showDialogue && (
        <StepDialogueEditor
          data={data}
          step={step}
          onAttachDialogue={(key) => updatePayload('dialogue_id', key)}
          onUpdateDialogue={onUpdateDialogue}
          onUpdateDialogueLine={onUpdateDialogueLine}
          onAddDialogueLine={onAddDialogueLine}
          onRemoveDialogueLine={onRemoveDialogueLine}
          onMoveDialogueLine={onMoveDialogueLine}
          onCreateDialogue={onCreateDialogueForStep}
        />
      )}
      <div className="editor-subsection"><FieldLabel hint={t('stepRewardsHint')}>{t('stepRewards')}</FieldLabel><RewardEditor data={data} rewards={rewards} onAdd={onAddReward} onUpdate={onUpdateReward} onRemove={onRemoveReward} /></div>
    </section>
  )
}

function StepFieldEditor({
  field,
  value,
  data,
  onChange,
}: {
  field: StepField
  value: unknown
  data: EditorData
  onChange: (value: unknown) => void
}) {
  const t = useT()
  const catalogKind = getCatalogKindForRef(field.ref)
  if (catalogKind) {
    return <label><FieldLabel hint={field.required ? t('required') : t('optional')}>{field.name.replaceAll('_', ' ')}</FieldLabel><CatalogSelect kind={catalogKind} value={String(value ?? '')} data={data} onChange={onChange} /></label>
  }
  if (field.ref?.includes('dialogues')) {
    return <label><FieldLabel hint={field.required ? t('required') : t('optional')}>{field.name.replaceAll('_', ' ')}</FieldLabel><select dir="ltr" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}><option value="">{t('chooseDialogue')}</option>{data.dialogues.map((dialogue) => <option key={dialogue.key} value={dialogue.key}>{dialogue.key}</option>)}</select></label>
  }
  if (field.type === 'boolean') {
    return <label className="checkbox-label"><input type="checkbox" checked={Boolean(value ?? field.default ?? false)} onChange={(event) => onChange(event.target.checked)} /><span><FieldLabel>{field.name.replaceAll('_', ' ')}</FieldLabel></span></label>
  }
  return <label><FieldLabel hint={field.required ? t('required') : t('optional')}>{field.name.replaceAll('_', ' ')}</FieldLabel><input dir={field.type === 'integer' || field.type === 'number' ? 'ltr' : 'auto'} className={field.type === 'integer' || field.type === 'number' ? undefined : 'content-text'} type={field.type === 'integer' || field.type === 'number' ? 'number' : 'text'} value={String(value ?? field.default ?? '')} min={field.min} max={field.max} onChange={(event) => onChange(field.type === 'integer' || field.type === 'number' ? Number(event.target.value) : event.target.value)} /></label>
}

function StepDialogueEditor({
  data,
  step,
  onAttachDialogue,
  onUpdateDialogue,
  onUpdateDialogueLine,
  onAddDialogueLine,
  onRemoveDialogueLine,
  onMoveDialogueLine,
  onCreateDialogue,
}: {
  data: EditorData
  step: QuestStep
  onAttachDialogue: (key: string) => void
  onUpdateDialogue: (dialogueId: string, patch: Partial<Dialogue>) => void
  onUpdateDialogueLine: (lineId: string, patch: Partial<DialogueLine>) => void
  onAddDialogueLine: (dialogueId: string, locale?: string) => void
  onRemoveDialogueLine: (lineId: string) => void
  onMoveDialogueLine: (lineId: string, direction: -1 | 1) => void
  onCreateDialogue: () => void
}) {
  const t = useT()
  const dialogueKey = typeof step.payload.dialogue_id === 'string' ? step.payload.dialogue_id : ''
  const dialogue = data.dialogues.find((item) => item.key === dialogueKey)
  const lines = dialogue ? getDialogueLines(data, dialogue.id) : []
  const dialogueField = getStepType(data, step.step_type)?.fields.find((field) => field.ref?.includes('dialogues'))
  const required = Boolean(dialogueField?.required)

  return (
    <div className="step-dialogue-editor">
      <div className="dialogue-heading">
        <span className="dialogue-avatar">{dialogue?.speaker_external_id?.slice(0, 1) ?? 'ד'}</span>
        <div>
          <strong>{t('questDialogue')}</strong>
          <small dir="ltr">{dialogue ? dialogue.key : t('noDialogueAttached')}</small>
        </div>
      </div>
      <div className="form-stack">
        <label>
          <FieldLabel hint={required ? t('required') : t('optional')}>{t('dialogue')}</FieldLabel>
          <select dir="ltr" value={dialogueKey} onChange={(event) => onAttachDialogue(event.target.value)}>
            <option value="">{t('chooseDialogue')}</option>
            {data.dialogues.map((item) => <option key={item.key} value={item.key}>{item.key}</option>)}
          </select>
        </label>
        <div className="dialogue-attach-actions">
          <button type="button" className="button subtle compact" onClick={onCreateDialogue}>
            <Icon name="plus" /> {t('createDialogueForStep')}
          </button>
        </div>
        {dialogue ? (
          <>
            <label>
              <FieldLabel hint={t('speakerHint')}>{t('speaker')}</FieldLabel>
              <CatalogSelect
                kind="npc"
                value={dialogue.speaker_external_id ?? ''}
                data={data}
                onChange={(value) => onUpdateDialogue(dialogue.id, { speaker_external_id: value || null })}
              />
            </label>
            <DialogueLinesEditor
              lines={lines}
              onUpdateLine={onUpdateDialogueLine}
              onAddLine={() => onAddDialogueLine(dialogue.id, lines[0]?.locale ?? DEFAULT_DIALOGUE_LOCALE)}
              onRemoveLine={onRemoveDialogueLine}
              onMoveLine={onMoveDialogueLine}
            />
          </>
        ) : (
          <p className="dialogue-empty-hint">{t('dialogueEmptyHint')}</p>
        )}
      </div>
    </div>
  )
}

function DialogueLinesEditor({
  lines,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onMoveLine,
}: {
  lines: DialogueLine[]
  onUpdateLine: (lineId: string, patch: Partial<DialogueLine>) => void
  onAddLine: () => void
  onRemoveLine: (lineId: string) => void
  onMoveLine: (lineId: string, direction: -1 | 1) => void
}) {
  const t = useT()
  const locales = [...new Set(lines.map((line) => line.locale))]
  return (
    <div className="dialogue-lines-editor">
      <div className="dialogue-locale-tabs">
        <span className="eyebrow">{t('lines')}</span>
        {locales.map((locale) => <span className="locale-tab" key={locale}>{locale}</span>)}
        {locales.length === 0 && <span className="locale-tab">{DEFAULT_DIALOGUE_LOCALE}</span>}
      </div>
      {lines.map((line, index) => (
        <div className="dialogue-line-row" key={line.id}>
          <label>
            <FieldLabel hint={t('dialogueTextHint', { n: index + 1, locale: line.locale })}>{t('dialogueText')}</FieldLabel>
            <textarea
              className="content-text"
              rows={2}
              value={line.content}
              dir="auto"
              onChange={(event) => onUpdateLine(line.id, { content: event.target.value })}
              placeholder={t('dialoguePlaceholder')}
            />
          </label>
          <div className="dialogue-line-actions">
            <button type="button" className="icon-button" aria-label={t('moveLineUp')} disabled={index === 0} onClick={() => onMoveLine(line.id, -1)}>↑</button>
            <button type="button" className="icon-button" aria-label={t('moveLineDown')} disabled={index === lines.length - 1} onClick={() => onMoveLine(line.id, 1)}>↓</button>
            <button type="button" className="icon-button" aria-label={t('removeLine')} disabled={lines.length <= 1} onClick={() => onRemoveLine(line.id)}><Icon name="close" /></button>
          </div>
        </div>
      ))}
      <button type="button" className="add-inline-button" onClick={onAddLine}><Icon name="plus" /> {t('addLine')}</button>
    </div>
  )
}

function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const t = useT()
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  return (
    <section className="validation-panel">
      <div className="validation-summary"><span className={`validation-icon ${errors.length ? 'has-errors' : 'valid'}`}>{errors.length ? '!' : '✓'}</span><div><strong>{errors.length ? t('blockingIssues', { count: errors.length }) : t('readyToPublish')}</strong><span>{warnings.length ? t('warningsToReview', { count: warnings.length }) : t('noValidationBlockers')}</span></div></div>
      <div className="validation-list">{issues.length ? issues.slice(0, 6).map((issue, index) => <div className={`validation-item ${issue.severity}`} key={`${issue.code}-${issue.entityId ?? index}`}><span>{issue.severity === 'error' ? '!' : '·'}</span><span>{issue.message}</span></div>) : <div className="validation-item success"><span>✓</span><span>{t('validationAllReady')}</span></div>}</div>
    </section>
  )
}

function Library({
  data,
  onUpdateDialogue,
  onUpdateDialogueLine,
  onAddDialogueLine,
  onRemoveDialogueLine,
  onMoveDialogueLine,
  onCreateDialogue,
  onUpdateMinigame,
}: {
  data: EditorData
  onUpdateDialogue: (dialogueId: string, patch: Partial<Dialogue>) => void
  onUpdateDialogueLine: (lineId: string, patch: Partial<DialogueLine>) => void
  onAddDialogueLine: (dialogueId: string, locale?: string) => void
  onRemoveDialogueLine: (lineId: string) => void
  onMoveDialogueLine: (lineId: string, direction: -1 | 1) => void
  onCreateDialogue: () => void
  onUpdateMinigame: (minigameId: string, patch: Partial<EditorData['minigames'][number]>) => void
}) {
  const t = useT()
  const [tab, setTab] = useState<LibraryTab>('catalog')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<CatalogKind | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'live_used' | 'catalog_stub' | 'has_image'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [previewEntry, setPreviewEntry] = useState<CatalogEntry | null>(null)
  const normalizedSearch = search.toLowerCase().trim()
  const entries = data.catalog.filter((entry) => {
    if (kind !== 'all' && entry.kind !== kind) return false
    if (statusFilter === 'live_used' && entry.status !== 'live_used') return false
    if (statusFilter === 'catalog_stub' && entry.status !== 'catalog_stub') return false
    if (statusFilter === 'has_image' && !entry.image_path) return false
    return `${entry.name} ${entry.external_id} ${entry.description ?? ''}`.toLowerCase().includes(normalizedSearch)
  })
  const dialogues = data.dialogues.filter((dialogue) => `${dialogue.key} ${dialogue.speaker_external_id ?? ''}`.toLowerCase().includes(normalizedSearch))
  const minigames = data.minigames.filter((minigame) => `${minigame.key} ${minigame.instruction ?? ''}`.toLowerCase().includes(normalizedSearch))
  const catalogKindLabels = getCatalogKindLabels(t)

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1200)
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div className="page-content library-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('libraryEyebrow')}</p>
          <h1>{t('libraryTitle')}</h1>
          <p className="page-subtitle">{t('librarySubtitle')}</p>
        </div>
        <div className="library-count"><strong>{data.catalog.length + data.dialogues.length + data.minigames.length}</strong><span>{t('importedEntries')}</span></div>
      </div>
      <div className="library-tabs">
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}><Icon name="grid" /> {t('worldCatalog')} <span>{data.catalog.length}</span></button>
        <button className={tab === 'dialogues' ? 'active' : ''} onClick={() => setTab('dialogues')}><Icon name="book" /> {t('dialogues')} <span>{data.dialogues.length}</span></button>
        <button className={tab === 'minigames' ? 'active' : ''} onClick={() => setTab('minigames')}><Icon name="spark" /> {t('minigameBriefs')} <span>{data.minigames.length}</span></button>
      </div>
      <div className="library-toolbar">
        <div className="search-box"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchPlaceholder')} /></div>
        {tab === 'catalog' && (
          <>
            <select value={kind} onChange={(event) => setKind(event.target.value as CatalogKind | 'all')}>
              <option value="all">{t('allTypes')}</option>
              {Object.entries(catalogKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">{t('allStatuses')}</option>
              <option value="live_used">{t('liveUsed')}</option>
              <option value="catalog_stub">{t('catalogStub')}</option>
              <option value="has_image">{t('hasImage')}</option>
            </select>
          </>
        )}
        {tab === 'dialogues' && (
          <button type="button" className="button subtle compact" onClick={onCreateDialogue}>
            <Icon name="plus" /> {t('newDialogue')}
          </button>
        )}
      </div>
      {tab === 'catalog' && (
        <div className="catalog-grid">
          {entries.map((entry) => (
            <CatalogCard
              key={entry.id}
              entry={entry}
              copied={copiedId === entry.external_id}
              onCopy={() => void copyId(entry.external_id)}
              onOpen={() => setPreviewEntry(entry)}
            />
          ))}
        </div>
      )}
      {tab === 'dialogues' && (
        <div className="library-list">
          {dialogues.map((dialogue) => (
            <DialogueCard
              key={dialogue.id}
              dialogue={dialogue}
              lines={getDialogueLines(data, dialogue.id)}
              data={data}
              onUpdate={onUpdateDialogue}
              onUpdateLine={onUpdateDialogueLine}
              onAddLine={onAddDialogueLine}
              onRemoveLine={onRemoveDialogueLine}
              onMoveLine={onMoveDialogueLine}
            />
          ))}
        </div>
      )}
      {tab === 'minigames' && <div className="library-grid">{minigames.map((minigame) => <MinigameCard key={`${minigame.key}-${minigame.locale}`} minigame={minigame} onUpdate={onUpdateMinigame} />)}</div>}
      {((tab === 'catalog' && entries.length === 0) || (tab === 'dialogues' && dialogues.length === 0) || (tab === 'minigames' && minigames.length === 0)) && <EmptyState icon="⌕" title={t('nothingFoundTitle')} copy={t('nothingFoundCopy')} />}
      {previewEntry && (
        <CatalogPreviewModal
          key={previewEntry.id}
          entry={previewEntry}
          copied={copiedId === previewEntry.external_id}
          onCopy={() => void copyId(previewEntry.external_id)}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </div>
  )
}

function CatalogCard({ entry, copied, onCopy, onOpen }: { entry: CatalogEntry; copied: boolean; onCopy: () => void; onOpen: () => void }) {
  const t = useT()
  const imageUrl = catalogImageUrl(entry.image_path)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !imageFailed
  const status = entry.status ?? 'catalog'
  const statusClass = status === 'live_used' ? 'live' : status === 'catalog_stub' ? 'stub' : ''

  return (
    <article
      className="catalog-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <div className={`catalog-thumb ${entry.kind === 'item' || entry.kind === 'minigame' ? 'contain' : ''}`}>
        {showImage ? (
          <img src={imageUrl!} alt={entry.name} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="catalog-thumb-fallback">{catalogKindIcons[entry.kind]}</span>
        )}
      </div>
      <div className="catalog-card-body">
        <div className="catalog-card-top">
          <p className="eyebrow">{getCatalogKindSingular(t, entry.kind)}</p>
          <span className={`library-status catalog-status ${statusClass}`}>{getCatalogStatusLabel(t, status)}</span>
        </div>
        <h3 className="content-text" dir="auto">{entry.name}</h3>
        <div className="catalog-id-row">
          <code title={entry.external_id}>{entry.external_id}</code>
          <button
            type="button"
            className={`catalog-copy ${copied ? 'copied' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onCopy()
            }}
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
        <p className="content-text" dir="auto">{entry.description ?? t('importedFromRegistry')}</p>
      </div>
    </article>
  )
}

function CatalogPreviewModal({
  entry,
  copied,
  onCopy,
  onClose,
}: {
  entry: CatalogEntry
  copied: boolean
  onCopy: () => void
  onClose: () => void
}) {
  const t = useT()
  const imageUrl = catalogImageUrl(entry.image_path)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !imageFailed
  const status = entry.status ?? 'catalog'
  const statusClass = status === 'live_used' ? 'live' : status === 'catalog_stub' ? 'stub' : ''
  const containImage = entry.kind === 'item' || entry.kind === 'minigame'

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="modal-card catalog-preview-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-preview-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{getCatalogKindSingular(t, entry.kind)}</p>
            <h2 id="catalog-preview-title" className="content-text" dir="auto">{entry.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('closeAria')}><Icon name="close" /></button>
        </div>
        <div className={`catalog-preview-image ${containImage ? 'contain' : ''}`}>
          {showImage ? (
            <img src={imageUrl!} alt={entry.name} onError={() => setImageFailed(true)} />
          ) : (
            <span className="catalog-thumb-fallback catalog-preview-fallback">{catalogKindIcons[entry.kind]}</span>
          )}
        </div>
        <div className="catalog-preview-meta">
          <span className={`library-status catalog-status ${statusClass}`}>{getCatalogStatusLabel(t, status)}</span>
          <div className="catalog-id-row">
            <code title={entry.external_id}>{entry.external_id}</code>
            <button type="button" className={`catalog-copy ${copied ? 'copied' : ''}`} onClick={onCopy}>{copied ? t('copied') : t('copy')}</button>
          </div>
          <p className="content-text" dir="auto">{entry.description ?? t('importedFromRegistry')}</p>
        </div>
      </section>
    </div>
  )
}

function DialogueCard({
  dialogue,
  lines,
  data,
  onUpdate,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onMoveLine,
}: {
  dialogue: Dialogue
  lines: DialogueLine[]
  data: EditorData
  onUpdate: (dialogueId: string, patch: Partial<Dialogue>) => void
  onUpdateLine: (lineId: string, patch: Partial<DialogueLine>) => void
  onAddLine: (dialogueId: string, locale?: string) => void
  onRemoveLine: (lineId: string) => void
  onMoveLine: (lineId: string, direction: -1 | 1) => void
}) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  return (
    <article className={`dialogue-card ${editing ? 'editing' : ''}`}>
      <div className="dialogue-card-top"><span className="dialogue-avatar">{dialogue.speaker_external_id?.slice(0, 1) ?? '?'}</span><div><h3 dir="ltr">{dialogue.key}</h3><p dir="auto">{dialogue.speaker_external_id ?? t('unknownSpeaker')} · {dialogue.source_path ?? t('editorFallback')}</p></div><StatusPill status={t('linesCountPill', { count: lines.length })} /></div>
      {editing ? (
        <div className="dialogue-editor">
          <label><FieldLabel>{t('dialogueKey')}</FieldLabel><input dir="ltr" value={dialogue.key} onChange={(event) => onUpdate(dialogue.id, { key: slugify(event.target.value) || dialogue.key })} /></label>
          <label><FieldLabel>{t('speaker')}</FieldLabel><CatalogSelect kind="npc" value={dialogue.speaker_external_id ?? ''} data={data} onChange={(value) => onUpdate(dialogue.id, { speaker_external_id: value || null })} /></label>
          <DialogueLinesEditor
            lines={lines}
            onUpdateLine={onUpdateLine}
            onAddLine={() => onAddLine(dialogue.id, lines[0]?.locale ?? DEFAULT_DIALOGUE_LOCALE)}
            onRemoveLine={onRemoveLine}
            onMoveLine={onMoveLine}
          />
          <button type="button" className="button subtle compact" onClick={() => setEditing(false)}>{t('doneEditing')}</button>
        </div>
      ) : (
        <><div className="dialogue-lines">{lines.slice(0, 3).map((line) => <p className="content-text" dir="auto" key={line.id}><span>{line.locale}</span>{line.content || t('emptyDialogueLine')}</p>)}</div><button type="button" className="button subtle compact" onClick={() => setEditing(true)}>{t('editDialogue')}</button></>
      )}
    </article>
  )
}

function MinigameCard({
  minigame,
  onUpdate,
}: {
  minigame: EditorData['minigames'][number]
  onUpdate: (minigameId: string, patch: Partial<EditorData['minigames'][number]>) => void
}) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  return (
    <article className={`library-card minigame-card ${editing ? 'editing' : ''}`}>
      <div className="library-card-icon">✦</div>
      {editing ? (
        <div className="library-card-copy minigame-editor">
          <p className="eyebrow">{minigame.variant ?? t('activity')} · {minigame.locale}</p>
          <h3 dir="ltr">{minigame.key}</h3>
          <label><FieldLabel>{t('instruction')}</FieldLabel><textarea className="content-text" dir="auto" rows={2} value={minigame.instruction ?? ''} onChange={(event) => onUpdate(minigame.id, { instruction: event.target.value || null })} /></label>
          <label><FieldLabel>{t('successMessage')}</FieldLabel><input className="content-text" dir="auto" value={minigame.success ?? ''} onChange={(event) => onUpdate(minigame.id, { success: event.target.value || null })} /></label>
          <button type="button" className="button subtle compact" onClick={() => setEditing(false)}>{t('doneEditing')}</button>
        </div>
      ) : (
        <div className="library-card-copy"><p className="eyebrow">{minigame.variant ?? t('activity')} · {minigame.locale}</p><h3 className="content-text" dir="auto">{minigame.instruction ?? minigame.key}</h3><code>{minigame.key}</code><p className="content-text" dir="auto">{minigame.success ?? t('localizedMinigame')}</p><button type="button" className="button subtle compact" onClick={() => setEditing(true)}>{t('editBrief')}</button></div>
      )}
      <span className="library-status">{minigame.locale}</span>
    </article>
  )
}

function Preview({ data, line, quest, onSelectQuest }: { data: EditorData; line: Questline | undefined; quest: Quest | undefined; onSelectQuest: (questId: string) => void }) {
  const t = useT()
  if (!line) return <div className="page-content"><EmptyState icon="◉" title={t('chooseQuestlineTitle')} copy={t('chooseQuestlineCopy')} /></div>
  const quests = getQuestlineQuests(data, line.id)
  return (
    <div className="page-content preview-page">
      <div className="page-heading"><div><p className="eyebrow">{t('previewEyebrow')}</p><h1 className="content-text" dir="auto">{line.display_name}</h1><p className="page-subtitle">{t('previewSubtitle')}</p></div><StatusPill status={line.status} /></div>
      <div className="preview-shell">
        <div className="preview-hero"><div className="preview-crown">✦</div><div><p className="eyebrow">{t('learningAdventure')}</p><h2 className="content-text" dir="auto">{line.display_name}</h2><p className="content-text" dir="auto">{line.theme}</p></div><div className="preview-progress"><strong>{quests.length}</strong><span>{t('questsInPath')}</span></div></div>
        <div className="preview-body"><div className="preview-path">{quests.map((item, index) => <button key={item.id} className={`preview-quest ${item.id === quest?.id ? 'selected' : ''}`} onClick={() => onSelectQuest(item.id)}><span className="preview-quest-number">{String(index + 1).padStart(2, '0')}</span><span><strong className="content-text" dir="auto">{item.name}</strong><small className="content-text" dir="auto">{item.summary}</small></span><StatusPill status={item.status} /></button>)}</div><div className="preview-detail">{quest ? <><p className="eyebrow">{t('questBrief')}</p><h2 className="content-text" dir="auto">{quest.name}</h2><p className="content-text" dir="auto">{quest.summary}</p><div className="preview-steps">{getQuestSteps(data, quest.id).map((step, index) => <div className="preview-step" key={step.id}><span>{index + 1}</span><div><strong>{step.step_type.replaceAll('_', ' ')}</strong><small dir="auto">{Object.values(step.payload).filter((value) => typeof value === 'string').slice(0, 2).join(' · ')}</small></div></div>)}</div></> : <EmptyState icon="✦" title={t('selectQuestPreviewTitle')} copy={t('selectQuestPreviewCopy')} />}</div></div>
      </div>
    </div>
  )
}

function Settings({ data, demoMode }: { data: EditorData; demoMode: boolean }) {
  const { locale, setLocale, t } = useLocale()
  return (
    <div className="page-content settings-page">
      <div className="page-heading"><div><p className="eyebrow">{t('settingsEyebrow')}</p><h1>{t('settingsTitle')}</h1><p className="page-subtitle">{t('settingsSubtitle')}</p></div></div>
      <div className="settings-grid">
        <section className="panel settings-card language-card"><div className="settings-title"><span className="settings-icon"><Icon name="spark" /></span><div><h2>{t('languageSectionTitle')}</h2><p>{t('languageSectionCopy')}</p></div></div><div className="setting-row"><span>{t('languageLabel')}</span><div className="language-toggle"><button type="button" className={locale === 'he' ? 'active' : ''} aria-pressed={locale === 'he'} onClick={() => setLocale('he')}>{t('languageHebrew')}</button><button type="button" className={locale === 'en' ? 'active' : ''} aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>{t('languageEnglish')}</button></div></div><p className="language-note">{t('languageRtlNote')}</p></section>
        <section className="panel settings-card"><div className="settings-title"><span className="settings-icon"><Icon name="lock" /></span><div><h2>{t('connectionTitle')}</h2><p>{t('connectionCopy')}</p></div></div><div className="setting-row"><span>{t('environment')}</span><strong className={demoMode ? 'setting-warning' : 'setting-good'}>{demoMode ? t('previewNotConnected') : t('connectedSupabase')}</strong></div><div className="setting-row"><span>{t('authentication')}</span><strong>{t('authRequired')}</strong></div><div className="setting-row"><span>{t('runtimeContract')}</span><strong>{t('publishedOnly')}</strong></div></section>
        <section className="panel settings-card"><div className="settings-title"><span className="settings-icon"><Icon name="refresh" /></span><div><h2>{t('importBridgeTitle')}</h2><p>{t('importBridgeCopy')}</p></div></div><div className="setting-row"><span>{t('sourceBundle')}</span><code dir="ltr">supabase/seed/quest_content_bundle.json</code></div><div className="setting-row"><span>{t('conflictReport')}</span><code dir="ltr">reports/quest_import_report.json</code></div><div className="setting-row"><span>{t('importedEntities')}</span><strong>{t('sharedRecords', { count: data.catalog.length + data.dialogues.length + data.minigames.length })}</strong></div></section>
      </div>
      <section className="panel schema-card"><div className="panel-heading"><div><p className="eyebrow">{t('backendContract')}</p><h2>{t('protectedTables')}</h2></div><span className="muted">{t('rlsEnabled')}</span></div><div className="schema-list">{['questlines', 'quests', 'quest_steps', 'quest_prerequisites', 'quest_rewards', 'dialogues', 'minigame_instances', 'questline_revisions', 'audit_log'].map((table) => <span key={table} dir="ltr"><Icon name="check" />{table}</span>)}</div></section>
    </div>
  )
}

function NewQuestlineModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, key: string, theme: string) => void }) {
  const t = useT()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [theme, setTheme] = useState('')
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCreate(name.trim(), (key || slugify(name)).trim(), theme.trim())
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-line-title"><div className="modal-heading"><div><p className="eyebrow">{t('newStory')}</p><h2 id="new-line-title">{t('createQuestline')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('closeAria')}><Icon name="close" /></button></div><form className="form-stack" onSubmit={create}><label><FieldLabel>{t('displayName')}</FieldLabel><input className="content-text" dir="auto" value={name} onChange={(event) => { setName(event.target.value); if (!key) setKey(slugify(event.target.value)) }} placeholder={t('displayNamePlaceholder')} required /></label><label><FieldLabel hint={t('questlineKeyHint')}>{t('questlineKey')}</FieldLabel><input dir="ltr" value={key} onChange={(event) => setKey(slugify(event.target.value))} placeholder={t('questlineKeyPlaceholder')} required /></label><label><FieldLabel>{t('learningGoal')}</FieldLabel><textarea className="content-text" dir="auto" value={theme} onChange={(event) => setTheme(event.target.value)} rows={3} placeholder={t('learningGoalPlaceholder')} /></label><div className="modal-actions"><button type="button" className="button subtle" onClick={onClose}>{t('cancel')}</button><button className="button primary"><Icon name="plus" /> {t('createDraft')}</button></div></form></section></div>
}

function Toast({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  return <div className={`toast ${tone}`}><span>{tone === 'success' ? '✓' : '!'}</span>{message}</div>
}

function PublishConfirmModal({
  warningCount,
  busy,
  onClose,
  onConfirm,
}: {
  warningCount: number
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <div className="modal-heading"><div><p className="eyebrow">{t('releaseCheck')}</p><h2 id="publish-title">{t('publishSnapshotTitle')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('closeAria')}><Icon name="close" /></button></div>
        <p className="modal-copy">{t('publishCopy')}</p>
        {warningCount > 0 && <div className="publish-warning"><Icon name="warning" /><span>{warningCount === 1 ? t('publishWarning', { count: warningCount }) : t('publishWarnings', { count: warningCount })}</span></div>}
        <div className="modal-actions"><button className="button subtle" onClick={onClose}>{t('keepEditing')}</button><button className="button primary" onClick={onConfirm} disabled={busy}>{busy ? t('publishing') : t('publishSnapshot')}</button></div>
      </section>
    </div>
  )
}

function AccessRequired({
  email,
  message,
  onSignOut,
  onRetryJoin,
}: {
  email?: string
  message?: string
  onSignOut: () => Promise<void>
  onRetryJoin: () => Promise<void>
}) {
  const t = useT()
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const retry = async () => {
    setJoining(true)
    setJoinError('')
    try {
      await onRetryJoin()
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : t('accessJoinFailed'))
    } finally {
      setJoining(false)
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card access-card">
        <div className="brand-mark large">Q</div>
        <p className="eyebrow">{t('accessEyebrow')}</p>
        <h1>{t('accessTitle')}</h1>
        <p className="auth-copy">
          {message ?? t('accessCopy')}
        </p>
        <div className="auth-note"><Icon name="spark" /><span>{email ?? t('accessAuthenticated')}</span></div>
        {joinError && <p className="form-error">{joinError}</p>}
        <button className="button primary wide" disabled={joining} onClick={() => void retry()}>
          {joining ? t('accessJoining') : t('accessEnter')}
        </button>
        <button className="button subtle wide" onClick={() => void onSignOut()}><Icon name="logout" /> {t('accessSignOut')}</button>
      </section>
    </main>
  )
}

function App() {
  const t = useT()
  const demoMode = !hasSupabaseConfig
  const [data, setData] = useState<EditorData>(() => (demoMode ? createDemoData() : emptyEditorData()))
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authReady, setAuthReady] = useState(demoMode)
  const [selectedQuestlineId, setSelectedQuestlineId] = useState(demoMode ? 'demo-ql-adjective' : '')
  const [selectedQuestId, setSelectedQuestId] = useState('')
  const [selectedStepId, setSelectedStepId] = useState('')
  const [view, setView] = useState<View>('editor')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [showNewQuestline, setShowNewQuestline] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [loadError, setLoadError] = useState('')
  const history = useRef<EditorData[]>([])
  const historyIndex = useRef(-1)
  const restoringHistory = useRef(false)
  const autoSaveInFlight = useRef(false)

  useEffect(() => {
    if (restoringHistory.current) {
      restoringHistory.current = false
      return
    }
    if (history.current[historyIndex.current] === data) return
    const next = history.current.slice(0, historyIndex.current + 1)
    next.push(data)
    if (next.length > 40) next.shift()
    history.current = next
    historyIndex.current = next.length - 1
  }, [data])

  const undo = () => {
    if (historyIndex.current <= 0) return
    historyIndex.current -= 1
    restoringHistory.current = true
    setData(history.current[historyIndex.current])
    setDirty(true)
  }

  const redo = () => {
    if (historyIndex.current >= history.current.length - 1) return
    historyIndex.current += 1
    restoringHistory.current = true
    setData(history.current[historyIndex.current])
    setDirty(true)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return
    const client = supabase
    let mounted = true

    const enterWorkspace = async (sessionUser: { id: string; email?: string | null }) => {
      const displayName = sessionUser.email?.split('@')[0] ?? null
      const { error: membershipError } = await client.rpc('ensure_workspace_member', {
        p_display_name: displayName,
      })
      if (membershipError) throw membershipError
      const loaded = await loadEditorData()
      if (!mounted) return
      setData(loaded)
      setLoadError('')
    }

    const initialize = async () => {
      const { data: sessionData } = await client.auth.getSession()
      if (!mounted) return
      const sessionUser = sessionData.session?.user
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email } : null)
      if (sessionUser) {
        try {
          await enterWorkspace(sessionUser)
        } catch (error) {
          if (mounted) setLoadError(error instanceof Error ? error.message : t('loadEditorFailed'))
        }
      }
      setAuthReady(true)
    }
    void initialize()
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email } : null)
      if (sessionUser) {
        void enterWorkspace(sessionUser).catch((error: unknown) => {
          if (mounted) setLoadError(error instanceof Error ? error.message : t('loadEditorFailed'))
        })
      } else {
        setData(emptyEditorData())
      }
    })
    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (data.questlines.length === 0) return
    if (!selectedQuestlineId || !data.questlines.some((line) => line.id === selectedQuestlineId)) {
      setSelectedQuestlineId(data.questlines[0].id)
    }
  }, [data.questlines, selectedQuestlineId])

  const selectedLine = data.questlines.find((line) => line.id === selectedQuestlineId)
  const lineQuests = useMemo(() => getQuestlineQuests(data, selectedQuestlineId), [data, selectedQuestlineId])

  useEffect(() => {
    if (lineQuests.length === 0) {
      setSelectedQuestId('')
      setSelectedStepId('')
      return
    }
    if (!selectedQuestId || !lineQuests.some((quest) => quest.id === selectedQuestId)) {
      setSelectedQuestId(lineQuests[0].id)
    }
  }, [lineQuests, selectedQuestId])

  const selectedQuest = data.quests.find((quest) => quest.id === selectedQuestId)
  const questSteps = selectedQuest ? getQuestSteps(data, selectedQuest.id) : []

  useEffect(() => {
    if (questSteps.length === 0) {
      setSelectedStepId('')
      return
    }
    if (!selectedStepId || !questSteps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(questSteps[0].id)
    }
  }, [questSteps, selectedStepId])

  const issues = useMemo(() => validateQuestline(data, selectedLine, t), [data, selectedLine, t])

  const notify = (message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 3600)
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) return
    const { data: signUpData, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (!signUpData.session) {
      throw new Error(t('confirmEmail'))
    }
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }

  const ensureMembership = async () => {
    if (!supabase || !user) return
    const displayName = user.email?.split('@')[0] ?? null
    const { error } = await supabase.rpc('ensure_workspace_member', {
      p_display_name: displayName,
    })
    if (error) throw error
    const loaded = await loadEditorData()
    setData(loaded)
    setLoadError('')
  }

  const updateLine = (patch: Partial<Questline>) => {
    if (!selectedLine) return
    setData((current) => ({ ...current, questlines: current.questlines.map((line) => line.id === selectedLine.id ? { ...line, ...patch } : line) }))
    setDirty(true)
  }

  const updateQuest = (patch: Partial<Quest>) => {
    if (!selectedQuest) return
    setData((current) => ({ ...current, quests: current.quests.map((quest) => quest.id === selectedQuest.id ? { ...quest, ...patch } : quest) }))
    setDirty(true)
  }

  const updateStep = (stepId: string, patch: Partial<QuestStep>) => {
    setData((current) => ({ ...current, steps: current.steps.map((step) => step.id === stepId ? { ...step, ...patch } : step) }))
    setDirty(true)
  }

  const updateDialogue = (dialogueId: string, patch: Partial<Dialogue>) => {
    setData((current) => {
      const existing = current.dialogues.find((dialogue) => dialogue.id === dialogueId)
      const previousKey = existing?.key
      const nextKey = patch.key ?? previousKey
      return {
        ...current,
        dialogues: current.dialogues.map((dialogue) => dialogue.id === dialogueId ? { ...dialogue, ...patch } : dialogue),
        steps: previousKey && nextKey && previousKey !== nextKey
          ? current.steps.map((step) =>
            step.payload.dialogue_id === previousKey
              ? { ...step, payload: { ...step.payload, dialogue_id: nextKey } }
              : step)
          : current.steps,
      }
    })
    setDirty(true)
  }

  const updateDialogueLine = (lineId: string, patch: Partial<DialogueLine>) => {
    setData((current) => ({
      ...current,
      dialogueLines: current.dialogueLines.map((line) => line.id === lineId ? { ...line, ...patch } : line),
    }))
    setDirty(true)
  }

  const addDialogueLine = (dialogueId: string, locale = DEFAULT_DIALOGUE_LOCALE) => {
    setData((current) => {
      const siblings = current.dialogueLines.filter((line) => line.dialogue_id === dialogueId && line.locale === locale)
      const nextOrder = siblings.length === 0 ? 0 : Math.max(...siblings.map((line) => line.line_order)) + 1
      const line: DialogueLine = {
        id: makeLocalId('dline'),
        dialogue_id: dialogueId,
        locale,
        line_order: nextOrder,
        content: '',
        line_format: 'plain_text',
      }
      return { ...current, dialogueLines: [...current.dialogueLines, line] }
    })
    setDirty(true)
    notify(t('dialogueLineAdded'))
  }

  const removeDialogueLine = (lineId: string) => {
    setData((current) => {
      const target = current.dialogueLines.find((line) => line.id === lineId)
      if (!target) return current
      const remaining = current.dialogueLines.filter((line) => line.id !== lineId)
      const siblings = remaining
        .filter((line) => line.dialogue_id === target.dialogue_id && line.locale === target.locale)
        .sort((a, b) => a.line_order - b.line_order)
      const orderById = new Map(siblings.map((line, index) => [line.id, index]))
      return {
        ...current,
        dialogueLines: remaining.map((line) => (orderById.has(line.id) ? { ...line, line_order: orderById.get(line.id)! } : line)),
      }
    })
    setDirty(true)
  }

  const moveDialogueLine = (lineId: string, direction: -1 | 1) => {
    setData((current) => {
      const target = current.dialogueLines.find((line) => line.id === lineId)
      if (!target) return current
      const siblings = current.dialogueLines
        .filter((line) => line.dialogue_id === target.dialogue_id && line.locale === target.locale)
        .sort((a, b) => a.line_order - b.line_order)
      const index = siblings.findIndex((line) => line.id === lineId)
      const swapWith = siblings[index + direction]
      if (!swapWith) return current
      return {
        ...current,
        dialogueLines: current.dialogueLines.map((line) => {
          if (line.id === target.id) return { ...line, line_order: swapWith.line_order }
          if (line.id === swapWith.id) return { ...line, line_order: target.line_order }
          return line
        }),
      }
    })
    setDirty(true)
  }

  const createDialogue = (options?: { speaker?: string | null; baseKey?: string; attachToStepId?: string }) => {
    setData((current) => {
      const key = uniqueDialogueKey(current, options?.baseKey ?? 'new_dialogue')
      const dialogue: Dialogue = {
        id: makeLocalId('dialogue'),
        key,
        speaker_external_id: options?.speaker ?? selectedQuest?.giver_external_id ?? null,
        source_path: null,
        source_metadata: { local_draft: true },
      }
      const line: DialogueLine = {
        id: makeLocalId('dline'),
        dialogue_id: dialogue.id,
        locale: DEFAULT_DIALOGUE_LOCALE,
        line_order: 0,
        content: '',
        line_format: 'plain_text',
      }
      return {
        ...current,
        dialogues: [...current.dialogues, dialogue],
        dialogueLines: [...current.dialogueLines, line],
        steps: options?.attachToStepId
          ? current.steps.map((step) =>
            step.id === options.attachToStepId
              ? { ...step, payload: { ...step.payload, dialogue_id: key } }
              : step)
          : current.steps,
      }
    })
    setDirty(true)
    notify(t('dialogueCreated'))
  }

  const createDialogueForStep = (stepId: string) => {
    createDialogue({
      baseKey: `${selectedQuest?.key ?? 'quest'}_dialogue`,
      speaker: selectedQuest?.giver_external_id ?? null,
      attachToStepId: stepId,
    })
  }

  const updateMinigame = (minigameId: string, patch: Partial<EditorData['minigames'][number]>) => {
    setData((current) => ({
      ...current,
      minigames: current.minigames.map((minigame) => minigame.id === minigameId ? { ...minigame, ...patch } : minigame),
    }))
    setDirty(true)
  }

  const togglePrerequisite = (questId: string, prerequisiteQuestId: string, enabled: boolean) => {
    setData((current) => {
      const exists = current.prerequisites.some(
        (edge) => edge.quest_id === questId && edge.prerequisite_quest_id === prerequisiteQuestId,
      )
      if (enabled && !exists) {
        return {
          ...current,
          prerequisites: [...current.prerequisites, { quest_id: questId, prerequisite_quest_id: prerequisiteQuestId }],
        }
      }
      if (!enabled && exists) {
        return {
          ...current,
          prerequisites: current.prerequisites.filter(
            (edge) => !(edge.quest_id === questId && edge.prerequisite_quest_id === prerequisiteQuestId),
          ),
        }
      }
      return current
    })
    setDirty(true)
  }

  const addReward = (scope: 'quest' | 'step', parentId: string) => {
    const reward: QuestReward = {
      id: makeLocalId('reward'),
      scope,
      quest_id: scope === 'quest' ? parentId : null,
      step_id: scope === 'step' ? parentId : null,
      reward_type: 'xp',
      xp_amount: 50,
      item_external_id: null,
      amount: null,
      source_metadata: { local_draft: true },
    }
    setData((current) => ({ ...current, rewards: [...current.rewards, reward] }))
    setDirty(true)
  }

  const updateReward = (rewardId: string, patch: Partial<QuestReward>) => {
    setData((current) => ({
      ...current,
      rewards: current.rewards.map((reward) => reward.id === rewardId ? { ...reward, ...patch } : reward),
    }))
    setDirty(true)
  }

  const removeReward = (rewardId: string) => {
    setData((current) => ({ ...current, rewards: current.rewards.filter((reward) => reward.id !== rewardId) }))
    setDirty(true)
  }

  const addQuest = () => {
    if (!selectedLine) return
    const quests = getQuestlineQuests(data, selectedLine.id)
    const position = quests.length
    const newQuest: Quest = {
      id: makeLocalId('quest'),
      questline_id: selectedLine.id,
      key: `q${String(position + 1).padStart(2, '0')}_new_quest`,
      position,
      name: t('newLearningQuest'),
      level_required: Math.max(1, position + 1),
      giver_external_id: selectedLine.default_giver_external_id,
      summary: t('describeLearnerGoal'),
      status: 'draft',
      source_path: null,
      source_metadata: { local_draft: true },
    }
    setData((current) => ({ ...current, quests: [...current.quests, newQuest] }))
    setSelectedQuestId(newQuest.id)
    setDirty(true)
    notify(t('draftQuestAdded'))
  }

  const addStep = () => {
    if (!selectedQuest) return
    const steps = getQuestSteps(data, selectedQuest.id)
    const position = steps.length
    const newStep: QuestStep = {
      id: makeLocalId('step'),
      quest_id: selectedQuest.id,
      key: `${selectedQuest.key}_step_${String(position + 1).padStart(2, '0')}`,
      position,
      step_type: 'talk_to_npc',
      payload: { npc_id: selectedQuest.giver_external_id ?? 'teacher_maya', dialogue_id: '' },
      source_metadata: { local_draft: true, source_position: position },
    }
    setData((current) => ({ ...current, steps: [...current.steps, newStep] }))
    setSelectedStepId(newStep.id)
    setDirty(true)
    notify(t('learningStepAdded'))
  }

  const createQuestline = (name: string, key: string, theme: string) => {
    const line: Questline = {
      id: makeLocalId('questline'),
      key: key || slugify(name),
      display_name: name || t('untitledQuestline'),
      theme: theme || null,
      default_giver_external_id: 'teacher_maya',
      status: 'draft',
      level_min: 1,
      level_max: null,
      source_path: null,
      source_metadata: { local_draft: true },
    }
    setData((current) => ({ ...current, questlines: [...current.questlines, line] }))
    setSelectedQuestlineId(line.id)
    setSelectedQuestId('')
    setSelectedStepId('')
    setShowNewQuestline(false)
    setDirty(true)
    notify(t('questlineDraftCreated'))
  }

  const persistDraft = async (): Promise<EditorData> => {
    if (!selectedLine) return data
    const lineToSave: Questline = { ...selectedLine, status: 'draft' }
    const questsToSave = getQuestlineQuests(data, selectedLine.id)
    const stepsToSave = data.steps.filter((step) => questsToSave.some((quest) => quest.id === step.quest_id))

    if (!supabase || demoMode) {
      const localData = {
        ...data,
        questlines: data.questlines.map((line) => line.id === lineToSave.id ? lineToSave : line),
      }
      setData(localData)
      setDirty(false)
      return localData
    }

    const linePayload = {
      key: lineToSave.key,
      display_name: lineToSave.display_name,
      theme: lineToSave.theme,
      default_giver_external_id: lineToSave.default_giver_external_id,
      status: 'draft',
      level_min: lineToSave.level_min,
      level_max: lineToSave.level_max,
      source_path: lineToSave.source_path,
      source_metadata: lineToSave.source_metadata,
      updated_by: user?.id ?? null,
    }
    let savedLineId = lineToSave.id
    if (isLocalId(lineToSave.id)) {
      const { data: insertedLine, error } = await supabase.from('questlines').insert({ ...linePayload, created_by: user?.id ?? null }).select('*').single()
      if (error) throw error
      savedLineId = insertedLine.id
    } else {
      const { error } = await supabase.from('questlines').update(linePayload).eq('id', lineToSave.id)
      if (error) throw error
    }

    const questIdMap = new Map<string, string>()
    for (const quest of questsToSave) {
      const questPayload = {
        questline_id: savedLineId,
        key: quest.key,
        position: quest.position,
        name: quest.name,
        level_required: quest.level_required,
        giver_external_id: quest.giver_external_id,
        summary: quest.summary,
        status: quest.status === 'published' ? 'draft' : quest.status,
        source_path: quest.source_path,
        source_metadata: quest.source_metadata,
        updated_by: user?.id ?? null,
      }
      if (isLocalId(quest.id)) {
        const { data: insertedQuest, error } = await supabase.from('quests').insert({ ...questPayload, created_by: user?.id ?? null }).select('*').single()
        if (error) throw error
        questIdMap.set(quest.id, insertedQuest.id)
      } else {
        const { error } = await supabase.from('quests').update(questPayload).eq('id', quest.id)
        if (error) throw error
        questIdMap.set(quest.id, quest.id)
      }
    }

    const stepIdMap = new Map<string, string>()
    for (const step of stepsToSave) {
      const stepPayload = {
        quest_id: questIdMap.get(step.quest_id) ?? step.quest_id,
        key: step.key,
        position: step.position,
        step_type: step.step_type,
        payload: step.payload,
        source_metadata: step.source_metadata,
      }
      if (isLocalId(step.id)) {
        const { data: insertedStep, error } = await supabase.from('quest_steps').insert(stepPayload).select('*').single()
        if (error) throw error
        stepIdMap.set(step.id, insertedStep.id)
      } else {
        const { error } = await supabase.from('quest_steps').update(stepPayload).eq('id', step.id)
        if (error) throw error
        stepIdMap.set(step.id, step.id)
      }
    }

    const questIdsInLine = new Set(questsToSave.map((quest) => quest.id))
    const stepIdsInLine = new Set(stepsToSave.map((step) => step.id))
    const savedQuestIds = [...questIdMap.values()]
    const savedStepIds = [...stepIdMap.values()]

    if (savedQuestIds.length) {
      const { error: questPrerequisiteDeleteError } = await supabase
        .from('quest_prerequisites')
        .delete()
        .in('quest_id', savedQuestIds)
      if (questPrerequisiteDeleteError) throw questPrerequisiteDeleteError
      const { error: prerequisiteQuestDeleteError } = await supabase
        .from('quest_prerequisites')
        .delete()
        .in('prerequisite_quest_id', savedQuestIds)
      if (prerequisiteQuestDeleteError) throw prerequisiteQuestDeleteError
    }

    const prerequisiteRows = data.prerequisites
      .filter((edge) => questIdsInLine.has(edge.quest_id) || questIdsInLine.has(edge.prerequisite_quest_id))
      .map((edge) => ({
        quest_id: questIdMap.get(edge.quest_id) ?? edge.quest_id,
        prerequisite_quest_id: questIdMap.get(edge.prerequisite_quest_id) ?? edge.prerequisite_quest_id,
      }))
    if (prerequisiteRows.length) {
      const { error } = await supabase.from('quest_prerequisites').insert(prerequisiteRows)
      if (error) throw error
    }

    if (savedQuestIds.length) {
      const { error: questRewardDeleteError } = await supabase
        .from('quest_rewards')
        .delete()
        .in('quest_id', savedQuestIds)
      if (questRewardDeleteError) throw questRewardDeleteError
    }
    if (savedStepIds.length) {
      const { error: stepRewardDeleteError } = await supabase
        .from('quest_rewards')
        .delete()
        .in('step_id', savedStepIds)
      if (stepRewardDeleteError) throw stepRewardDeleteError
    }

    const rewardRows = data.rewards
      .filter((reward) =>
        (reward.scope === 'quest' && reward.quest_id !== null && questIdsInLine.has(reward.quest_id))
        || (reward.scope === 'step' && reward.step_id !== null && stepIdsInLine.has(reward.step_id)),
      )
      .map((reward) => ({
        scope: reward.scope,
        quest_id: reward.quest_id ? questIdMap.get(reward.quest_id) ?? reward.quest_id : null,
        step_id: reward.step_id ? stepIdMap.get(reward.step_id) ?? reward.step_id : null,
        reward_type: reward.reward_type,
        xp_amount: reward.xp_amount,
        item_external_id: reward.item_external_id,
        amount: reward.amount,
        source_metadata: reward.source_metadata,
      }))
    if (rewardRows.length) {
      const { error } = await supabase.from('quest_rewards').insert(rewardRows)
      if (error) throw error
    }

    const dialogueIdMap = new Map<string, string>()
    for (const dialogue of data.dialogues) {
      const dialoguePayload = {
        key: dialogue.key,
        speaker_external_id: dialogue.speaker_external_id,
        source_path: dialogue.source_path,
        source_metadata: dialogue.source_metadata,
      }
      if (isLocalId(dialogue.id)) {
        const { data: insertedDialogue, error } = await supabase.from('dialogues').insert(dialoguePayload).select('*').single()
        if (error) throw error
        dialogueIdMap.set(dialogue.id, insertedDialogue.id)
      } else {
        const { error } = await supabase.from('dialogues').update(dialoguePayload).eq('id', dialogue.id)
        if (error) throw error
        dialogueIdMap.set(dialogue.id, dialogue.id)
      }
    }

    const savedDialogueIds = [...dialogueIdMap.values()]
    if (savedDialogueIds.length) {
      const { error: dialogueLineDeleteError } = await supabase
        .from('dialogue_lines')
        .delete()
        .in('dialogue_id', savedDialogueIds)
      if (dialogueLineDeleteError) throw dialogueLineDeleteError
    }

    const dialogueLineRows = data.dialogueLines.map((line) => ({
      dialogue_id: dialogueIdMap.get(line.dialogue_id) ?? line.dialogue_id,
      locale: line.locale,
      line_order: line.line_order,
      content: line.content,
      line_format: line.line_format,
    }))
    if (dialogueLineRows.length) {
      const { error: dialogueLineError } = await supabase.from('dialogue_lines').insert(dialogueLineRows)
      if (dialogueLineError) throw dialogueLineError
    }

    const { error: minigameError } = await supabase.from('minigame_instances').upsert(
      data.minigames.map((minigame) => ({
        id: minigame.id,
        key: minigame.key,
        locale: minigame.locale,
        instruction: minigame.instruction,
        tasks: minigame.tasks,
        target: minigame.target,
        variant: minigame.variant,
        success: minigame.success,
        source_path: minigame.source_path,
        source_metadata: minigame.source_metadata,
      })),
      { onConflict: 'id' },
    )
    if (minigameError) throw minigameError

    const loaded = await loadEditorData()
    const savedLine = loaded.questlines.find((line) => line.key === lineToSave.key)
    setData(loaded)
    if (savedLine) setSelectedQuestlineId(savedLine.id)
    setDirty(false)
    return loaded
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      await persistDraft()
      notify(t('draftSaved'))
    } catch (error) {
      notify(error instanceof Error ? error.message : t('couldNotSave'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!selectedLine) return
    const blocking = issues.filter((issue) => issue.severity === 'error')
    if (blocking.length) {
      notify(t('fixBeforePublish'), 'error')
      return
    }
    setPublishing(true)
    try {
      const savedData = dirty ? await persistDraft() : data
      const currentLine = savedData.questlines.find((line) => line.key === selectedLine.key) ?? selectedLine
      const document = buildSnapshotDocument(savedData, currentLine)
      const version = Math.max(0, ...savedData.revisions.filter((revision) => revision.questline_id === currentLine.id).map((revision) => revision.version)) + 1
      const validationSummary = { error_count: 0, warning_count: issues.filter((issue) => issue.severity === 'warning').length, editor_publish: true }
      if (supabase && !demoMode) {
        const publishedAt = new Date().toISOString()
        const { error: revisionError } = await supabase.from('questline_revisions').insert({ questline_id: currentLine.id, version, schema_version: 1, status: 'published', document, validation_summary: validationSummary, created_by: user?.id ?? null, published_at: publishedAt })
        if (revisionError) throw revisionError
        const { error: lineError } = await supabase.from('questlines').update({ status: 'published', updated_by: user?.id ?? null }).eq('id', currentLine.id)
        if (lineError) throw lineError
        const { error: auditError } = await supabase.from('audit_log').insert({ user_id: user?.id ?? null, action: 'publish', entity_type: 'questline', entity_id: currentLine.id, details: { version } })
        if (auditError) throw auditError
        const loaded = await loadEditorData()
        setData(loaded)
      } else {
        const publishedLine = { ...currentLine, status: 'published' as const }
        const revision: QuestlineRevision = { id: makeLocalId('revision'), questline_id: currentLine.id, version, schema_version: 1, status: 'published', document, validation_summary: validationSummary, created_at: new Date().toISOString(), published_at: new Date().toISOString() }
        setData((current) => ({ ...current, questlines: current.questlines.map((line) => line.id === currentLine.id ? publishedLine : line), revisions: [...current.revisions, revision] }))
      }
      setDirty(false)
      notify(t('publishedRevision', { name: currentLine.display_name, version }))
    } catch (error) {
      notify(error instanceof Error ? error.message : t('couldNotPublish'), 'error')
    } finally {
      setPublishing(false)
    }
  }

  useEffect(() => {
    if (!dirty || demoMode || !selectedLine || publishing || autoSaveInFlight.current) return
    const timeout = window.setTimeout(() => {
      autoSaveInFlight.current = true
      setSaving(true)
      void persistDraft()
        .catch((error: unknown) => {
          notify(error instanceof Error ? t('autoSaveFailedDetail', { message: error.message }) : t('autoSaveFailed'), 'error')
        })
        .finally(() => {
          autoSaveInFlight.current = false
          setSaving(false)
        })
    }, 1400)
    return () => window.clearTimeout(timeout)
  }, [data, dirty, demoMode, publishing, selectedLine])

  const signInRequired = hasSupabaseConfig && !user
  const navItems = getNavItems(t)
  if (!authReady) return <main className="loading-screen"><div className="brand-mark">Q</div><span>{t('loadingWorkspace')}</span></main>
  if (signInRequired) return <AuthScreen onSignIn={signIn} onSignUp={signUp} />
  if (!demoMode && user && data.questlines.length === 0) {
    return <AccessRequired email={user.email} message={loadError || undefined} onSignOut={signOut} onRetryJoin={ensureMembership} />
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand"><div className="brand-mark">Q</div><div><strong>{t('brandName')}</strong><span>{t('brandTagline')}</span></div></div>
        <div className="workspace-switcher"><span className="workspace-avatar">EK</span><span><small>{t('workspaceLabel')}</small><strong>{t('workspaceName')}</strong></span><Icon name="chevron" /></div>
        <nav className="main-nav" aria-label={t('navMainAria')}>{navItems.map((item) => <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => setView(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'editor' && dirty && <i className="nav-dirty-dot" />}</button>)}</nav>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label">{t('workspaceLabel')}</div>
        <button className={`main-nav settings-link ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><Icon name="settings" /><span>{t('navSettings')}</span></button>
        <div className="sidebar-spacer" />
        <div className={`connection-card ${demoMode ? 'demo' : ''}`}><span className="connection-dot" /><div><strong>{demoMode ? t('previewMode') : t('supabaseConnected')}</strong><small>{demoMode ? t('addEnvKeys') : t('rlsProtected')}</small></div></div>
        {user && <button className="user-card" onClick={() => void signOut()}><span className="user-avatar">{(user.email?.slice(0, 1) ?? 'U').toUpperCase()}</span><span><strong>{user.email ?? t('editorFallback')}</strong><small>{t('signOut')}</small></span><Icon name="logout" /></button>}
      </aside>
      <div className="app-body">
        <header className="topbar"><div className="breadcrumbs"><span>{t('workspaceName')}</span><Icon name="chevron" /><strong>{view === 'editor' ? t('navEditor') : view === 'overview' ? t('navOverview') : view === 'library' ? t('navLibrary') : view === 'preview' ? t('navPreview') : t('navSettings')}</strong></div><div className="topbar-actions"><div className={`save-state ${dirty ? 'dirty' : ''}`}><span />{dirty ? t('unsavedChanges') : t('allChangesSaved')}</div><button className="icon-button top-icon" aria-label={t('undo')} title={t('undo')} disabled={historyIndex.current <= 0} onClick={undo}><Icon name="undo" /></button><button className="icon-button top-icon" aria-label={t('redo')} title={t('redo')} disabled={historyIndex.current >= history.current.length - 1} onClick={redo}><Icon name="redo" /></button><button className="icon-button top-icon" aria-label={t('search')} title={t('search')}><Icon name="search" /></button><span className="top-avatar">{(user?.email?.slice(0, 1) ?? 'E').toUpperCase()}</span></div></header>
        {loadError && <div className="global-error"><Icon name="warning" /> {loadError}</div>}
        {demoMode && <div className="demo-banner"><Icon name="spark" /><span>{t('demoBanner')}</span><span className="demo-banner-note">{t('demoBannerNote')}</span></div>}
        {view === 'overview' && <Overview data={data} onOpenEditor={(lineId) => { if (lineId) setSelectedQuestlineId(lineId); setView('editor') }} />}
        {view === 'library' && (
          <Library
            data={data}
            onUpdateDialogue={updateDialogue}
            onUpdateDialogueLine={updateDialogueLine}
            onAddDialogueLine={addDialogueLine}
            onRemoveDialogueLine={removeDialogueLine}
            onMoveDialogueLine={moveDialogueLine}
            onCreateDialogue={() => createDialogue()}
            onUpdateMinigame={updateMinigame}
          />
        )}
        {view === 'preview' && <Preview data={data} line={selectedLine} quest={selectedQuest} onSelectQuest={setSelectedQuestId} />}
        {view === 'settings' && <Settings data={data} demoMode={demoMode} />}
        {view === 'editor' && (
          <div className="editor-layout">
            <QuestlineRail
              data={data}
              selectedQuestlineId={selectedQuestlineId}
              onSelect={(id) => { setSelectedQuestlineId(id); setSelectedQuestId(''); setSelectedStepId('') }}
              onNew={() => setShowNewQuestline(true)}
            />
            <GraphPanel
              data={data}
              line={selectedLine ?? data.questlines[0]}
              quests={lineQuests}
              selectedQuestId={selectedQuestId}
              onSelectQuest={(id) => { setSelectedQuestId(id); setSelectedStepId('') }}
              onAddQuest={addQuest}
            />
            <QuestInspector
              data={data}
              line={selectedLine ?? data.questlines[0]}
              quest={selectedQuest}
              selectedStepId={selectedStepId}
              issues={issues}
              onUpdateLine={updateLine}
              onUpdateQuest={updateQuest}
              onUpdateStep={updateStep}
              onSelectStep={setSelectedStepId}
              onAddStep={addStep}
              onTogglePrerequisite={(prerequisiteQuestId, enabled) => selectedQuest && togglePrerequisite(selectedQuest.id, prerequisiteQuestId, enabled)}
              onAddReward={addReward}
              onUpdateReward={updateReward}
              onRemoveReward={removeReward}
              onUpdateDialogue={updateDialogue}
              onUpdateDialogueLine={updateDialogueLine}
              onAddDialogueLine={addDialogueLine}
              onRemoveDialogueLine={removeDialogueLine}
              onMoveDialogueLine={moveDialogueLine}
              onCreateDialogueForStep={createDialogueForStep}
            />
          </div>
        )}
        {view === 'editor' && <div className="editor-bottom"><ValidationPanel issues={issues} /><div className="bottom-actions"><button className="button subtle" onClick={() => setView('preview')}><Icon name="eye" /> {t('preview')}</button><button className="button subtle" onClick={() => void saveDraft()} disabled={saving || !dirty}><Icon name="save" /> {saving ? t('saving') : t('saveDraft')}</button><button className="button primary" onClick={() => setShowPublishConfirm(true)} disabled={publishing || issues.some((issue) => issue.severity === 'error')}><Icon name="spark" /> {publishing ? t('publishing') : t('publishSnapshot')}</button></div></div>}
      </div>
      {showNewQuestline && <NewQuestlineModal onClose={() => setShowNewQuestline(false)} onCreate={createQuestline} />}
      {showPublishConfirm && <PublishConfirmModal warningCount={issues.filter((issue) => issue.severity === 'warning').length} busy={publishing} onClose={() => setShowPublishConfirm(false)} onConfirm={() => { setShowPublishConfirm(false); void publish() }} />}
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}

export default App
