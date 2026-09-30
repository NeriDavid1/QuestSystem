import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { orderedStepTypes, stepSummary, stepTypeHint, stepTypeIcon, stepTypeName } from '../../lib/stepPresentation'
import type { QuestStep } from '../../lib/types'
import { Icon } from '../common/Icon'

export function StepList({ steps, onSelect }: { steps: QuestStep[]; onSelect: (stepId: string) => void }) {
  const t = useT()
  const { data, issues, selectedStepId, addStep, duplicateStep, moveStep, removeStep, openConfirm } = useEditorStore()
  const [picking, setPicking] = useState(false)

  const confirmDeleteStep = (step: QuestStep) => {
    openConfirm({
      title: t('deleteStepAria'),
      message: `${stepTypeName(t, step.step_type)} · ${stepSummary(t, data, step)}`,
      confirmLabel: t('deleteStepAria'),
      tone: 'danger',
      onConfirm: () => removeStep(step.id),
    })
  }

  const pick = (stepType: string) => {
    addStep(stepType)
    setPicking(false)
  }

  return (
    <div className="step-list">
      {steps.map((step, index) => {
        const stepIssues = issues.filter((issue) => issue.entityId === step.id)
        const severity = stepIssues.some((issue) => issue.severity === 'error') ? 'error' : stepIssues.length ? 'warning' : ''
        return (
          <div className={`step-row-wrap ${selectedStepId === step.id ? 'selected' : ''}`} key={step.id}>
            <button className={`step-row ${selectedStepId === step.id ? 'selected' : ''}`} onClick={() => onSelect(step.id)}>
              <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="step-type-icon" aria-hidden="true">{stepTypeIcon(step.step_type)}</span>
              <span className="step-copy">
                <strong>{stepTypeName(t, step.step_type)}</strong>
                <small className="content-text" dir="auto">{stepSummary(t, data, step)}</small>
              </span>
              {severity && <span className={`step-issue-dot ${severity}`} title={t('stepHasIssues', { count: stepIssues.length })} aria-label={t('stepHasIssues', { count: stepIssues.length })} />}
              <Icon name="chevron" />
            </button>
            <div className="step-row-actions">
              <button type="button" className="icon-button tiny" aria-label={t('duplicateStepAria')} title={t('duplicateStepAria')} onClick={() => duplicateStep(step.id)}><Icon name="copy" /></button>
              <button type="button" className="icon-button tiny" aria-label={t('moveStepUp')} title={t('moveStepUp')} disabled={index === 0} onClick={() => moveStep(step.id, -1)}><Icon name="undo" /></button>
              <button type="button" className="icon-button tiny" aria-label={t('moveStepDown')} title={t('moveStepDown')} disabled={index === steps.length - 1} onClick={() => moveStep(step.id, 1)}><Icon name="redo" /></button>
              <button type="button" className="icon-button tiny" aria-label={t('deleteStepAria')} title={t('deleteStepAria')} onClick={() => confirmDeleteStep(step)}><Icon name="close" /></button>
            </div>
          </div>
        )
      })}
      {picking ? (
        <div className="step-type-picker" role="group" aria-label={t('chooseStepTypeTitle')}>
          <div className="step-type-picker-heading">
            <div><strong>{t('chooseStepTypeTitle')}</strong><small>{t('chooseStepTypeCopy')}</small></div>
            <button type="button" className="icon-button tiny" aria-label={t('cancel')} title={t('cancel')} onClick={() => setPicking(false)}><Icon name="close" /></button>
          </div>
          {orderedStepTypes(data).map((definition) => (
            <button type="button" className="step-type-option" key={definition.id} onClick={() => pick(definition.id)}>
              <span className="step-type-icon" aria-hidden="true">{stepTypeIcon(definition.id)}</span>
              <span className="step-copy"><strong>{stepTypeName(t, definition.id)}</strong><small>{stepTypeHint(t, definition)}</small></span>
            </button>
          ))}
        </div>
      ) : (
        <button className="add-step-button" onClick={() => setPicking(true)}><Icon name="plus" /> {t('addLearningStep')}</button>
      )}
    </div>
  )
}
