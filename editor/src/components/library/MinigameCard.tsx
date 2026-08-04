import { memo, useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import type { MinigameInstance } from '../../lib/types'
import { getMinigameParamFieldsForInstance } from '../../lib/minigameParams'
import { Icon } from '../common/Icon'
import { MinigameParamsEditor } from '../editor/MinigameParamsEditor'

function promptPreview(minigame: MinigameInstance): string {
  const prompt = minigame.params?.prompt
  return typeof prompt === 'string' && prompt.trim() ? prompt.trim() : minigame.key
}

function ParamSummary({ minigame }: { minigame: MinigameInstance }) {
  const entries = Object.entries(minigame.params ?? {}).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  if (entries.length === 0) return null
  return (
    <ul className="minigame-param-summary">
      {entries.map(([name, value]) => (
        <li key={name}>
          <code>{name}</code>
          <span dir="ltr">{Array.isArray(value) ? `[${value.length}]` : String(value)}</span>
        </li>
      ))}
    </ul>
  )
}

export const MinigameCard = memo(function MinigameCard({
  minigame,
  onDelete,
}: {
  minigame: MinigameInstance
  onDelete: () => void
}) {
  const t = useT()
  const { data, updateMinigame } = useEditorStore()
  const [editing, setEditing] = useState(false)
  const paramFields = getMinigameParamFieldsForInstance(data, minigame)
  return (
    <article className={`library-card minigame-card ${editing ? 'editing' : ''}`}>
      <div className="library-card-icon">✦</div>
      {editing ? (
        <div className="library-card-copy minigame-editor">
          <p className="eyebrow">{[minigame.minigame_id, minigame.variant].filter(Boolean).join(' · ') || t('activity')}</p>
          <h3 dir="ltr">{minigame.key}</h3>
          {paramFields.length > 0 ? (
            <div className="minigame-game-params minigame-section">
              <div className="minigame-params-heading">
                <strong>{t('minigameParamsTitle')}</strong>
              </div>
              <MinigameParamsEditor
                minigame={minigame}
                fields={paramFields}
                onChange={(params) => updateMinigame(minigame.id, { params })}
              />
            </div>
          ) : (
            <p className="minigame-empty-hint">{t('minigameParamsUnknownGame')}</p>
          )}
          <button type="button" className="button subtle compact" onClick={() => setEditing(false)}>{t('doneEditing')}</button>
        </div>
      ) : (
        <div className="library-card-copy">
          <p className="eyebrow">{[minigame.minigame_id, minigame.variant].filter(Boolean).join(' · ') || t('activity')}</p>
          <h3 className="content-text" dir="auto">{promptPreview(minigame)}</h3>
          <code>{minigame.key}</code>
          <ParamSummary minigame={minigame} />
          <button type="button" className="button subtle compact" onClick={() => setEditing(true)}>{t('editMinigameParams')}</button>
        </div>
      )}
      <span className="library-status">{minigame.minigame_id ?? minigame.variant ?? '—'}</span>
      <button type="button" className="icon-button tiny minigame-delete" aria-label={t('deleteMinigameAria')} title={t('deleteMinigameAria')} onClick={onDelete}><Icon name="close" /></button>
    </article>
  )
})
