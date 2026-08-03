import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getQuestPrerequisites, getQuestRewards, getQuestSteps, getQuestlineQuests } from '../../lib/editorData'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'
import { CatalogSelect } from './CatalogSelect'
import { InspectorSection } from './InspectorSection'
import { PrerequisiteEditor } from './PrerequisiteEditor'
import { RewardEditor } from './RewardEditor'
import { StepEditor } from './StepEditor'

export function QuestInspector() {
  const t = useT()
  const {
    data,
    selectedLine,
    selectedQuest,
    selectedStepId,
    setSelectedStepId,
    updateLine,
    updateQuest,
    addStep,
    togglePrerequisite,
    addReward,
    updateReward,
    removeReward,
    removeQuest,
    removeStep,
    moveStep,
    duplicateQuest,
    duplicateStep,
    openConfirm,
    issues,
  } = useEditorStore()
  const [openSection, setOpenSection] = useState<'quest' | 'steps' | 'line'>('quest')

  if (!selectedLine || !selectedQuest) {
    return (
      <aside className="inspector">
        <div className="inspector-empty"><div className="empty-icon">⌘</div><h3>{t('selectQuestTitle')}</h3><p>{t('selectQuestCopy')}</p></div>
      </aside>
    )
  }

  const quest = selectedQuest
  const steps = getQuestSteps(data, quest.id)
  const selectedStep = steps.find((step) => step.id === selectedStepId)
  const questIssues = issues.filter((issue) => issue.entityId === quest.id)
  const lineQuests = getQuestlineQuests(data, selectedLine.id)
  const questRewards = getQuestRewards(data, quest.id)
  const questPrerequisites = getQuestPrerequisites(data, quest.id)

  const confirmDeleteQuest = () => {
    openConfirm({
      title: t('deleteQuestAria'),
      message: quest.name || t('untitledQuest'),
      confirmLabel: t('deleteQuestAria'),
      tone: 'danger',
      onConfirm: () => {
        removeQuest(quest.id)
        setOpenSection('quest')
      },
    })
  }

  const confirmDeleteStep = (step: { id: string; key: string }) => {
    openConfirm({
      title: t('deleteStepAria'),
      message: step.key,
      confirmLabel: t('deleteStepAria'),
      tone: 'danger',
      onConfirm: () => removeStep(step.id),
    })
  }

  return (
    <aside className="inspector">
      <div className="inspector-top">
        <div><p className="eyebrow">{t('questInspector')}</p><h2 className="content-text" dir="auto">{quest.name || t('untitledQuest')}</h2></div>
        <div className="inspector-top-actions">
          <span className="quest-number">Q{String(quest.position + 1).padStart(2, '0')}</span>
          <button type="button" className="icon-button tiny" aria-label={t('duplicateQuestAria')} title={t('duplicateQuestAria')} onClick={() => duplicateQuest(quest.id)}><Icon name="copy" /></button>
          <button type="button" className="icon-button tiny" aria-label={t('deleteQuestAria')} title={t('deleteQuestAria')} onClick={confirmDeleteQuest}><Icon name="close" /></button>
        </div>
      </div>
      {questIssues.length > 0 && <div className="inspector-alert"><Icon name="warning" /><span>{questIssues.length === 1 ? t('validationNote', { count: questIssues.length }) : t('validationNotes', { count: questIssues.length })}</span></div>}
      <div className="inspector-scroll">
        <InspectorSection title={t('questDetails')} open={openSection === 'quest'} onToggle={() => setOpenSection(openSection === 'quest' ? 'steps' : 'quest')}>
          <div className="form-stack">
            <label><FieldLabel hint={t('questNameHint')}>{t('questName')}</FieldLabel><input className="content-text" dir="auto" value={quest.name} onChange={(event) => updateQuest({ name: event.target.value })} /></label>
            <label><FieldLabel hint={t('playerSummaryHint')}>{t('playerSummary')}</FieldLabel><textarea className="content-text" dir="auto" value={quest.summary ?? ''} onChange={(event) => updateQuest({ summary: event.target.value })} rows={3} /></label>
            <div className="form-row">
              <label><FieldLabel>{t('level')}</FieldLabel><input type="number" min={0} value={quest.level_required} onChange={(event) => updateQuest({ level_required: Number(event.target.value) })} /></label>
              <label><FieldLabel>{t('position')}</FieldLabel><input type="number" min={0} value={quest.position} onChange={(event) => updateQuest({ position: Number(event.target.value) })} /></label>
            </div>
            <label><FieldLabel hint={t('questGiverHint')}>{t('questGiver')}</FieldLabel><CatalogSelect kind="npc" value={quest.giver_external_id ?? ''} data={data} onChange={(value) => updateQuest({ giver_external_id: value })} /></label>
            <div className="editor-subsection"><FieldLabel hint={t('prerequisitesHint')}>{t('prerequisites')}</FieldLabel><PrerequisiteEditor quest={quest} quests={lineQuests} prerequisites={questPrerequisites} onToggle={(prerequisiteQuestId, enabled) => togglePrerequisite(quest.id, prerequisiteQuestId, enabled)} /></div>
            <div className="editor-subsection"><FieldLabel hint={t('questRewardsHint')}>{t('questRewards')}</FieldLabel><RewardEditor data={data} rewards={questRewards} onAdd={() => addReward('quest', quest.id)} onUpdate={updateReward} onRemove={removeReward} /></div>
            <label className="checkbox-label"><input type="checkbox" checked={Boolean(quest.wait_for_npc_turn_in)} onChange={(event) => updateQuest({ wait_for_npc_turn_in: event.target.checked })} /><span><FieldLabel hint={t('waitForNpcTurnInHint')}>{t('waitForNpcTurnIn')}</FieldLabel></span></label>
          </div>
        </InspectorSection>
        <InspectorSection title={t('learningSteps', { count: steps.length })} open={openSection === 'steps'} onToggle={() => setOpenSection(openSection === 'steps' ? 'quest' : 'steps')}>
          <div className="step-list">
            {steps.map((step, index) => (
              <div className={`step-row-wrap ${selectedStep?.id === step.id ? 'selected' : ''}`} key={step.id}>
                <button className="step-row" onClick={() => { setSelectedStepId(step.id); setOpenSection('steps') }}>
                  <span className="step-index">{String(index + 1).padStart(2, '0')}</span><span className="step-copy"><strong>{step.step_type.replaceAll('_', ' ')}</strong><small>{step.key}</small></span><Icon name="chevron" />
                </button>
                <div className="step-row-actions">
                  <button type="button" className="icon-button tiny" aria-label={t('duplicateStepAria')} title={t('duplicateStepAria')} onClick={() => duplicateStep(step.id)}><Icon name="copy" /></button>
                  <button type="button" className="icon-button tiny" aria-label={t('moveStepUp')} title={t('moveStepUp')} disabled={index === 0} onClick={() => moveStep(step.id, -1)}><Icon name="undo" /></button>
                  <button type="button" className="icon-button tiny" aria-label={t('moveStepDown')} title={t('moveStepDown')} disabled={index === steps.length - 1} onClick={() => moveStep(step.id, 1)}><Icon name="redo" /></button>
                  <button type="button" className="icon-button tiny" aria-label={t('deleteStepAria')} title={t('deleteStepAria')} onClick={() => confirmDeleteStep(step)}><Icon name="close" /></button>
                </div>
              </div>
            ))}
            <button className="add-step-button" onClick={addStep}><Icon name="plus" /> {t('addLearningStep')}</button>
          </div>
        </InspectorSection>
        <InspectorSection title={t('lineSettings')} open={openSection === 'line'} onToggle={() => setOpenSection(openSection === 'line' ? 'quest' : 'line')}>
          <div className="form-stack">
            <label><FieldLabel>{t('questlineName')}</FieldLabel><input className="content-text" dir="auto" value={selectedLine.display_name} onChange={(event) => updateLine({ display_name: event.target.value })} /></label>
            <label><FieldLabel>{t('themeLearningGoal')}</FieldLabel><textarea className="content-text" dir="auto" value={selectedLine.theme ?? ''} onChange={(event) => updateLine({ theme: event.target.value })} rows={3} /></label>
            <label><FieldLabel>{t('defaultGiver')}</FieldLabel><CatalogSelect kind="npc" value={selectedLine.default_giver_external_id ?? ''} data={data} onChange={(value) => updateLine({ default_giver_external_id: value })} /></label>
          </div>
        </InspectorSection>
        {selectedStep && <StepEditor step={selectedStep} />}
      </div>
    </aside>
  )
}
