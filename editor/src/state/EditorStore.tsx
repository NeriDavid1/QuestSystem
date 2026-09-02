import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useT } from '../i18n'
import type {
  Dialogue,
  DialogueLine,
  EditorData,
  MinigameInstance,
  Quest,
  QuestPrerequisite,
  QuestReward,
  QuestStep,
  Questline,
  QuestlineRevision,
  ValidationIssue,
} from '../lib/types'
import { emptyEditorData } from '../lib/types'
import { hasSupabaseConfig, loadEditorData, supabase } from '../lib/supabase'
import { createDemoData } from '../lib/demoData'
import {
  defaultParamsForEntry,
  getMinigameCatalogEntry,
  getMinigameVariantsForEntry,
} from '../lib/minigameParams'
import {
  DEFAULT_DIALOGUE_LOCALE,
  allocateQuestKey,
  allocateStepKey,
  getDialogueLines,
  getQuestSteps,
  getQuestlineQuests,
  getStepMinigame,
  getStepMinigameKey,
  makeLocalId,
  normalizeContentKey,
  refreshDraftQuestKey,
  slugify,
  suggestDialogueBaseKey,
  suggestQuestBaseKey,
  suggestStepKey,
  uniqueDialogueKey,
  uniqueExactKey,
  uniqueKey,
  uniqueMinigameKey,
  uniqueQuestKey,
  uniqueQuestlineKey,
} from '../lib/editorData'
import { validateQuestline } from '../lib/validation'
import { importBundleIntoLine } from '../lib/bundleImport'
import {
  SaveConflictError,
  deleteQuestlines,
  publishQuestline,
  saveQuestlineDraft,
  signIn as persistenceSignIn,
  signOut as persistenceSignOut,
  signUp as persistenceSignUp,
  type QuestlineSavePayload,
  type SaveResult,
} from '../lib/persistence'

export type View = 'overview' | 'editor' | 'library' | 'preview' | 'settings'
export type LibraryTab = 'catalog' | 'dialogues' | 'minigames'

export interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  tone: 'danger' | 'primary'
  onConfirm: () => void
}

interface ToastState {
  message: string
  tone: 'success' | 'error'
}

interface EditorStoreValue {
  demoMode: boolean
  data: EditorData
  user: { id: string; email?: string } | null
  authReady: boolean
  view: View
  setView: (view: View) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  selectedQuestlineId: string
  selectedQuestId: string
  selectedStepId: string
  setSelectedQuestlineId: (id: string) => void
  setSelectedQuestId: (id: string) => void
  setSelectedStepId: (id: string) => void
  selectedLine: Questline | undefined
  lineQuests: Quest[]
  selectedQuest: Quest | undefined
  questSteps: QuestStep[]
  issues: ValidationIssue[]
  dirty: boolean
  saving: boolean
  publishing: boolean
  toast: ToastState | null
  loadError: string
  history: { canUndo: boolean; canRedo: boolean }
  undo: () => void
  redo: () => void
  notify: (message: string, tone?: 'success' | 'error') => void
  confirmState: ConfirmState | null
  openConfirm: (state: ConfirmState) => void
  closeConfirm: () => void
  conflictState: boolean
  closeConflict: () => void
  showNewQuestline: boolean
  setShowNewQuestline: (open: boolean) => void
  showPublishConfirm: boolean
  setShowPublishConfirm: (open: boolean) => void
  showSearch: boolean
  setShowSearch: (open: boolean) => void
  showRevisions: boolean
  setShowRevisions: (open: boolean) => void
  showTemplates: boolean
  setShowTemplates: (open: boolean) => void
  libraryTab: LibraryTab
  setLibraryTab: (tab: LibraryTab) => void
  updateLine: (patch: Partial<Questline>) => void
  updateQuest: (patch: Partial<Quest>) => void
  updateStep: (stepId: string, patch: Partial<QuestStep>) => void
  updateDialogue: (dialogueId: string, patch: Partial<Dialogue>) => void
  updateDialogueLine: (lineId: string, patch: Partial<DialogueLine>) => void
  addDialogueLine: (dialogueId: string, locale?: string) => void
  removeDialogueLine: (lineId: string) => void
  moveDialogueLine: (lineId: string, direction: -1 | 1) => void
  createDialogue: (options?: {
    speaker?: string | null
    baseKey?: string
    attachToStepId?: string
    attachToQuestId?: string
    questSlot?: 'start' | 'turn_in'
  }) => void
  createDialogueForStep: (stepId: string) => void
  createDialogueForQuest: (questId: string, slot: 'start' | 'turn_in') => void
  createMinigameForStep: (stepId: string) => void
  updateMinigame: (minigameId: string, patch: Partial<MinigameInstance>) => void
  togglePrerequisite: (questId: string, prerequisiteQuestId: string, enabled: boolean) => void
  addReward: (scope: 'quest' | 'step', parentId: string) => void
  updateReward: (rewardId: string, patch: Partial<QuestReward>) => void
  removeReward: (rewardId: string) => void
  addQuest: () => void
  addStep: () => void
  createQuestline: (name: string, key: string, theme: string) => void
  removeQuestline: (questlineId: string) => void
  removeQuest: (questId: string) => void
  removeStep: (stepId: string) => void
  removeDialogue: (dialogueId: string) => void
  removeMinigame: (minigameId: string) => void
  duplicateQuest: (questId: string) => void
  duplicateStep: (stepId: string) => void
  duplicateDialogue: (dialogueId: string) => void
  duplicateQuestline: (questlineId: string) => void
  moveQuest: (questId: string, direction: -1 | 1) => void
  moveStep: (stepId: string, direction: -1 | 1) => void
  saveDraft: (options?: { force?: boolean }) => Promise<void>
  publish: () => Promise<void>
  retryJoin: () => Promise<void>
  handleSignIn: (email: string, password: string) => Promise<void>
  handleSignUp: (email: string, password: string) => Promise<void>
  handleSignOut: () => Promise<void>
  revisionsForLine: (questlineId: string) => QuestlineRevision[]
  restoreRevisionAsDraft: (revision: QuestlineRevision) => void
  createQuestFromTemplate: (kind: 'blank' | 'adventure') => void
  importBundle: (bundle: unknown, sourceKey?: string) => void
  forceSaveAfterConflict: () => Promise<void>
}

const EditorStoreContext = createContext<EditorStoreValue | null>(null)

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nextPosition(items: Array<{ position: number }>): number {
  return items.length === 0 ? 0 : Math.max(...items.map((item) => item.position)) + 1
}

export function EditorStoreProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const demoMode = !hasSupabaseConfig
  const [data, setData] = useState<EditorData>(() => (demoMode ? createDemoData() : emptyEditorData()))
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authReady, setAuthReady] = useState(demoMode)
  const [selectedQuestlineId, setSelectedQuestlineId] = useState(demoMode ? 'demo-ql-adjective' : '')
  const [selectedQuestId, setSelectedQuestId] = useState('')
  const [selectedStepId, setSelectedStepId] = useState('')
  const [view, setView] = useState<View>('editor')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('questforge.sidebarCollapsed') === '1'
    } catch {
      return false
    }
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [showNewQuestline, setShowNewQuestline] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showRevisions, setShowRevisions] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('catalog')
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [conflictState, setConflictState] = useState(false)

  const history = useRef<EditorData[]>([])
  const historyIndex = useRef(-1)
  const restoringHistory = useRef(false)
  const autoSaveInFlight = useRef(false)
  /** When set to the current data generation, auto-save will not retry until the user edits again. */
  const autoSaveFailedGeneration = useRef<number | null>(null)
  const dataGeneration = useRef(0)
  const toastTimer = useRef<number | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  // Scoped-save tracking: shared rows the user created/edited/deleted this session.
  const touchedDialogueIds = useRef(new Set<string>())
  const touchedMinigameIds = useRef(new Set<string>())
  const deletedQuestlineIds = useRef<string[]>([])
  const deletedQuestIds = useRef<string[]>([])
  const deletedStepIds = useRef<string[]>([])
  const deletedDialogueIds = useRef<string[]>([])
  const deletedMinigameIds = useRef<string[]>([])
  const questlineVersions = useRef<Record<string, string>>({})

  // --- History tracking ---
  useEffect(() => {
    dataGeneration.current += 1
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

  const undo = useCallback(() => {
    if (historyIndex.current <= 0) return
    historyIndex.current -= 1
    restoringHistory.current = true
    setData(history.current[historyIndex.current])
    setDirty(true)
    setHistoryVersion((value) => value + 1)
  }, [])

  const redo = useCallback(() => {
    if (historyIndex.current >= history.current.length - 1) return
    historyIndex.current += 1
    restoringHistory.current = true
    setData(history.current[historyIndex.current])
    setDirty(true)
    setHistoryVersion((value) => value + 1)
  }, [])

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
  }, [undo, redo])

  // --- Auth + initial load ---
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
      questlineVersions.current = Object.fromEntries(
        loaded.questlines.map((line) => [line.id, line.updated_at ?? '']),
      )
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
  }, [t])

  // --- Selection sanity effects ---
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

  const rawIssues = useMemo(
    () => validateQuestline(data, selectedLine, t),
    [data, selectedLine, t],
  )
  const [issues, setIssues] = useState<ValidationIssue[]>(rawIssues)
  useEffect(() => {
    const timeout = window.setTimeout(() => setIssues(rawIssues), 150)
    return () => window.clearTimeout(timeout)
  }, [rawIssues])

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setToast({ message, tone })
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      toastTimer.current = null
    }, 3600)
  }, [])

  const openConfirm = useCallback((state: ConfirmState) => setConfirmState(state), [])
  const closeConfirm = useCallback(() => setConfirmState(null), [])
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed
      try {
        window.localStorage.setItem('questforge.sidebarCollapsed', next ? '1' : '0')
      } catch {
        // storage unavailable — ignore
      }
      return next
    })
  }, [])
  const closeConflict = useCallback(() => {
    setConflictState(false)
  }, [])

  // --- Mutations ---
  const updateLine = useCallback((patch: Partial<Questline>) => {
    if (!selectedLine) return
    setData((current) => ({
      ...current,
      questlines: current.questlines.map((line) => (line.id === selectedLine.id ? { ...line, ...patch } : line)),
    }))
    setDirty(true)
  }, [selectedLine])

  const updateQuest = useCallback((patch: Partial<Quest>) => {
    if (!selectedQuest || !selectedLine) return
    setData((current) => {
      const existing = current.quests.find((quest) => quest.id === selectedQuest.id)
      if (!existing) return current
      let nextPatch = { ...patch }
      if (patch.key !== undefined) {
        nextPatch.key = uniqueQuestKey(current, patch.key || existing.key, existing.id)
      } else if (patch.name !== undefined && patch.name !== existing.name) {
        const refreshed = refreshDraftQuestKey(
          current,
          { ...existing, ...nextPatch },
          selectedLine.key,
          patch.name,
        )
        if (refreshed) nextPatch.key = refreshed
      }
      return {
        ...current,
        quests: current.quests.map((quest) => (quest.id === selectedQuest.id ? { ...quest, ...nextPatch } : quest)),
      }
    })
    setDirty(true)
  }, [selectedLine, selectedQuest])

  const updateStep = useCallback((stepId: string, patch: Partial<QuestStep>) => {
    setData((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    }))
    setDirty(true)
  }, [])

  const updateDialogue = useCallback((dialogueId: string, patch: Partial<Dialogue>) => {
    touchedDialogueIds.current.add(dialogueId)
    setData((current) => {
      const existing = current.dialogues.find((dialogue) => dialogue.id === dialogueId)
      if (!existing) return current
      const resolvedPatch = patch.key !== undefined
        ? { ...patch, key: uniqueDialogueKey(current, patch.key || existing.key, dialogueId) }
        : patch
      const previousKey = existing.key
      const nextKey = resolvedPatch.key ?? previousKey
      const rewriteKey = Boolean(previousKey && nextKey && previousKey !== nextKey)
      return {
        ...current,
        dialogues: current.dialogues.map((dialogue) => (dialogue.id === dialogueId ? { ...dialogue, ...resolvedPatch } : dialogue)),
        steps: rewriteKey
          ? current.steps.map((step) =>
            step.payload.dialogue_id === previousKey
              ? { ...step, payload: { ...step.payload, dialogue_id: nextKey } }
              : step)
          : current.steps,
        quests: rewriteKey
          ? current.quests.map((quest) => ({
            ...quest,
            start_dialogue_id: quest.start_dialogue_id === previousKey ? nextKey! : quest.start_dialogue_id,
            turn_in_dialogue_id: quest.turn_in_dialogue_id === previousKey ? nextKey! : quest.turn_in_dialogue_id,
          }))
          : current.quests,
      }
    })
    setDirty(true)
  }, [])

  const updateDialogueLine = useCallback((lineId: string, patch: Partial<DialogueLine>) => {
    setData((current) => {
      const target = current.dialogueLines.find((line) => line.id === lineId)
      if (target) touchedDialogueIds.current.add(target.dialogue_id)
      return {
        ...current,
        dialogueLines: current.dialogueLines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
      }
    })
    setDirty(true)
  }, [])

  const addDialogueLine = useCallback((dialogueId: string, locale = DEFAULT_DIALOGUE_LOCALE) => {
    touchedDialogueIds.current.add(dialogueId)
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
  }, [notify, t])

  const removeDialogueLine = useCallback((lineId: string) => {
    setData((current) => {
      const target = current.dialogueLines.find((line) => line.id === lineId)
      if (!target) return current
      touchedDialogueIds.current.add(target.dialogue_id)
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
  }, [])

  const moveDialogueLine = useCallback((lineId: string, direction: -1 | 1) => {
    setData((current) => {
      const target = current.dialogueLines.find((line) => line.id === lineId)
      if (!target) return current
      touchedDialogueIds.current.add(target.dialogue_id)
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
  }, [])

  const createDialogue = useCallback((options?: {
    speaker?: string | null
    baseKey?: string
    attachToStepId?: string
    attachToQuestId?: string
    questSlot?: 'start' | 'turn_in'
  }) => {
    setData((current) => {
      const key = uniqueDialogueKey(current, options?.baseKey ?? 'new_dialogue')
      const dialogue: Dialogue = {
        id: makeLocalId('dialogue'),
        key,
        speaker_external_id: options?.speaker ?? selectedQuest?.giver_external_id ?? null,
        source_path: null,
        source_metadata: { local_draft: true },
      }
      touchedDialogueIds.current.add(dialogue.id)
      const line: DialogueLine = {
        id: makeLocalId('dline'),
        dialogue_id: dialogue.id,
        locale: DEFAULT_DIALOGUE_LOCALE,
        line_order: 0,
        content: '',
        line_format: 'plain_text',
      }
      const slotField = options?.questSlot === 'turn_in' ? 'turn_in_dialogue_id' : 'start_dialogue_id'
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
        quests: options?.attachToQuestId
          ? current.quests.map((quest) =>
            quest.id === options.attachToQuestId
              ? { ...quest, [slotField]: key }
              : quest)
          : current.quests,
      }
    })
    setDirty(true)
    notify(t('dialogueCreated'))
  }, [notify, selectedQuest, t])

  const createDialogueForStep = useCallback((stepId: string) => {
    const step = data.steps.find((item) => item.id === stepId)
    const quest = data.quests.find((item) => item.id === step?.quest_id) ?? selectedQuest
    const line = data.questlines.find((item) => item.id === quest?.questline_id)
    // step.key already includes the quest key (e.g. adjective_crown__q01_new_quest_s01)
    const baseKey = suggestDialogueBaseKey(line?.key, step?.key ?? `${quest?.key ?? 'quest'}_step`)
    createDialogue({
      baseKey,
      speaker: quest?.giver_external_id ?? selectedQuest?.giver_external_id ?? null,
      attachToStepId: stepId,
    })
  }, [createDialogue, data.questlines, data.quests, data.steps, selectedQuest])

  const createDialogueForQuest = useCallback((questId: string, slot: 'start' | 'turn_in') => {
    const quest = data.quests.find((item) => item.id === questId)
    const line = data.questlines.find((item) => item.id === quest?.questline_id)
    const baseKey = suggestDialogueBaseKey(
      line?.key,
      quest?.key,
      slot === 'turn_in' ? 'turn_in' : 'start',
    )
    createDialogue({
      baseKey,
      speaker: quest?.giver_external_id ?? selectedQuest?.giver_external_id ?? null,
      attachToQuestId: questId,
      questSlot: slot,
    })
  }, [createDialogue, data.questlines, data.quests, selectedQuest])

  const updateMinigame = useCallback((minigameId: string, patch: Partial<MinigameInstance>) => {
    touchedMinigameIds.current.add(minigameId)
    setData((current) => ({
      ...current,
      minigames: current.minigames.map((minigame) => (minigame.id === minigameId ? { ...minigame, ...patch } : minigame)),
    }))
    setDirty(true)
  }, [])

  const createMinigameForStep = useCallback((stepId: string) => {
    setData((current) => {
      const step = current.steps.find((item) => item.id === stepId)
      if (!step) return current
      const baseMinigame = getMinigameCatalogEntry(current, step)
      const variants = getMinigameVariantsForEntry(baseMinigame)
      const instance: MinigameInstance = {
        id: makeLocalId('minigame'),
        key: uniqueMinigameKey(current, `${selectedQuest?.key ?? 'quest'}_minigame`),
        locale: DEFAULT_DIALOGUE_LOCALE,
        instruction: null,
        tasks: [],
        target: null,
        variant: variants[0] ?? null,
        success: null,
        minigame_id: baseMinigame?.external_id ?? (typeof step.payload.minigame_id === 'string' ? step.payload.minigame_id : null),
        params: defaultParamsForEntry(baseMinigame),
        source_path: null,
        source_metadata: { local_draft: true },
      }
      touchedMinigameIds.current.add(instance.id)
      return {
        ...current,
        minigames: [...current.minigames, instance],
        steps: current.steps.map((item) =>
          item.id === stepId
            ? { ...item, payload: { ...item.payload, instance_id: instance.key, instance_key: instance.key } }
            : item),
      }
    })
    setDirty(true)
    notify(t('minigameCreated'))
  }, [notify, selectedQuest, t])

  const togglePrerequisite = useCallback((questId: string, prerequisiteQuestId: string, enabled: boolean) => {
    setData((current) => {
      const exists = current.prerequisites.some(
        (edge) => edge.quest_id === questId && edge.prerequisite_quest_id === prerequisiteQuestId,
      )
      if (enabled && !exists) {
        return { ...current, prerequisites: [...current.prerequisites, { quest_id: questId, prerequisite_quest_id: prerequisiteQuestId }] }
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
  }, [])

  const addReward = useCallback((scope: 'quest' | 'step', parentId: string) => {
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
  }, [])

  const updateReward = useCallback((rewardId: string, patch: Partial<QuestReward>) => {
    setData((current) => ({
      ...current,
      rewards: current.rewards.map((reward) => (reward.id === rewardId ? { ...reward, ...patch } : reward)),
    }))
    setDirty(true)
  }, [])

  const removeReward = useCallback((rewardId: string) => {
    setData((current) => ({ ...current, rewards: current.rewards.filter((reward) => reward.id !== rewardId) }))
    setDirty(true)
  }, [])

  const addQuest = useCallback(() => {
    if (!selectedLine) return
    const quests = getQuestlineQuests(data, selectedLine.id)
    const position = nextPosition(quests)
    const name = t('newLearningQuest')
    const newQuest: Quest = {
      id: makeLocalId('quest'),
      questline_id: selectedLine.id,
      key: allocateQuestKey(data, selectedLine.key, position, name),
      position,
      name,
      level_required: Math.max(1, position + 1),
      giver_external_id: selectedLine.default_giver_external_id,
      summary: t('describeLearnerGoal'),
      wait_for_npc_turn_in: false,
      start_dialogue_id: null,
      turn_in_dialogue_id: null,
      status: 'draft',
      source_path: null,
      source_metadata: { local_draft: true },
    }
    setData((current) => ({ ...current, quests: [...current.quests, newQuest] }))
    setSelectedQuestId(newQuest.id)
    setDirty(true)
    notify(t('draftQuestAdded'))
  }, [data, notify, selectedLine, t])

  const addStep = useCallback(() => {
    if (!selectedQuest) return
    const steps = getQuestSteps(data, selectedQuest.id)
    const position = nextPosition(steps)
    const newStep: QuestStep = {
      id: makeLocalId('step'),
      quest_id: selectedQuest.id,
      key: allocateStepKey(data, selectedQuest.id, selectedQuest.key, position),
      position,
      step_type: 'talk_to_npc',
      payload: { npc_id: selectedQuest.giver_external_id ?? 'teacher_maya', dialogue_id: '' },
      source_metadata: { local_draft: true, source_position: position },
    }
    setData((current) => ({ ...current, steps: [...current.steps, newStep] }))
    setSelectedStepId(newStep.id)
    setDirty(true)
    notify(t('learningStepAdded'))
  }, [data, notify, selectedQuest, t])

  const createQuestline = useCallback((name: string, key: string, theme: string) => {
    const lineId = makeLocalId('questline')
    setData((current) => {
      const line: Questline = {
        id: lineId,
        key: uniqueQuestlineKey(current, key || slugify(name)),
        display_name: name || t('untitledQuestline'),
        theme: theme || null,
        default_giver_external_id: 'teacher_maya',
        status: 'draft',
        level_min: 1,
        level_max: null,
        source_path: null,
        source_metadata: { local_draft: true },
      }
      return { ...current, questlines: [...current.questlines, line] }
    })
    setSelectedQuestlineId(lineId)
    setSelectedQuestId('')
    setSelectedStepId('')
    setShowNewQuestline(false)
    setDirty(true)
    notify(t('questlineDraftCreated'))
  }, [notify, t])

  // --- New CRUD: delete / duplicate / reorder ---
  const removeQuest = useCallback((questId: string) => {
    setData((current) => {
      const steps = current.steps.filter((step) => step.quest_id === questId)
      deletedQuestIds.current.push(questId)
      for (const step of steps) deletedStepIds.current.push(step.id)
      const stepIds = new Set(steps.map((step) => step.id))
      return {
        ...current,
        quests: current.quests.filter((quest) => quest.id !== questId),
        steps: current.steps.filter((step) => step.quest_id !== questId),
        rewards: current.rewards.filter(
          (reward) => !(reward.quest_id === questId || (reward.step_id !== null && stepIds.has(reward.step_id))),
        ),
        prerequisites: current.prerequisites.filter(
          (edge) => edge.quest_id !== questId && edge.prerequisite_quest_id !== questId,
        ),
      }
    })
    setDirty(true)
    if (selectedQuestId === questId) {
      setSelectedQuestId('')
      setSelectedStepId('')
    }
    notify(t('questDeleted'))
  }, [notify, selectedQuestId, t])

  const removeStep = useCallback((stepId: string) => {
    deletedStepIds.current.push(stepId)
    setData((current) => ({
      ...current,
      steps: current.steps.filter((step) => step.id !== stepId),
      rewards: current.rewards.filter((reward) => !(reward.scope === 'step' && reward.step_id === stepId)),
    }))
    setDirty(true)
    if (selectedStepId === stepId) setSelectedStepId('')
    notify(t('stepDeleted'))
  }, [notify, selectedStepId, t])

  const removeDialogue = useCallback((dialogueId: string) => {
    const dialogue = data.dialogues.find((item) => item.id === dialogueId)
    if (!dialogue) return
    const referencedByStep = data.steps.some((step) => step.payload.dialogue_id === dialogue.key)
    const referencedByQuest = data.quests.some(
      (quest) => quest.start_dialogue_id === dialogue.key || quest.turn_in_dialogue_id === dialogue.key,
    )
    if (referencedByStep || referencedByQuest) {
      notify(t('dialogueInUse'), 'error')
      return
    }
    deletedDialogueIds.current.push(dialogueId)
    touchedDialogueIds.current.delete(dialogueId)
    setData((current) => ({
      ...current,
      dialogues: current.dialogues.filter((item) => item.id !== dialogueId),
      dialogueLines: current.dialogueLines.filter((line) => line.dialogue_id !== dialogueId),
    }))
    setDirty(true)
    notify(t('dialogueDeleted'))
  }, [data, notify, t])

  const removeMinigame = useCallback((minigameId: string) => {
    deletedMinigameIds.current.push(minigameId)
    touchedMinigameIds.current.delete(minigameId)
    setData((current) => ({ ...current, minigames: current.minigames.filter((minigame) => minigame.id !== minigameId) }))
    setDirty(true)
    notify(t('minigameDeleted'))
  }, [notify, t])

  const removeQuestline = useCallback((questlineId: string) => {
    deletedQuestlineIds.current.push(questlineId)
    let nextSelectedId = selectedQuestlineId
    setData((current) => {
      const quests = current.quests.filter((quest) => quest.questline_id === questlineId)
      const questIds = new Set(quests.map((quest) => quest.id))
      for (const quest of quests) deletedQuestIds.current.push(quest.id)
      const stepIds = new Set<string>()
      for (const step of current.steps) {
        if (questIds.has(step.quest_id)) {
          stepIds.add(step.id)
          deletedStepIds.current.push(step.id)
        }
      }
      const remaining = current.questlines.filter((line) => line.id !== questlineId)
      if (selectedQuestlineId === questlineId) {
        nextSelectedId = remaining[0]?.id ?? ''
      }
      return {
        ...current,
        questlines: remaining,
        quests: current.quests.filter((quest) => quest.questline_id !== questlineId),
        steps: current.steps.filter((step) => !questIds.has(step.quest_id)),
        rewards: current.rewards.filter(
          (reward) =>
            !(
              (reward.quest_id !== null && questIds.has(reward.quest_id))
              || (reward.step_id !== null && stepIds.has(reward.step_id))
            ),
        ),
        prerequisites: current.prerequisites.filter(
          (edge) => !questIds.has(edge.quest_id) && !questIds.has(edge.prerequisite_quest_id),
        ),
      }
    })
    setDirty(true)
    if (selectedQuestlineId === questlineId) {
      // Keep a selection when possible so auto-save can still flush the deletion.
      setSelectedQuestlineId(nextSelectedId)
      setSelectedQuestId('')
      setSelectedStepId('')
    }
    notify(t('questlineDeleted'))
  }, [notify, selectedQuestlineId, t])

  const cloneDialogueByKey = useCallback((
    current: EditorData,
    dialogueKey: string,
    cache: Map<string, string>,
  ): { key: string; dialogue?: Dialogue; lines: DialogueLine[] } => {
    const cached = cache.get(dialogueKey)
    if (cached) return { key: cached, lines: [] }

    const source = current.dialogues.find((dialogue) => dialogue.key === dialogueKey)
    if (!source) return { key: dialogueKey, lines: [] }

    const copyId = makeLocalId('dialogue')
    const usedKeys = [...current.dialogues.map((dialogue) => dialogue.key), ...cache.values()]
    const key = uniqueKey(usedKeys, `${source.key}_copy`, 'dialogue_copy')
    const dialogue: Dialogue = {
      ...source,
      id: copyId,
      key,
      source_path: null,
      source_metadata: { ...cloneJson(source.source_metadata), local_draft: true, copied_from: source.key },
    }
    const lines = getDialogueLines(current, source.id).map((line) => ({
      ...line,
      id: makeLocalId('dline'),
      dialogue_id: copyId,
    }))

    cache.set(dialogueKey, key)
    touchedDialogueIds.current.add(copyId)
    return { key, dialogue, lines }
  }, [])

  const cloneMinigameForStep = useCallback((
    current: EditorData,
    step: QuestStep,
    cache: Map<string, string>,
  ): { key: string; minigame?: MinigameInstance } | null => {
    const instanceKey = getStepMinigameKey(step)
    if (!instanceKey) return null

    const cached = cache.get(instanceKey)
    if (cached) return { key: cached }

    const source = getStepMinigame(current, step)
    if (!source) return { key: instanceKey }

    const usedKeys = [...current.minigames.map((minigame) => minigame.key), ...cache.values()]
    const key = uniqueKey(usedKeys, `${source.key}_copy`, 'minigame_copy')
    const minigame: MinigameInstance = {
      ...source,
      id: makeLocalId('minigame'),
      key,
      tasks: cloneJson(source.tasks),
      params: cloneJson(source.params),
      source_path: null,
      source_metadata: { ...cloneJson(source.source_metadata), local_draft: true, copied_from: source.key },
    }

    cache.set(instanceKey, key)
    touchedMinigameIds.current.add(minigame.id)
    return { key, minigame }
  }, [])

  const cloneStepPayloadAttachments = useCallback((
    current: EditorData,
    step: QuestStep,
    dialogueCache: Map<string, string>,
    minigameCache: Map<string, string>,
  ): {
    payload: Record<string, unknown>
    dialogues: Dialogue[]
    dialogueLines: DialogueLine[]
    minigames: MinigameInstance[]
  } => {
    const payload = cloneJson(step.payload)
    const dialogues: Dialogue[] = []
    const dialogueLines: DialogueLine[] = []
    const minigames: MinigameInstance[] = []

    const dialogueKey = typeof payload.dialogue_id === 'string' ? payload.dialogue_id : ''
    if (dialogueKey) {
      const cloned = cloneDialogueByKey(current, dialogueKey, dialogueCache)
      payload.dialogue_id = cloned.key
      if (cloned.dialogue) dialogues.push(cloned.dialogue)
      dialogueLines.push(...cloned.lines)
    }

    const clonedMinigame = cloneMinigameForStep(current, step, minigameCache)
    if (clonedMinigame) {
      payload.instance_id = clonedMinigame.key
      payload.instance_key = clonedMinigame.key
      if (clonedMinigame.minigame) minigames.push(clonedMinigame.minigame)
    }

    return { payload, dialogues, dialogueLines, minigames }
  }, [cloneDialogueByKey, cloneMinigameForStep])

  const duplicateQuest = useCallback((questId: string) => {
    setData((current) => {
      const source = current.quests.find((quest) => quest.id === questId)
      if (!source) return current
      const dialogueCache = new Map<string, string>()
      const minigameCache = new Map<string, string>()
      const copiedDialogues: Dialogue[] = []
      const copiedDialogueLines: DialogueLine[] = []
      const copiedMinigames: MinigameInstance[] = []
      const line = current.questlines.find((item) => item.id === source.questline_id)
      const siblings = getQuestlineQuests(current, source.questline_id)
      const newPosition = nextPosition(siblings)
      const copyName = `${source.name} (${t('copySuffix')})`
      const newQuest: Quest = {
        ...source,
        id: makeLocalId('quest'),
        key: allocateQuestKey(current, line?.key ?? 'questline', newPosition, copyName),
        position: newPosition,
        name: copyName,
        status: 'draft',
        source_metadata: { ...cloneJson(source.source_metadata), local_draft: true },
      }
      if (source.start_dialogue_id) {
        const cloned = cloneDialogueByKey(current, source.start_dialogue_id, dialogueCache)
        newQuest.start_dialogue_id = cloned.key
        if (cloned.dialogue) copiedDialogues.push(cloned.dialogue)
        copiedDialogueLines.push(...cloned.lines)
      }
      if (source.turn_in_dialogue_id) {
        const cloned = cloneDialogueByKey(current, source.turn_in_dialogue_id, dialogueCache)
        newQuest.turn_in_dialogue_id = cloned.key
        if (cloned.dialogue) copiedDialogues.push(cloned.dialogue)
        copiedDialogueLines.push(...cloned.lines)
      }
      const sourceSteps = getQuestSteps(current, source.id)
      const steps: QuestStep[] = sourceSteps.map((step, index) => {
        const attachments = cloneStepPayloadAttachments(current, step, dialogueCache, minigameCache)
        copiedDialogues.push(...attachments.dialogues)
        copiedDialogueLines.push(...attachments.dialogueLines)
        copiedMinigames.push(...attachments.minigames)
        return {
          ...step,
          id: makeLocalId('step'),
          quest_id: newQuest.id,
          key: suggestStepKey(newQuest.key, index),
          payload: attachments.payload,
          source_metadata: { ...cloneJson(step.source_metadata), local_draft: true },
        }
      })
      const stepIdMap = new Map(sourceSteps.map((step, index) => [step.id, steps[index].id]))
      const rewards: QuestReward[] = current.rewards
        .filter((reward) =>
          (reward.scope === 'quest' && reward.quest_id === source.id)
          || (reward.scope === 'step' && reward.step_id !== null && stepIdMap.has(reward.step_id)),
        )
        .map((reward) => ({
          ...reward,
          id: makeLocalId('reward'),
          quest_id: reward.scope === 'quest' ? newQuest.id : null,
          step_id: reward.scope === 'step' && reward.step_id !== null ? stepIdMap.get(reward.step_id)! : null,
          source_metadata: { ...reward.source_metadata, local_draft: true },
        }))
      const prerequisites: QuestPrerequisite[] = current.prerequisites
        .filter((edge) => edge.quest_id === source.id)
        .map((edge) => ({ quest_id: newQuest.id, prerequisite_quest_id: edge.prerequisite_quest_id }))
      return {
        ...current,
        quests: [...current.quests, newQuest],
        steps: [...current.steps, ...steps],
        rewards: [...current.rewards, ...rewards],
        prerequisites: [...current.prerequisites, ...prerequisites],
        dialogues: [...current.dialogues, ...copiedDialogues],
        dialogueLines: [...current.dialogueLines, ...copiedDialogueLines],
        minigames: [...current.minigames, ...copiedMinigames],
      }
    })
    setDirty(true)
    notify(t('questDuplicated'))
  }, [cloneDialogueByKey, cloneStepPayloadAttachments, notify, t])

  const moveQuest = useCallback((questId: string, direction: -1 | 1) => {
    setData((current) => {
      const target = current.quests.find((quest) => quest.id === questId)
      if (!target) return current
      const siblings = getQuestlineQuests(current, target.questline_id)
      const index = siblings.findIndex((quest) => quest.id === questId)
      const swapWith = siblings[index + direction]
      if (!swapWith) return current
      const byId = new Map(siblings.map((quest, position) => [quest.id, position]))
      byId.set(target.id, byId.get(swapWith.id)!)
      byId.set(swapWith.id, index)
      return {
        ...current,
        quests: current.quests.map((quest) => (byId.has(quest.id) ? { ...quest, position: byId.get(quest.id)! } : quest)),
      }
    })
    setDirty(true)
  }, [])

  const moveStep = useCallback((stepId: string, direction: -1 | 1) => {
    setData((current) => {
      const target = current.steps.find((step) => step.id === stepId)
      if (!target) return current
      const siblings = getQuestSteps(current, target.quest_id)
      const index = siblings.findIndex((step) => step.id === stepId)
      const swapWith = siblings[index + direction]
      if (!swapWith) return current
      const byId = new Map(siblings.map((step, position) => [step.id, position]))
      byId.set(target.id, byId.get(swapWith.id)!)
      byId.set(swapWith.id, index)
      return {
        ...current,
        steps: current.steps.map((step) => (byId.has(step.id) ? { ...step, position: byId.get(step.id)! } : step)),
      }
    })
    setDirty(true)
  }, [])

  const duplicateStep = useCallback((stepId: string) => {
    setData((current) => {
      const source = current.steps.find((step) => step.id === stepId)
      if (!source) return current
      const siblings = getQuestSteps(current, source.quest_id)
      const quest = current.quests.find((item) => item.id === source.quest_id)
      const attachments = cloneStepPayloadAttachments(current, source, new Map(), new Map())
      const copy: QuestStep = {
        ...source,
        id: makeLocalId('step'),
        key: uniqueExactKey(
          siblings.map((step) => step.key),
          normalizeContentKey(`${source.key}_copy`, suggestStepKey(quest?.key ?? 'quest', siblings.length)),
        ),
        position: nextPosition(siblings),
        payload: attachments.payload,
        source_metadata: { ...cloneJson(source.source_metadata), local_draft: true },
      }
      const rewards: QuestReward[] = current.rewards
        .filter((reward) => reward.scope === 'step' && reward.step_id === source.id)
        .map((reward) => ({ ...reward, id: makeLocalId('reward'), step_id: copy.id, source_metadata: { ...reward.source_metadata, local_draft: true } }))
      return {
        ...current,
        steps: [...current.steps, copy],
        rewards: [...current.rewards, ...rewards],
        dialogues: [...current.dialogues, ...attachments.dialogues],
        dialogueLines: [...current.dialogueLines, ...attachments.dialogueLines],
        minigames: [...current.minigames, ...attachments.minigames],
      }
    })
    setDirty(true)
    notify(t('stepDuplicated'))
  }, [cloneStepPayloadAttachments, notify, t])

  const duplicateDialogue = useCallback((dialogueId: string) => {
    setData((current) => {
      const source = current.dialogues.find((dialogue) => dialogue.id === dialogueId)
      if (!source) return current
      const copyId = makeLocalId('dialogue')
      const copy: Dialogue = {
        ...source,
        id: copyId,
        key: uniqueDialogueKey(current, `${source.key}_copy`),
        source_path: null,
        source_metadata: { ...cloneJson(source.source_metadata), local_draft: true, copied_from: source.key },
      }
      const lines: DialogueLine[] = current.dialogueLines
        .filter((line) => line.dialogue_id === source.id)
        .map((line) => ({ ...line, id: makeLocalId('dline'), dialogue_id: copyId }))
      touchedDialogueIds.current.add(copyId)
      return {
        ...current,
        dialogues: [...current.dialogues, copy],
        dialogueLines: [...current.dialogueLines, ...lines],
      }
    })
    setDirty(true)
    notify(t('dialogueDuplicated'))
  }, [notify, t])

  const duplicateQuestline = useCallback((questlineId: string) => {
    setData((current) => {
      const source = current.questlines.find((line) => line.id === questlineId)
      if (!source) return current
      const dialogueCache = new Map<string, string>()
      const minigameCache = new Map<string, string>()
      const copiedDialogues: Dialogue[] = []
      const copiedDialogueLines: DialogueLine[] = []
      const copiedMinigames: MinigameInstance[] = []
      const lineCopyId = makeLocalId('questline')
      const lineCopy: Questline = {
        ...source,
        id: lineCopyId,
        key: uniqueQuestlineKey(current, `${source.key}_copy`),
        display_name: `${source.display_name} (${t('copySuffix')})`,
        status: 'draft',
        source_metadata: { ...cloneJson(source.source_metadata), local_draft: true },
      }
      const sourceQuests = getQuestlineQuests(current, source.id)
      const usedQuestKeys = new Set(current.quests.map((item) => item.key))
      const questCopies: Quest[] = sourceQuests.map((quest, index) => {
        const key = uniqueExactKey(
          usedQuestKeys,
          normalizeContentKey(suggestQuestBaseKey(lineCopy.key, index, quest.name)),
        )
        usedQuestKeys.add(key)
        const copy: Quest = {
          ...quest,
          id: makeLocalId('quest'),
          questline_id: lineCopyId,
          key,
          position: index,
          status: 'draft',
          source_metadata: { ...cloneJson(quest.source_metadata), local_draft: true },
        }
        if (quest.start_dialogue_id) {
          const cloned = cloneDialogueByKey(current, quest.start_dialogue_id, dialogueCache)
          copy.start_dialogue_id = cloned.key
          if (cloned.dialogue) copiedDialogues.push(cloned.dialogue)
          copiedDialogueLines.push(...cloned.lines)
        }
        if (quest.turn_in_dialogue_id) {
          const cloned = cloneDialogueByKey(current, quest.turn_in_dialogue_id, dialogueCache)
          copy.turn_in_dialogue_id = cloned.key
          if (cloned.dialogue) copiedDialogues.push(cloned.dialogue)
          copiedDialogueLines.push(...cloned.lines)
        }
        return copy
      })
      const questIdMap = new Map(sourceQuests.map((quest, index) => [quest.id, questCopies[index].id]))
      const questKeyByOldId = new Map(sourceQuests.map((quest, index) => [quest.id, questCopies[index].key]))

      const usedStepKeys = new Set(current.steps.map((step) => step.key))
      const sourceSteps = current.steps.filter((step) => questIdMap.has(step.quest_id))
      const stepCopies: QuestStep[] = sourceSteps.map((step) => {
        const newQuestKey = questKeyByOldId.get(step.quest_id) ?? 'quest'
        const preferred = suggestStepKey(newQuestKey, step.position)
        const copyKey = uniqueExactKey(usedStepKeys, normalizeContentKey(preferred))
        usedStepKeys.add(copyKey)
        const attachments = cloneStepPayloadAttachments(current, step, dialogueCache, minigameCache)
        copiedDialogues.push(...attachments.dialogues)
        copiedDialogueLines.push(...attachments.dialogueLines)
        copiedMinigames.push(...attachments.minigames)
        return {
          ...step,
          id: makeLocalId('step'),
          quest_id: questIdMap.get(step.quest_id)!,
          key: copyKey,
          payload: attachments.payload,
          source_metadata: { ...cloneJson(step.source_metadata), local_draft: true },
        }
      })
      const stepIdMap = new Map(sourceSteps.map((step, index) => [step.id, stepCopies[index].id]))

      const rewards: QuestReward[] = current.rewards
        .filter((reward) =>
          (reward.scope === 'quest' && reward.quest_id !== null && questIdMap.has(reward.quest_id))
          || (reward.scope === 'step' && reward.step_id !== null && stepIdMap.has(reward.step_id)),
        )
        .map((reward) => ({
          ...reward,
          id: makeLocalId('reward'),
          quest_id: reward.scope === 'quest' ? questIdMap.get(reward.quest_id!)! : null,
          step_id: reward.scope === 'step' ? stepIdMap.get(reward.step_id!) ?? null : null,
          source_metadata: { ...reward.source_metadata, local_draft: true },
        }))
      const prerequisites: QuestPrerequisite[] = current.prerequisites
        .filter((edge) => questIdMap.has(edge.quest_id) || questIdMap.has(edge.prerequisite_quest_id))
        .map((edge) => ({
          quest_id: questIdMap.get(edge.quest_id) ?? edge.quest_id,
          prerequisite_quest_id: questIdMap.get(edge.prerequisite_quest_id) ?? edge.prerequisite_quest_id,
        }))
      return {
        ...current,
        questlines: [...current.questlines, lineCopy],
        quests: [...current.quests, ...questCopies],
        steps: [...current.steps, ...stepCopies],
        rewards: [...current.rewards, ...rewards],
        prerequisites: [...current.prerequisites, ...prerequisites],
        dialogues: [...current.dialogues, ...copiedDialogues],
        dialogueLines: [...current.dialogueLines, ...copiedDialogueLines],
        minigames: [...current.minigames, ...copiedMinigames],
      }
    })
    setDirty(true)
    notify(t('questlineDuplicated'))
  }, [cloneDialogueByKey, cloneStepPayloadAttachments, notify, t])

  // --- Persistence ---
  const persistDraft = useCallback(async (force: boolean): Promise<{ saveResult: SaveResult; savedData: EditorData }> => {
    const pendingDeletedQuestlines = [...deletedQuestlineIds.current]

    const clearDeletionBuffers = () => {
      deletedQuestlineIds.current = []
      deletedQuestIds.current = []
      deletedStepIds.current = []
      deletedDialogueIds.current = []
      deletedMinigameIds.current = []
    }

    if (!supabase || demoMode) {
      clearDeletionBuffers()
      touchedDialogueIds.current.clear()
      touchedMinigameIds.current.clear()
      if (!selectedLine) {
        setDirty(false)
        return { saveResult: { questlineId: '', updatedAt: new Date().toISOString() }, savedData: data }
      }
      const lineToSave: Questline = { ...selectedLine, status: 'draft' }
      const questsToSave = getQuestlineQuests(data, selectedLine.id)
      const questIds = new Set(questsToSave.map((quest) => quest.id))
      const savedData: EditorData = {
        ...data,
        questlines: data.questlines.map((line) => (line.id === lineToSave.id ? lineToSave : line)),
        quests: data.quests.map((quest) =>
          questIds.has(quest.id) ? { ...quest, status: quest.status === 'published' ? 'draft' : quest.status } : quest,
        ),
      }
      setData(savedData)
      questlineVersions.current[lineToSave.id] = new Date().toISOString()
      setDirty(false)
      return { saveResult: { questlineId: lineToSave.id, updatedAt: questlineVersions.current[lineToSave.id] }, savedData }
    }

    if (pendingDeletedQuestlines.length) {
      await deleteQuestlines(pendingDeletedQuestlines)
      deletedQuestlineIds.current = []
      for (const id of pendingDeletedQuestlines) delete questlineVersions.current[id]
    }

    if (!selectedLine) {
      // Questline deletion (and cascades) may be the only pending work.
      deletedQuestIds.current = []
      deletedStepIds.current = []
      deletedDialogueIds.current = []
      deletedMinigameIds.current = []
      setDirty(false)
      return { saveResult: { questlineId: '', updatedAt: new Date().toISOString() }, savedData: data }
    }

    const lineToSave: Questline = { ...selectedLine, status: 'draft' }
    const questsToSave = getQuestlineQuests(data, selectedLine.id)
    const questIds = new Set(questsToSave.map((quest) => quest.id))
    const stepsToSave = data.steps.filter((step) => questIds.has(step.quest_id))
    const stepIds = new Set(stepsToSave.map((step) => step.id))
    const savedData: EditorData = {
      ...data,
      questlines: data.questlines.map((line) => (line.id === lineToSave.id ? lineToSave : line)),
      quests: data.quests.map((quest) =>
        questIds.has(quest.id) ? { ...quest, status: quest.status === 'published' ? 'draft' : quest.status } : quest,
      ),
    }
    const dialoguesToSave = data.dialogues.filter((dialogue) => touchedDialogueIds.current.has(dialogue.id))
    const dialogueLinesToSave = data.dialogueLines.filter((line) => touchedDialogueIds.current.has(line.dialogue_id))
    const minigamesToSave = data.minigames.filter((minigame) => touchedMinigameIds.current.has(minigame.id))

    const payload: QuestlineSavePayload = {
      questline: lineToSave,
      quests: questsToSave,
      steps: stepsToSave,
      prerequisites: data.prerequisites.filter(
        (edge) => questIds.has(edge.quest_id) || questIds.has(edge.prerequisite_quest_id),
      ),
      rewards: data.rewards.filter(
        (reward) =>
          (reward.scope === 'quest' && reward.quest_id !== null && questIds.has(reward.quest_id))
          || (reward.scope === 'step' && reward.step_id !== null && stepIds.has(reward.step_id)),
      ),
      dialogues: dialoguesToSave,
      dialogueLines: dialogueLinesToSave,
      minigames: minigamesToSave,
      deletedQuestIds: [...deletedQuestIds.current],
      deletedStepIds: [...deletedStepIds.current],
      deletedDialogueIds: [...deletedDialogueIds.current],
      deletedMinigameIds: [...deletedMinigameIds.current],
      expectedUpdatedAt: questlineVersions.current[selectedLine.id] ?? null,
      force,
    }
    const saveResult = await saveQuestlineDraft(payload)
    setData(savedData)
    questlineVersions.current[selectedLine.id] = saveResult.updatedAt
    touchedDialogueIds.current.clear()
    touchedMinigameIds.current.clear()
    deletedQuestIds.current = []
    deletedStepIds.current = []
    deletedDialogueIds.current = []
    deletedMinigameIds.current = []
    autoSaveFailedGeneration.current = null
    setDirty(false)
    return { saveResult, savedData }
  }, [data, demoMode, selectedLine])

  const saveDraft = useCallback(async (options?: { force?: boolean }) => {
    setSaving(true)
    try {
      await persistDraft(options?.force ?? false)
      notify(t('draftSaved'))
    } catch (error) {
      if (error instanceof SaveConflictError) {
        setConflictState(true)
      } else {
        const detail = error instanceof Error && error.message ? error.message : String(error)
        notify(detail && detail !== '[object Object]' ? detail : t('couldNotSave'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }, [notify, persistDraft, t])

  const publish = useCallback(async () => {
    if (!selectedLine) return
    const blocking = issues.filter((issue) => issue.severity === 'error')
    if (blocking.length) {
      notify(t('fixBeforePublish'), 'error')
      return
    }
    setPublishing(true)
    try {
      let snapshotData = data
      if (dirty) {
        const { savedData } = await persistDraft(false)
        snapshotData = savedData
      }
      const currentLine = snapshotData.questlines.find((line) => line.key === selectedLine.key) ?? selectedLine
      const warningCount = issues.filter((issue) => issue.severity === 'warning').length
      const { revision } = await publishQuestline({
        data: snapshotData,
        line: currentLine,
        userId: user?.id ?? null,
        warningCount,
      })
      setData((current) => ({
        ...current,
        questlines: current.questlines.map((line) => (line.id === currentLine.id ? { ...line, status: 'published' } : line)),
        revisions: [...current.revisions, revision],
      }))
      setDirty(false)
      notify(t('publishedRevision', { name: currentLine.display_name, version: revision.version }))
    } catch (error) {
      if (error instanceof SaveConflictError) {
        setConflictState(true)
      } else {
        notify(error instanceof Error ? error.message : t('couldNotPublish'), 'error')
      }
    } finally {
      setPublishing(false)
    }
  }, [data, dirty, issues, notify, persistDraft, selectedLine, t, user])

  // Auto-save
  useEffect(() => {
    if (!dirty || demoMode || publishing || autoSaveInFlight.current) return
    // Allow flushing questline deletions even when nothing is selected (last line removed).
    if (!selectedLine && deletedQuestlineIds.current.length === 0) return
    if (autoSaveFailedGeneration.current === dataGeneration.current) return
    const timeout = window.setTimeout(() => {
      autoSaveInFlight.current = true
      setSaving(true)
      void persistDraft(false)
        .catch((error: unknown) => {
          autoSaveFailedGeneration.current = dataGeneration.current
          if (error instanceof SaveConflictError) {
            setConflictState(true)
          } else {
            notify(error instanceof Error ? t('autoSaveFailedDetail', { message: error.message }) : t('autoSaveFailed'), 'error')
          }
        })
        .finally(() => {
          autoSaveInFlight.current = false
          setSaving(false)
        })
    }, 1400)
    return () => window.clearTimeout(timeout)
  }, [data, dirty, demoMode, notify, persistDraft, publishing, selectedLine, t])

  const retryJoin = useCallback(async () => {
    if (!supabase || !user) return
    const displayName = user.email?.split('@')[0] ?? null
    const { error } = await supabase.rpc('ensure_workspace_member', { p_display_name: displayName })
    if (error) throw error
    const loaded = await loadEditorData()
    setData(loaded)
    questlineVersions.current = Object.fromEntries(loaded.questlines.map((line) => [line.id, line.updated_at ?? '']))
    setLoadError('')
  }, [user])

  const handleSignIn = useCallback(async (email: string, password: string) => {
    await persistenceSignIn(email, password)
  }, [])

  const handleSignUp = useCallback(async (email: string, password: string) => {
    await persistenceSignUp(email, password)
  }, [])

  const handleSignOut = useCallback(async () => {
    await persistenceSignOut()
    setUser(null)
  }, [])

  const revisionsForLine = useCallback(
    (questlineId: string) =>
      data.revisions.filter((revision) => revision.questline_id === questlineId).sort((a, b) => b.version - a.version),
    [data.revisions],
  )

  const restoreRevisionAsDraft = useCallback((revision: QuestlineRevision) => {
    const line = data.questlines.find((item) => item.id === revision.questline_id) ?? selectedLine
    if (!line) return
    const doc = (revision.document ?? {}) as {
      display_name?: string
      default_giver_external_id?: string | null
      theme?: string | null
      quests?: Array<{
        key: string
        name: string
        summary?: string | null
        level_required?: number
        giver_external_id?: string | null
        wait_for_npc_turn_in?: boolean
        start_dialogue_id?: string | null
        turn_in_dialogue_id?: string | null
        prerequisites?: string[]
        rewards?: Array<{ reward_type: string; xp_amount?: number | null; item_external_id?: string | null; amount?: number | null }>
        steps?: Array<{
          key: string
          type: string
          payload?: Record<string, unknown>
          rewards?: Array<{ reward_type: string; xp_amount?: number | null; item_external_id?: string | null; amount?: number | null }>
        }>
      }>
    }
    setData((current) => {
      const usedQuestKeys = new Set(
        current.quests.filter((quest) => quest.questline_id !== line.id).map((quest) => quest.key),
      )
      const quests: Quest[] = (doc.quests ?? []).map((questDoc, index) => {
        const preferred = questDoc.key || suggestQuestBaseKey(line.key, index, questDoc.name || 'restored')
        const key = uniqueExactKey(usedQuestKeys, normalizeContentKey(preferred))
        usedQuestKeys.add(key)
        return {
          id: makeLocalId('quest'),
          questline_id: line.id,
          key,
          position: index,
          name: questDoc.name || t('untitledQuest'),
          level_required: questDoc.level_required ?? index + 1,
          giver_external_id: questDoc.giver_external_id ?? null,
          summary: questDoc.summary ?? null,
          wait_for_npc_turn_in: questDoc.wait_for_npc_turn_in ?? false,
          start_dialogue_id: questDoc.start_dialogue_id || null,
          turn_in_dialogue_id: questDoc.turn_in_dialogue_id || null,
          status: 'draft',
          source_path: null,
          source_metadata: { restored_from_revision: revision.version },
        }
      })
      // Map both original doc keys and allocated keys so prerequisites still resolve.
      const questIdByKey = new Map<string, string>()
      ;(doc.quests ?? []).forEach((questDoc, index) => {
        questIdByKey.set(quests[index].key, quests[index].id)
        if (questDoc.key) questIdByKey.set(questDoc.key, quests[index].id)
      })
      const steps: QuestStep[] = (doc.quests ?? []).flatMap((questDoc, questIndex) => {
        const questId = quests[questIndex]?.id
        const questKey = quests[questIndex]?.key
        if (!questId || !questKey) return []
        return (questDoc.steps ?? []).map((stepDoc, index) => ({
          id: makeLocalId('step'),
          quest_id: questId,
          key: stepDoc.key || suggestStepKey(questKey, index),
          position: index,
          step_type: stepDoc.type,
          payload: stepDoc.payload ?? {},
          source_metadata: { restored_from_revision: revision.version },
        }))
      })
      const stepIdByKey = new Map(
        (doc.quests ?? []).flatMap((questDoc, questIndex) =>
          (questDoc.steps ?? []).map((stepDoc, index) => {
            const questId = quests[questIndex]?.id
            if (!questId) return null
            const stepId = steps.find(
              (step) => step.quest_id === questId && step.position === index,
            )?.id
            const docKey = questDoc.key || quests[questIndex]?.key
            return stepId && docKey ? [`${docKey}::${stepDoc.key}`, stepId] : null
          }).filter((entry): entry is [string, string] => entry !== null),
        ),
      )
      const rewards: QuestReward[] = (doc.quests ?? []).flatMap((questDoc) => {
        const questId = questIdByKey.get(questDoc.key)
        if (!questId) return []
        const questRewards: QuestReward[] = (questDoc.rewards ?? []).map((rewardDoc) => ({
          id: makeLocalId('reward'),
          scope: 'quest',
          quest_id: questId,
          step_id: null,
          reward_type: rewardDoc.reward_type === 'item' ? 'item' : 'xp',
          xp_amount: rewardDoc.xp_amount ?? null,
          item_external_id: rewardDoc.item_external_id ?? null,
          amount: rewardDoc.amount ?? null,
          source_metadata: {},
        }))
        const stepRewards: QuestReward[] = (questDoc.steps ?? []).flatMap((stepDoc) => {
          const stepId = stepIdByKey.get(`${questDoc.key}::${stepDoc.key}`)
          if (!stepId) return []
          return (stepDoc.rewards ?? []).map((rewardDoc) => ({
            id: makeLocalId('reward'),
            scope: 'step',
            quest_id: null,
            step_id: stepId,
            reward_type: rewardDoc.reward_type === 'item' ? 'item' : 'xp',
            xp_amount: rewardDoc.xp_amount ?? null,
            item_external_id: rewardDoc.item_external_id ?? null,
            amount: rewardDoc.amount ?? null,
            source_metadata: {},
          }))
        })
        return [...questRewards, ...stepRewards]
      })
      const prerequisites: QuestPrerequisite[] = (doc.quests ?? []).flatMap((questDoc) => {
        const questId = questIdByKey.get(questDoc.key)
        if (!questId) return []
        return (questDoc.prerequisites ?? [])
          .filter((prereqKey) => questIdByKey.has(prereqKey))
          .map((prereqKey) => ({ quest_id: questId, prerequisite_quest_id: questIdByKey.get(prereqKey)! }))
      })
      const oldQuestIds = new Set(current.quests.filter((quest) => quest.questline_id === line.id).map((quest) => quest.id))
      return {
        ...current,
        questlines: current.questlines.map((item) =>
          item.id === line.id
            ? {
              ...item,
              status: 'draft',
              display_name: doc.display_name ?? item.display_name,
              default_giver_external_id: doc.default_giver_external_id ?? item.default_giver_external_id,
              theme: doc.theme !== undefined ? doc.theme : item.theme,
            }
            : item),
        quests: [...current.quests.filter((quest) => quest.questline_id !== line.id), ...quests],
        steps: [...current.steps.filter((step) => !oldQuestIds.has(step.quest_id)), ...steps],
        rewards: [
          ...current.rewards.filter((reward) => !(reward.quest_id !== null && oldQuestIds.has(reward.quest_id))),
          ...rewards,
        ],
        prerequisites: [
          ...current.prerequisites.filter(
            (edge) => !oldQuestIds.has(edge.quest_id) && !oldQuestIds.has(edge.prerequisite_quest_id),
          ),
          ...prerequisites,
        ],
      }
    })
    setSelectedQuestId('')
    setSelectedStepId('')
    setDirty(true)
    notify(t('revisionRestored'))
  }, [data, notify, selectedLine, t])

  const importBundle = useCallback((bundle: unknown, sourceKey?: string) => {
    if (!selectedLine) return
    const imported = importBundleIntoLine(bundle, data, selectedLine, sourceKey)
    imported.dialogues.forEach((dialogue) => touchedDialogueIds.current.add(dialogue.id))
    imported.minigames.forEach((minigame) => touchedMinigameIds.current.add(minigame.id))
    imported.oldQuestIds.forEach((id) => deletedQuestIds.current.push(id))
    imported.oldStepIds.forEach((id) => deletedStepIds.current.push(id))
    setData((current) => ({
      ...current,
      questlines: current.questlines.map((item) => item.id === selectedLine.id ? imported.line : item),
      quests: [...current.quests.filter((quest) => quest.questline_id !== selectedLine.id), ...imported.quests],
      steps: [...current.steps.filter((step) => !imported.oldStepIds.includes(step.id)), ...imported.steps],
      prerequisites: [...current.prerequisites.filter((edge) => !imported.oldQuestIds.includes(edge.quest_id) && !imported.oldQuestIds.includes(edge.prerequisite_quest_id)), ...imported.prerequisites],
      rewards: [...current.rewards.filter((reward) => !(reward.quest_id && imported.oldQuestIds.includes(reward.quest_id)) && !(reward.step_id && imported.oldStepIds.includes(reward.step_id))), ...imported.rewards],
      dialogues: [...current.dialogues.filter((item) => !imported.dialogues.some((next) => next.key === item.key)), ...imported.dialogues],
      dialogueLines: [...current.dialogueLines.filter((item) => !imported.dialogues.some((dialogue) => dialogue.id === item.dialogue_id)), ...imported.dialogueLines],
      minigames: [...current.minigames.filter((item) => !imported.minigames.some((next) => next.key === item.key)), ...imported.minigames],
    }))
    setSelectedQuestId('')
    setSelectedStepId('')
    setDirty(true)
    notify('Bundle imported as a draft')
  }, [data, notify, selectedLine])

  const createQuestFromTemplate = useCallback((kind: 'blank' | 'adventure') => {
    if (!selectedLine) return
    const giver = selectedLine.default_giver_external_id ?? 'teacher_maya'
    setData((current) => {
      const siblings = getQuestlineQuests(current, selectedLine.id)
      const position = siblings.length
      const name = kind === 'adventure' ? t('templateAdventure') : t('templateBlank')
      const quest: Quest = {
        id: makeLocalId('quest'),
        questline_id: selectedLine.id,
        key: allocateQuestKey(current, selectedLine.key, position, name),
        position,
        name,
        level_required: Math.max(1, position + 1),
        giver_external_id: giver,
        summary: kind === 'adventure' ? t('templateAdventureCopy') : t('templateBlankCopy'),
        wait_for_npc_turn_in: false,
        start_dialogue_id: null,
        turn_in_dialogue_id: null,
        status: 'draft',
        source_path: null,
        source_metadata: { local_draft: true, template: kind },
      }
      const steps: QuestStep[] = []
      if (kind === 'adventure') {
        const firstArea = current.catalog.find((entry) => entry.kind === 'area')
        const firstMinigame = current.catalog.find((entry) => entry.kind === 'minigame')
        const firstInteractable = current.catalog.find((entry) => entry.kind === 'interactable')
        const firstItem = current.catalog.find((entry) => entry.kind === 'item')
        const pattern: Array<{ type: string; payload: Record<string, unknown> }> = [
          { type: 'talk_to_npc', payload: { npc_id: giver, dialogue_id: '' } },
          { type: 'reach_location', payload: { location_id: firstArea?.external_id ?? '', radius: 5 } },
          {
            type: 'play_minigame',
            payload: {
              minigame_id: firstMinigame?.external_id ?? '',
              world_object_id: firstInteractable?.external_id ?? '',
              difficulty: 1,
              success_required: true,
            },
          },
          {
            type: 'deliver_item',
            payload: { npc_id: giver, item_id: firstItem?.external_id ?? '', amount: 1, dialogue_id: '' },
          },
        ]
        pattern.forEach((stepDoc, index) => {
          steps.push({
            id: makeLocalId('step'),
            quest_id: quest.id,
            key: suggestStepKey(quest.key, index),
            position: index,
            step_type: stepDoc.type,
            payload: stepDoc.payload,
            source_metadata: { local_draft: true, template: kind },
          })
        })
      }
      return {
        ...current,
        quests: [...current.quests, quest],
        steps: [...current.steps, ...steps],
      }
    })
    setSelectedQuestId('')
    setSelectedStepId('')
    setShowTemplates(false)
    setDirty(true)
    notify(t('templateCreated'))
  }, [notify, selectedLine, t])

  const forceSaveAfterConflict = useCallback(async () => {
    setConflictState(false)
    await saveDraft({ force: true })
  }, [saveDraft])

  const value = useMemo<EditorStoreValue>(
    () => ({
      demoMode,
      data,
      user,
      authReady,
      view,
      setView,
      sidebarCollapsed,
      toggleSidebar,
      selectedQuestlineId,
      selectedQuestId,
      selectedStepId,
      setSelectedQuestlineId,
      setSelectedQuestId,
      setSelectedStepId,
      selectedLine,
      lineQuests,
      selectedQuest,
      questSteps,
      issues,
      dirty,
      saving,
      publishing,
      toast,
      loadError,
      history: { canUndo: historyIndex.current > 0, canRedo: historyIndex.current < history.current.length - 1 },
      undo,
      redo,
      notify,
      confirmState,
      openConfirm,
      closeConfirm,
      conflictState,
      closeConflict,
      showNewQuestline,
      setShowNewQuestline,
      showPublishConfirm,
      setShowPublishConfirm,
      showSearch,
      setShowSearch,
      showRevisions,
      setShowRevisions,
      showTemplates,
      setShowTemplates,
      libraryTab,
      setLibraryTab,
      updateLine,
      updateQuest,
      updateStep,
      updateDialogue,
      updateDialogueLine,
      addDialogueLine,
      removeDialogueLine,
      moveDialogueLine,
      createDialogue,
      createDialogueForStep,
      createDialogueForQuest,
      createMinigameForStep,
      updateMinigame,
      togglePrerequisite,
      addReward,
      updateReward,
      removeReward,
      addQuest,
      addStep,
      createQuestline,
      removeQuestline,
      removeQuest,
      removeStep,
      removeDialogue,
      removeMinigame,
      duplicateQuest,
      duplicateStep,
      duplicateDialogue,
      duplicateQuestline,
      moveQuest,
      moveStep,
      saveDraft,
      publish,
      retryJoin,
      handleSignIn,
      handleSignUp,
      handleSignOut,
      revisionsForLine,
      restoreRevisionAsDraft,
      createQuestFromTemplate,
      forceSaveAfterConflict,
      importBundle,
    }),
    [
      demoMode, data, user, authReady, view, sidebarCollapsed, toggleSidebar, selectedQuestlineId, selectedQuestId, selectedStepId,
      selectedLine, lineQuests, selectedQuest, questSteps, issues, dirty, saving, publishing,
      toast, loadError, historyVersion, undo, redo, notify, confirmState, openConfirm, closeConfirm,
      conflictState, closeConflict, showNewQuestline, showPublishConfirm, showSearch,
      showRevisions, showTemplates, libraryTab, setLibraryTab, updateLine, updateQuest, updateStep, updateDialogue,
      updateDialogueLine, addDialogueLine, removeDialogueLine, moveDialogueLine,       createDialogue,
      createDialogueForStep, createDialogueForQuest, createMinigameForStep, updateMinigame, togglePrerequisite, addReward, updateReward,
      removeReward, addQuest, addStep, createQuestline, removeQuestline, removeQuest, removeStep,
      removeDialogue, removeMinigame, duplicateQuest, duplicateStep, duplicateDialogue, duplicateQuestline,
      moveQuest, moveStep, saveDraft, publish,
      retryJoin, handleSignIn, handleSignUp, handleSignOut, revisionsForLine,
      restoreRevisionAsDraft, createQuestFromTemplate, forceSaveAfterConflict, importBundle,
    ],
  )

  return <EditorStoreContext.Provider value={value}>{children}</EditorStoreContext.Provider>
}

export function useEditorStore(): EditorStoreValue {
  const context = useContext(EditorStoreContext)
  if (!context) throw new Error('useEditorStore must be used within EditorStoreProvider')
  return context
}
