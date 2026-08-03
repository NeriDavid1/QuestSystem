import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getDialogueLines, getStepType, stepHasDialogueField } from '../../lib/editorData'
import type { QuestStep } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'
import { CatalogSelect } from './CatalogSelect'
import { DialogueLinesEditor } from './DialogueLinesEditor'

export function StepDialogueEditor({
  step,
  onAttachDialogue,
}: {
  step: QuestStep
  onAttachDialogue: (key: string) => void
}) {
  const t = useT()
  const { data, createDialogueForStep, updateDialogue } = useEditorStore()
  const dialogueKey = typeof step.payload.dialogue_id === 'string' ? step.payload.dialogue_id : ''
  const dialogue = data.dialogues.find((item) => item.key === dialogueKey)
  const lines = dialogue ? getDialogueLines(data, dialogue.id) : []
  const dialogueField = getStepType(data, step.step_type)?.fields.find((field) => field.ref?.includes('dialogues'))
  const required = Boolean(dialogueField?.required)
  const hasDialogue = stepHasDialogueField(data, step)
  if (!hasDialogue) return null

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
          <button type="button" className="button subtle compact" onClick={() => createDialogueForStep(step.id)}>
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
                onChange={(value) => updateDialogue(dialogue.id, { speaker_external_id: value || null })}
              />
            </label>
            <DialogueLinesEditor dialogueId={dialogue.id} lines={lines} />
          </>
        ) : (
          <p className="dialogue-empty-hint">{t('dialogueEmptyHint')}</p>
        )}
      </div>
    </div>
  )
}
