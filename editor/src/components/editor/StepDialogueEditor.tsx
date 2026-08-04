import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getStepType, stepHasDialogueField } from '../../lib/editorData'
import type { QuestStep } from '../../lib/types'
import { DialogueAttachmentEditor } from './DialogueAttachmentEditor'

export function StepDialogueEditor({
  step,
  onAttachDialogue,
}: {
  step: QuestStep
  onAttachDialogue: (key: string) => void
}) {
  const t = useT()
  const { data, createDialogueForStep } = useEditorStore()
  const dialogueKey = typeof step.payload.dialogue_id === 'string' ? step.payload.dialogue_id : ''
  const dialogueField = getStepType(data, step.step_type)?.fields.find((field) => field.ref?.includes('dialogues'))
  const required = Boolean(dialogueField?.required)
  if (!stepHasDialogueField(data, step)) return null

  return (
    <DialogueAttachmentEditor
      dialogueKey={dialogueKey}
      title={t('questDialogue')}
      createLabel={t('createDialogueForStep')}
      required={required}
      onAttach={onAttachDialogue}
      onCreate={() => createDialogueForStep(step.id)}
    />
  )
}
