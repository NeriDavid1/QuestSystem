import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getStepRewards, getStepType, stepHasDialogueField } from '../../lib/editorData'
import { orderedStepTypes, retypeStepPayload, stepTypeHint, stepTypeIcon, stepTypeName } from '../../lib/stepPresentation'
import type { QuestStep } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'
import { StepFieldEditor } from './StepFieldEditor'
import { StepDialogueEditor } from './StepDialogueEditor'
import { StepMinigameEditor } from './StepMinigameEditor'
import { RewardEditor } from './RewardEditor'

export function StepEditor({ step }: { step: QuestStep }) {
  const t = useT()
  const { data, selectedQuest, selectedLine, updateStep, addReward, updateReward, removeReward } = useEditorStore()
  const definition = getStepType(data, step.step_type)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const updatePayload = (patch: Record<string, unknown>) => updateStep(step.id, { payload: { ...step.payload, ...patch } })
  const payloadFields = definition?.fields.filter((field) => !field.ref?.includes('dialogues') && !field.ref?.includes('minigame_instances')) ?? []
  const showDialogue = stepHasDialogueField(data, step)
  const changeType = (stepType: string) => updateStep(step.id, {
    step_type: stepType,
    payload: retypeStepPayload(getStepType(data, stepType), step.payload, {
      giver: selectedQuest?.giver_external_id ?? selectedLine?.default_giver_external_id ?? null,
    }),
  })
  return (
    <section className="step-editor">
      <div className="step-editor-heading"><div><p className="eyebrow">{t('selectedStep')}</p><h3><span className="step-type-icon" aria-hidden="true">{stepTypeIcon(step.step_type)}</span> {stepTypeName(t, step.step_type)}</h3></div><span className="step-type-tag" title={step.key}>{definition?.unity_objective ?? t('customStep')}</span></div>
      <p className="step-description">{definition ? stepTypeHint(t, definition) : t('configurePayload')}</p>
      <div className="form-stack">
        <label><FieldLabel>{t('stepType')}</FieldLabel><select dir="auto" value={step.step_type} onChange={(event) => changeType(event.target.value)}>{orderedStepTypes(data).map((type) => <option key={type.id} value={type.id} title={type.id}>{stepTypeIcon(type.id)} {stepTypeName(t, type.id)}</option>)}</select></label>
        {payloadFields.map((field) => <StepFieldEditor key={field.name} field={field} step={step} data={data} onPayloadChange={updatePayload} />)}
        <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? t('hidePayload') : t('showPayload')} <Icon name="chevron" /></button>
        {showAdvanced && <div className="payload-preview"><code>{JSON.stringify(step.payload, null, 2)}</code></div>}
      </div>
      <StepMinigameEditor step={step} />
      {showDialogue && <StepDialogueEditor step={step} onAttachDialogue={(key) => updatePayload({ dialogue_id: key })} />}
      <div className="editor-subsection"><FieldLabel hint={t('stepRewardsHint')}>{t('stepRewards')}</FieldLabel><RewardEditor data={data} rewards={getStepRewards(data, step.id)} onAdd={() => addReward('step', step.id)} onUpdate={updateReward} onRemove={removeReward} /></div>
    </section>
  )
}
