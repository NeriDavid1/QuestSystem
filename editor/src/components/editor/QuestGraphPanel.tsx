import { useEditorStore } from '../../state/EditorStore'
import { useT } from '../../i18n'
import { Icon } from '../common/Icon'
import { StatusPill } from '../common/StatusPill'
import { EmptyState } from '../common/EmptyState'
import { GraphWithStepCounts } from './QuestGraph'

export function QuestGraphPanel() {
  const t = useT()
  const {
    data,
    selectedLine,
    lineQuests,
    selectedQuestId,
    setSelectedQuestId,
    setSelectedStepId,
    addQuest,
    duplicateQuest,
    removeQuest,
    moveQuest,
    openConfirm,
    setShowTemplates,
    setShowRevisions,
  } = useEditorStore()

  if (!selectedLine) {
    return (
      <section className="workspace-main">
        <EmptyState icon="✦" title={t('selectQuestTitle')} copy={t('selectQuestCopy')} />
      </section>
    )
  }

  const lineEdges = data.prerequisites.filter(
    (edge) => lineQuests.some((quest) => quest.id === edge.quest_id) && lineQuests.some((quest) => quest.id === edge.prerequisite_quest_id),
  )
  const selectedQuestIndex = lineQuests.findIndex((quest) => quest.id === selectedQuestId)

  const confirmDeleteSelected = () => {
    const quest = lineQuests.find((item) => item.id === selectedQuestId)
    if (!quest) return
    openConfirm({
      title: t('deleteQuestAria'),
      message: quest.name || t('untitledQuest'),
      confirmLabel: t('deleteQuestAria'),
      tone: 'danger',
      onConfirm: () => removeQuest(quest.id),
    })
  }

  return (
    <section className="workspace-main">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">{t('visualFlow', { key: selectedLine.key })}</p>
          <h1 className="content-text" dir="auto">{selectedLine.display_name}</h1>
          <p className="page-subtitle content-text" dir="auto">{selectedLine.theme ?? t('addThemeHint')}</p>
        </div>
        <div className="heading-actions">
          <StatusPill status={selectedLine.status} />
          <button className="button subtle" onClick={() => setShowRevisions(true)} title={t('revisionHistoryTitle')}>
            <Icon name="refresh" /> {t('revisionHistoryTitle')}
          </button>
          <button className="button subtle" onClick={() => setShowTemplates(true)}>
            <Icon name="plus" /> {t('templateTitle')}
          </button>
          <button className="button subtle" onClick={addQuest}><Icon name="plus" /> {t('addQuest')}</button>
        </div>
      </div>
      <div className="graph-card">
        <div className="graph-toolbar">
          <div className="graph-legend">
            <span><i className="legend-dot done" /> {t('legendComplete')}</span>
            <span><i className="legend-dot draft" /> {t('legendDraft')}</span>
            <span><i className="legend-line" /> {t('legendPrerequisite')}</span>
          </div>
          <div className="graph-actions">
            <button
              type="button"
              className="icon-button"
              aria-label={t('moveQuestUp')}
              title={t('moveQuestUp')}
              disabled={selectedQuestIndex <= 0 || !selectedQuestId}
              onClick={() => selectedQuestId && moveQuest(selectedQuestId, -1)}
            >
              <Icon name="undo" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t('moveQuestDown')}
              title={t('moveQuestDown')}
              disabled={selectedQuestIndex < 0 || selectedQuestIndex >= lineQuests.length - 1 || !selectedQuestId}
              onClick={() => selectedQuestId && moveQuest(selectedQuestId, 1)}
            >
              <Icon name="redo" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t('duplicateQuestAria')}
              title={t('duplicateQuestAria')}
              disabled={!selectedQuestId}
              onClick={() => selectedQuestId && duplicateQuest(selectedQuestId)}
            >
              <Icon name="plus" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t('deleteQuestAria')}
              title={t('deleteQuestAria')}
              disabled={!selectedQuestId}
              onClick={confirmDeleteSelected}
            >
              <Icon name="close" />
            </button>
            <span className="muted">{t('graphHint', { count: lineQuests.length })}</span>
          </div>
        </div>
        {lineQuests.length ? (
          <GraphWithStepCounts
            quests={lineQuests}
            prerequisites={lineEdges}
            steps={data.steps}
            selectedQuestId={selectedQuestId}
            onSelect={(id) => { setSelectedQuestId(id); setSelectedStepId('') }}
          />
        ) : (
          <EmptyState icon="✦" title={t('storyStartsTitle')} copy={t('storyStartsCopy')} />
        )}
        <div className="graph-footer"><span><Icon name="spark" /> {t('graphSourceOfTruth')}</span><button className="text-button" onClick={addQuest}>{t('addAnotherQuest')}</button></div>
      </div>
      <div className="editor-hint"><div className="hint-icon">⌘</div><div><strong>{t('designForLearner')}</strong><p>{t('designForLearnerCopy')}</p></div></div>
    </section>
  )
}
