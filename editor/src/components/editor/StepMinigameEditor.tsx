import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getStepMinigame, stepHasMinigameField } from '../../lib/editorData'
import type { QuestStep } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'

function toTaskList(tasks: unknown): string[] {
  if (!Array.isArray(tasks)) return []
  return tasks.map((task) => (typeof task === 'string' ? task : String(task ?? '')))
}

export function StepMinigameEditor({ step }: { step: QuestStep }) {
  const t = useT()
  const { data, updateStep, updateMinigame, createMinigameForStep } = useEditorStore()
  const minigame = getStepMinigame(data, step)
  const instanceKey = typeof step.payload.instance_id === 'string' ? step.payload.instance_id : ''
  const tasks = minigame ? toTaskList(minigame.tasks) : []
  const attachInstance = (key: string) => updateStep(step.id, { payload: { ...step.payload, instance_id: key } })
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
              <option key={item.key} value={item.key}>{item.key} · {item.variant ?? item.locale}</option>
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
                <input dir="ltr" value={minigame.variant ?? ''} placeholder="word_spelling" onChange={(event) => patchMinigame({ variant: event.target.value || null })} />
              </label>
            </div>
            <label>
              <FieldLabel>{t('instruction')}</FieldLabel>
              <textarea className="content-text" dir="auto" rows={2} value={minigame.instruction ?? ''} placeholder={t('instructionPlaceholder')} onChange={(event) => patchMinigame({ instruction: event.target.value || null })} />
            </label>
            <label>
              <FieldLabel>{t('minigameTarget')}</FieldLabel>
              <input className="content-text" dir="auto" value={minigame.target ?? ''} onChange={(event) => patchMinigame({ target: event.target.value || null })} />
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
          </div>
        ) : (
          <p className="minigame-empty-hint">{t('minigameEmptyHint')}</p>
        )}
      </div>
    </div>
  )
}
