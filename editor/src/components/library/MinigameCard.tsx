import { memo, useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import type { MinigameInstance } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'

export const MinigameCard = memo(function MinigameCard({
  minigame,
  onDelete,
}: {
  minigame: MinigameInstance
  onDelete: () => void
}) {
  const t = useT()
  const { updateMinigame } = useEditorStore()
  const [editing, setEditing] = useState(false)
  return (
    <article className={`library-card minigame-card ${editing ? 'editing' : ''}`}>
      <div className="library-card-icon">✦</div>
      {editing ? (
        <div className="library-card-copy minigame-editor">
          <p className="eyebrow">{minigame.variant ?? t('activity')} · {minigame.locale}</p>
          <h3 dir="ltr">{minigame.key}</h3>
          <label><FieldLabel>{t('instruction')}</FieldLabel><textarea className="content-text" dir="auto" rows={2} value={minigame.instruction ?? ''} onChange={(event) => updateMinigame(minigame.id, { instruction: event.target.value || null })} /></label>
          <label><FieldLabel>{t('successMessage')}</FieldLabel><input className="content-text" dir="auto" value={minigame.success ?? ''} onChange={(event) => updateMinigame(minigame.id, { success: event.target.value || null })} /></label>
          <button type="button" className="button subtle compact" onClick={() => setEditing(false)}>{t('doneEditing')}</button>
        </div>
      ) : (
        <div className="library-card-copy"><p className="eyebrow">{minigame.variant ?? t('activity')} · {minigame.locale}</p><h3 className="content-text" dir="auto">{minigame.instruction ?? minigame.key}</h3><code>{minigame.key}</code><p className="content-text" dir="auto">{minigame.success ?? t('localizedMinigame')}</p><button type="button" className="button subtle compact" onClick={() => setEditing(true)}>{t('editBrief')}</button></div>
      )}
      <span className="library-status">{minigame.locale}</span>
      <button type="button" className="icon-button tiny minigame-delete" aria-label={t('deleteMinigameAria')} title={t('deleteMinigameAria')} onClick={onDelete}><Icon name="close" /></button>
    </article>
  )
})
