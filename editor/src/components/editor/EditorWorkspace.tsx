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
  const { data, issues, dirty, saving, publishing, saveDraft, importBundle, notify, selectedLine, setShowPublishConfirm, setView } = useEditorStore()
  const commandConsumed = useRef(false)

  const loadNumbersBundle = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}quest_content_bundle.json`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Could not load bundle (${response.status})`)
      importBundle(await response.json())
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not load bundle', 'error')
    }
  }

  // Internal assistant command: /editor/?load=numbers_advanced
  // keeps the authoring control out of the learner-facing UI.
  useEffect(() => {
    if (commandConsumed.current || !selectedLine) return
    if (new URLSearchParams(window.location.search).get('load') !== 'numbers_advanced') return
    commandConsumed.current = true
    window.history.replaceState({}, '', window.location.pathname)
    void loadNumbersBundle()
  }, [selectedLine, importBundle, notify])

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
