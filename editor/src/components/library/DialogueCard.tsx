import { memo, useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getDialogueLines } from '../../lib/editorData'
import { slugify } from '../../lib/editorData'
import type { Dialogue } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { StatusPill } from '../common/StatusPill'
import { Icon } from '../common/Icon'
import { CatalogSelect } from '../editor/CatalogSelect'
import { DialogueLinesEditor } from '../editor/DialogueLinesEditor'

export const DialogueCard = memo(function DialogueCard({
  dialogue,
  data,
  onDelete,
}: {
  dialogue: Dialogue
  data: import('../../lib/types').EditorData
  onDelete: () => void
}) {
  const t = useT()
  const { updateDialogue, duplicateDialogue } = useEditorStore()
  const [editing, setEditing] = useState(false)
  const lines = getDialogueLines(data, dialogue.id)
  return (
    <article className={`dialogue-card ${editing ? 'editing' : ''}`}>
      <div className="dialogue-card-top">
        <span className="dialogue-avatar">{dialogue.speaker_external_id?.slice(0, 1) ?? '?'}</span>
        <div><h3 dir="ltr">{dialogue.key}</h3><p dir="auto">{dialogue.speaker_external_id ?? t('unknownSpeaker')} · {dialogue.source_path ?? t('editorFallback')}</p></div>
        <StatusPill status={t('linesCountPill', { count: lines.length })} />
        <button type="button" className="icon-button tiny" aria-label={t('duplicateDialogueAria')} title={t('duplicateDialogueAria')} onClick={() => duplicateDialogue(dialogue.id)}><Icon name="copy" /></button>
        <button type="button" className="icon-button tiny" aria-label={t('deleteDialogueAria')} title={t('deleteDialogueAria')} onClick={onDelete}><Icon name="close" /></button>
      </div>
      {editing ? (
        <div className="dialogue-editor">
          <label><FieldLabel hint={t('dialogueKeyHint')}>{t('dialogueKey')}</FieldLabel><input dir="ltr" value={dialogue.key} onChange={(event) => updateDialogue(dialogue.id, { key: slugify(event.target.value) || dialogue.key })} /></label>
          <label><FieldLabel>{t('speaker')}</FieldLabel><CatalogSelect kind="npc" value={dialogue.speaker_external_id ?? ''} data={data} onChange={(value) => updateDialogue(dialogue.id, { speaker_external_id: value || null })} /></label>
          <DialogueLinesEditor dialogueId={dialogue.id} lines={lines} />
          <button type="button" className="button subtle compact" onClick={() => setEditing(false)}>{t('doneEditing')}</button>
        </div>
      ) : (
        <><div className="dialogue-lines">{lines.slice(0, 3).map((line) => <p className="content-text" dir="auto" key={line.id}><span>{line.locale}</span>{line.content || t('emptyDialogueLine')}</p>)}</div><button type="button" className="button subtle compact" onClick={() => setEditing(true)}>{t('editDialogue')}</button></>
      )}
    </article>
  )
})
