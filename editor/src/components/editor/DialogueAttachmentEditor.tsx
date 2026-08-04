import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getDialogueLines } from '../../lib/editorData'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'
import { CatalogSelect } from './CatalogSelect'
import { DialogueLinesEditor } from './DialogueLinesEditor'

export function DialogueAttachmentEditor({
  dialogueKey,
  title,
  createLabel,
  required = false,
  onAttach,
  onCreate,
}: {
  dialogueKey: string
  title: string
  createLabel: string
  required?: boolean
  onAttach: (key: string) => void
  onCreate: () => void
}) {
  const t = useT()
  const { data, updateDialogue } = useEditorStore()
  const dialogue = data.dialogues.find((item) => item.key === dialogueKey)
  const lines = dialogue ? getDialogueLines(data, dialogue.id) : []

  return (
    <div className="step-dialogue-editor">
      <div className="dialogue-heading">
        <span className="dialogue-avatar">{dialogue?.speaker_external_id?.slice(0, 1) ?? 'ד'}</span>
        <div>
          <strong>{title}</strong>
          <small dir="ltr">{dialogue ? dialogue.key : t('noDialogueAttached')}</small>
        </div>
      </div>
      <div className="form-stack">
        <label>
          <FieldLabel hint={required ? t('required') : t('optional')}>{t('dialogue')}</FieldLabel>
          <select dir="ltr" value={dialogueKey} onChange={(event) => onAttach(event.target.value)}>
            <option value="">{t('chooseDialogue')}</option>
            {data.dialogues.map((item) => (
              <option key={item.key} value={item.key}>{item.key}</option>
            ))}
          </select>
        </label>
        <div className="dialogue-attach-actions">
          <button type="button" className="button subtle compact" onClick={onCreate}>
            <Icon name="plus" /> {createLabel}
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
