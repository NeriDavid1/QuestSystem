import { useEffect, useRef } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { QuestlineRail } from './QuestlineRail'
import { QuestGraphPanel } from './QuestGraphPanel'
import { QuestInspector } from './QuestInspector'
import { ValidationPanel } from './ValidationPanel'
import { EmptyState } from '../common/EmptyState'
import { Icon } from '../common/Icon'

export function EditorWorkspace() {
  const t = useT()
  const { data, issues, dirty, saving, publishing, saveDraft, importBundle, notify, authReady, selectedLine, setShowPublishConfirm, setView } = useEditorStore()
  const commandConsumed = useRef(false)

  const loadBundle = async (sourceKey: string) => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}quest_content_bundle.json`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Could not load bundle (${response.status})`)
      importBundle(await response.json(), sourceKey)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not load bundle', 'error')
    }
  }

  // Internal assistant command: /editor/?load=<questline-key>
  // keeps the authoring control out of the learner-facing UI.
  useEffect(() => {
    const sourceKey = new URLSearchParams(window.location.search).get('load')
    // The editor data is loaded asynchronously from Supabase. Do not consume
    // the command while the target line is still absent, otherwise the bundle
    // can be applied to the default line or be overwritten by the initial load.
    if (commandConsumed.current || !authReady || !selectedLine || !sourceKey) return
    if (!data.questlines.some((line) => line.key === sourceKey)) return
    commandConsumed.current = true
    window.history.replaceState({}, '', window.location.pathname)
    void loadBundle(sourceKey)
  }, [authReady, data.questlines, selectedLine, importBundle, notify])

  if (data.questlines.length === 0) {
    return (
      <div className="editor-layout">
        <QuestlineRail />
        <main className="workspace-main">
          <EmptyState icon="✦" title={t('noQuestlinesTitle')} copy={t('noQuestlinesCopy')} />
        </main>
      </div>
    )
  }

  return (
    <>
      <div className="editor-layout">
        <QuestlineRail />
        <QuestGraphPanel />
        <QuestInspector />
      </div>
      <div className="editor-bottom">
        <ValidationPanel issues={issues} />
        <div className="bottom-actions">
          <button className="button subtle" onClick={() => setView('preview')}><Icon name="eye" /> {t('preview')}</button>
          <button className="button subtle" onClick={() => void saveDraft()} disabled={saving || !dirty}><Icon name="save" /> {saving ? t('saving') : t('saveDraft')}</button>
          <button className="button primary" onClick={() => setShowPublishConfirm(true)} disabled={publishing || issues.some((issue) => issue.severity === 'error')}><Icon name="spark" /> {publishing ? t('publishing') : t('publishSnapshot')}</button>
        </div>
      </div>
    </>
  )
}
