import { lazy, Suspense, Component, type ReactNode } from 'react'
import { useT } from './i18n'
import { LocaleProvider } from './i18n/LocaleContext'
import { hasSupabaseConfig } from './lib/supabase'
import { EditorStoreProvider, useEditorStore } from './state/EditorStore'
import { AuthScreen } from './components/auth/AuthScreen'
import { AccessRequired } from './components/auth/AccessRequired'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { Overview } from './components/overview/Overview'
import { EditorWorkspace } from './components/editor/EditorWorkspace'
import { Settings } from './components/settings/Settings'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { Toast } from './components/common/Toast'
import { NewQuestlineModal } from './components/common/NewQuestlineModal'
import { PublishConfirmModal } from './components/common/PublishConfirmModal'
import { SearchModal } from './components/common/SearchModal'
import { RevisionsModal } from './components/editor/RevisionsModal'
import { QuestTemplatesModal } from './components/editor/QuestTemplatesModal'
import { Icon } from './components/common/Icon'

const Library = lazy(() => import('./components/library/Library').then((module) => ({ default: module.Library })))
const Preview = lazy(() => import('./components/preview/Preview').then((module) => ({ default: module.Preview })))

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return <main className="loading-screen"><div className="brand-mark">Q</div><span>Something went wrong. Reload the editor to continue.</span></main>
    }
    return this.props.children
  }
}

function ConflictDialog() {
  const t = useT()
  const { conflictState, closeConflict, forceSaveAfterConflict, retryJoin } = useEditorStore()
  if (!conflictState) return null
  const reload = () => {
    void retryJoin().then(() => {
      closeConflict()
    })
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card confirm-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('releaseCheck')}</p>
            <h2 id="conflict-title">{t('conflictTitle')}</h2>
          </div>
        </div>
        <p className="modal-copy">{t('conflictCopy')}</p>
        <div className="modal-actions">
          <button className="button subtle" onClick={reload}>{t('conflictReload')}</button>
          <button className="button danger" onClick={() => void forceSaveAfterConflict()}>{t('conflictOverwrite')}</button>
        </div>
      </section>
    </div>
  )
}

function AppShell() {
  const t = useT()
  const {
    demoMode,
    authReady,
    user,
    data,
    view,
    loadError,
    toast,
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
    issues,
    publishing,
    publish,
    createQuestline,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    retryJoin,
    confirmState,
    closeConfirm,
  } = useEditorStore()

  const signInRequired = hasSupabaseConfig && !user
  if (!authReady) return <main className="loading-screen"><div className="brand-mark">Q</div><span>{t('loadingWorkspace')}</span></main>
  if (signInRequired) return <AuthScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />
  if (!demoMode && user && data.questlines.length === 0) {
    return <AccessRequired email={user.email} message={loadError || undefined} onSignOut={handleSignOut} onRetryJoin={retryJoin} />
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-body">
        <Topbar onOpenSearch={() => setShowSearch(true)} />
        {loadError && <div className="global-error"><Icon name="warning" /> {loadError}</div>}
        {demoMode && <div className="demo-banner"><Icon name="spark" /><span>{t('demoBanner')}</span><span className="demo-banner-note">{t('demoBannerNote')}</span></div>}
        {view === 'overview' && <Overview />}
        {view === 'library' && (
          <Suspense fallback={<main className="loading-screen"><div className="brand-mark">Q</div><span>{t('loadingWorkspace')}</span></main>}>
            <Library />
          </Suspense>
        )}
        {view === 'preview' && (
          <Suspense fallback={<main className="loading-screen"><div className="brand-mark">Q</div><span>{t('loadingWorkspace')}</span></main>}>
            <Preview />
          </Suspense>
        )}
        {view === 'settings' && <Settings />}
        {view === 'editor' && <EditorWorkspace />}
      </div>
      {showNewQuestline && <NewQuestlineModal onClose={() => setShowNewQuestline(false)} onCreate={createQuestline} />}
      {showPublishConfirm && (
        <PublishConfirmModal
          warningCount={issues.filter((issue) => issue.severity === 'warning').length}
          busy={publishing}
          onClose={() => setShowPublishConfirm(false)}
          onConfirm={() => { setShowPublishConfirm(false); void publish() }}
        />
      )}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showRevisions && <RevisionsModal onClose={() => setShowRevisions(false)} />}
      {showTemplates && <QuestTemplatesModal onClose={() => setShowTemplates(false)} />}
      {confirmState && <ConfirmDialog state={confirmState} onCancel={closeConfirm} />}
      <ConflictDialog />
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}

function App() {
  return (
    <LocaleProvider>
      <EditorStoreProvider>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      </EditorStoreProvider>
    </LocaleProvider>
  )
}

export default App
