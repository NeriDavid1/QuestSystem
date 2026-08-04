import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import {
  getMinigameCatalogEntry,
  getMinigameParamsForEntry,
  getMinigameVariantsForEntry,
  seedParamsFromBrief,
} from '../../lib/minigameParams'
import { getStepMinigame, getStepMinigameKey, stepHasMinigameField } from '../../lib/editorData'
import type { QuestStep } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'
import { MinigameParamsEditor } from './MinigameParamsEditor'

function toTaskList(tasks: unknown): string[] {
  if (!Array.isArray(tasks)) return []
  return tasks.map((task) => (typeof task === 'string' ? task : String(task ?? '')))
}

export function StepMinigameEditor({ step }: { step: QuestStep }) {
  const t = useT()
  const { data, updateStep, updateMinigame, createMinigameForStep } = useEditorStore()
  const minigame = getStepMinigame(data, step)
  const catalogEntry = getMinigameCatalogEntry(data, step)
  const paramFields = getMinigameParamsForEntry(catalogEntry)
  const gameVariants = getMinigameVariantsForEntry(catalogEntry)
  const instanceKey = getStepMinigameKey(step)
  const tasks = minigame ? toTaskList(minigame.tasks) : []
  const attachInstance = (key: string) =>
    updateStep(step.id, { payload: { ...step.payload, instance_id: key, instance_key: key } })
  const patchMinigame = (patch: Parameters<typeof updateMinigame>[1]) => {
    if (minigame) updateMinigame(minigame.id, patch)
  }
  if (!stepHasMinigameField(data, step)) return null

  const currentVariant = minigame?.variant ?? ''
  const variantOptions = gameVariants.includes(currentVariant) ? gameVariants : [...gameVariants, currentVariant].filter(Boolean)

  const syncTargetToParams = (target: string) => {
    if (!minigame) return
    const params = seedParamsFromBrief(catalogEntry, minigame.params ?? {}, target, minigame.instruction)
    patchMinigame({ target: target || null, params, minigame_id: minigame.minigame_id ?? catalogEntry?.external_id ?? null })
  }

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
                {item.key} · {item.minigame_id ?? item.variant ?? item.locale}
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
            <section className="minigame-section">
              <div className="minigame-params-heading">
                <strong>{t('minigameBriefTitle')}</strong>
                <small>{t('minigameBriefHint')}</small>
              </div>
              <div className="form-row">
                <label>
                  <FieldLabel>{t('locale')}</FieldLabel>
                  <select dir="ltr" value={minigame.locale} onChange={(event) => patchMinigame({ locale: event.target.value })}>
                    <option value="he">he</option>
                    <option value="en">en</option>
                  </select>
                </label>
                <label>
                  <FieldLabel>{t('minigameVariant')}</FieldLabel>
                  {variantOptions.length > 0 ? (
                    <select dir="ltr" value={currentVariant} onChange={(event) => patchMinigame({ variant: event.target.value || null })}>
                      <option value="">—</option>
                      {variantOptions.map((variant) => (
                        <option key={variant} value={variant}>{variant}</option>
                      ))}
                    </select>
                  ) : (
                    <input dir="ltr" value={currentVariant} placeholder="word_spelling" onChange={(event) => patchMinigame({ variant: event.target.value || null })} />
                  )}
                </label>
              </div>
              <label>
                <FieldLabel>{t('instruction')}</FieldLabel>
                <textarea
                  className="content-text"
                  dir="auto"
                  rows={2}
                  value={minigame.instruction ?? ''}
                  placeholder={t('instructionPlaceholder')}
                  onChange={(event) => patchMinigame({ instruction: event.target.value || null })}
                />
              </label>
              <label>
                <FieldLabel>{t('minigameTarget')}</FieldLabel>
                <input
                  className="content-text"
                  dir="auto"
                  value={minigame.target ?? ''}
                  onChange={(event) => syncTargetToParams(event.target.value)}
                />
              </label>
              <label>
                <FieldLabel>{t('successMessage')}</FieldLabel>
                <input className="content-text" dir="auto" value={minigame.success ?? ''} onChange={(event) => patchMinigame({ success: event.target.value || null })} />
              </label>
              <div className="minigame-tasks">
                <FieldLabel>{t('minigameTasks')}</FieldLabel>
                {tasks.length === 0 && <p className="minigame-empty-hint">{t('minigameTasksEmpty')}</p>}
                {tasks.map((task, index) => (
                  <div className="minigame-task-row" key={index}>
                    <label>
                      <span className="minigame-task-index">{index + 1}</span>
                      <input
                        className="content-text"
                        dir="auto"
                        value={task}
                        placeholder={t('taskPlaceholder')}
                        onChange={(event) => {
                          const next = tasks.map((item, taskIndex) => (taskIndex === index ? event.target.value : item))
                          patchMinigame({ tasks: next })
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-button tiny"
                      aria-label={t('removeTask', { n: index + 1 })}
                      title={t('removeTask', { n: index + 1 })}
                      onClick={() => patchMinigame({ tasks: tasks.filter((_, taskIndex) => taskIndex !== index) })}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
                <button type="button" className="button subtle compact" onClick={() => patchMinigame({ tasks: [...tasks, ''] })}>
                  <Icon name="plus" /> {t('addTask')}
                </button>
              </div>
            </section>

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
