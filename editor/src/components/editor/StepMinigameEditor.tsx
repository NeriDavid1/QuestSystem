import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import {
  getMinigameCatalogEntry,
  getMinigameParamsForEntry,
} from '../../lib/minigameParams'
import { getStepMinigame, getStepMinigameKey, stepHasMinigameField } from '../../lib/editorData'
import type { QuestStep } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'
import { MinigameParamsEditor } from './MinigameParamsEditor'

export function StepMinigameEditor({ step }: { step: QuestStep }) {
  const t = useT()
  const { data, updateStep, updateMinigame, createMinigameForStep } = useEditorStore()
  const minigame = getStepMinigame(data, step)
  const catalogEntry = getMinigameCatalogEntry(data, step)
  const paramFields = getMinigameParamsForEntry(catalogEntry)
  const instanceKey = getStepMinigameKey(step)
  const attachInstance = (key: string) =>
    updateStep(step.id, { payload: { ...step.payload, instance_id: key, instance_key: key } })
  const patchMinigame = (patch: Parameters<typeof updateMinigame>[1]) => {
    if (minigame) updateMinigame(minigame.id, patch)
  }
  if (!stepHasMinigameField(data, step)) return null

  return (
    <div className="step-minigame-editor">
      <div className="minigame-heading">
        <span className="minigame-avatar">✦</span>
        <div>
          <strong>{t('stepMinigame')}</strong>
          <small dir="ltr">{minigame ? minigame.key : t('noMinigameAttached')}</small>
        </div>
      </div>
      <div className="form-stack">
        <label>
          <FieldLabel hint={t('optional')}>{t('minigameInstance')}</FieldLabel>
          <select dir="ltr" value={instanceKey} onChange={(event) => attachInstance(event.target.value)}>
            <option value="">{t('chooseMinigame')}</option>
            {data.minigames.map((item) => (
              <option key={item.key} value={item.key}>
                {item.key} · {item.minigame_id ?? item.variant ?? '—'}
              </option>
            ))}
          </select>
        </label>
        <div className="minigame-attach-actions">
          <button type="button" className="button subtle compact" onClick={() => createMinigameForStep(step.id)}>
            <Icon name="plus" /> {t('createMinigameForStep')}
          </button>
        </div>
        {minigame ? (
          <div className="minigame-params">
            <section className="minigame-section minigame-game-params">
              <div className="minigame-params-heading">
                <strong>{t('minigameParamsTitle')}</strong>
                <small>{catalogEntry ? catalogEntry.name : t('minigameParamsUnknownGame')}</small>
              </div>
              <MinigameParamsEditor
                minigame={minigame}
                fields={paramFields}
                onChange={(params) => patchMinigame({ params, minigame_id: minigame.minigame_id ?? catalogEntry?.external_id ?? null })}
              />
            </section>
          </div>
        ) : (
          <p className="minigame-empty-hint">{t('minigameEmptyHint')}</p>
        )}
      </div>
    </div>
  )
}
