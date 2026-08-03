import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getStepRewards, getStepType, stepHasDialogueField } from '../../lib/editorData'
import type { QuestStep } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'
import { StepFieldEditor } from './StepFieldEditor'
import { StepDialogueEditor } from './StepDialogueEditor'
import { StepMinigameEditor } from './StepMinigameEditor'
import { RewardEditor } from './RewardEditor'

export function StepEditor({ step }: { step: QuestStep }) {
  const t = useT()
  const { data, updateStep, addReward, updateReward, removeReward } = useEditorStore()
  const definition = getStepType(data, step.step_type)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const updatePayload = (patch: Record<string, unknown>) => updateStep(step.id, { payload: { ...step.payload, ...patch } })
  const payloadFields = definition?.fields.filter((field) => !field.ref?.includes('dialogues') && !field.ref?.includes('minigame_instances')) ?? []
  const showDialogue = stepHasDialogueField(data, step)
  return (
    <section className="step-editor">
      <div className="step-editor-heading"><div><p className="eyebrow">{t('selectedStep')}</p><h3>{step.step_type.replaceAll('_', ' ')}</h3></div><span className="step-type-tag">{definition?.unity_objective ?? t('customStep')}</span></div>
      <p className="step-description">{definition?.description ?? t('configurePayload')}</p>
      <div className="form-stack">
        <label><FieldLabel>{t('stepType')}</FieldLabel><select dir="ltr" value={step.step_type} onChange={(event) => updateStep(step.id, { step_type: event.target.value })}>{data.stepTypes.map((type) => <option key={type.id} value={type.id} title={type.description ?? undefined}>{type.id.replaceAll('_', ' ')}{type.description ? ` — ${type.description}` : ''}</option>)}</select></label>
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
