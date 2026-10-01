import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import {
  customTasks,
  reactorName,
  taskMinigame,
  taskMode,
  withTask,
  type CustomTask,
  type CustomTaskMode,
} from '../../lib/customSteps'
import { getMinigameCatalogEntryForInstance, getMinigameParamFieldsForInstance } from '../../lib/minigameParams'
import type { QuestStep } from '../../lib/types'
import { FieldLabel } from '../common/FieldLabel'
import { MinigameMock } from '../preview/MinigameMock'
import { MinigameParamsEditor } from './MinigameParamsEditor'

/** A Unity-built step: read-only facts, then one card per task where the minigame is chosen. */
export function CustomStepEditor({ step }: { step: QuestStep }) {
  const t = useT()
  const tasks = customTasks(step)
  const isTaskSet = step.payload.reactor === 'task_set'
  return (
    <div className="custom-step-editor">
      <dl className="custom-step-facts">
        <div><dt>{t('stepType')}</dt><dd>{reactorName(t, step.payload.reactor)}</dd></div>
        <div><dt>{t('customHandler')}</dt><dd dir="ltr">{String(step.payload.handler_id ?? '')}</dd></div>
        {typeof step.payload.display_text === 'string' && <div className="wide"><dd className="content-text" dir="auto">{step.payload.display_text}</dd></div>}
      </dl>
      {isTaskSet && tasks.length > 0 ? (
        <section className="custom-task-list" aria-label={t('customTasksTitle')}>
          <FieldLabel>{t('customTasksTitle')}</FieldLabel>
          {tasks.map((task) => <CustomTaskCard key={task.index} step={step} task={task} />)}
        </section>
      ) : (
        <p className="minigame-empty-hint">{t('customNoTasks')}</p>
      )}
    </div>
  )
}

function CustomTaskCard({ step, task }: { step: QuestStep; task: CustomTask }) {
  const t = useT()
  const { data, updateStep, updateMinigame } = useEditorStore()
  const [editing, setEditing] = useState(false)
  const mode = taskMode(task)
  const minigame = taskMinigame(data, task)
  const catalogEntry = minigame ? getMinigameCatalogEntryForInstance(data, minigame) : undefined
  const lineKey = data.questlines.find((line) => data.quests.some((quest) => quest.id === step.quest_id && quest.questline_id === line.id))?.key
  // This line's own instances first; the full list stays available for reuse.
  const choices = [...data.minigames].sort((a, b) => {
    const own = (key: string) => (lineKey && key.startsWith(`${lineKey}__`) ? 0 : 1)
    return own(a.key) - own(b.key) || a.key.localeCompare(b.key)
  })
  const patchTask = (patch: Partial<CustomTask>) => updateStep(step.id, { payload: withTask(step, task.index, patch) })
  const setMode = (next: CustomTaskMode) => patchTask({ mode: next })
  const pickInstance = (key: string) => {
    const picked = data.minigames.find((item) => item.key === key)
    patchTask({ mode: 'minigame', instance_key: key, minigame_id: picked?.minigame_id ?? undefined })
  }
  const sceneLine = task.scene_no_minigame || !task.scene_minigame
    ? t('customSceneNoGame')
    : t('customSceneGame', { game: task.scene_minigame })

  return (
    <article className={`custom-task-card mode-${mode}`}>
      <header className="custom-task-heading">
        <span className="step-index">{String(task.index + 1).padStart(2, '0')}</span>
        <div>
          <strong dir="ltr">{task.name || t('customTaskLabel', { n: task.index + 1 })}</strong>
          {task.prompt && <small className="content-text" dir="auto">{task.prompt}</small>}
        </div>
        {mode === 'minigame' && minigame && <span className="step-type-tag">{catalogEntry?.name ?? minigame.minigame_id}</span>}
      </header>

      {task.intercepted ? (
        <p className="field-description">{t('customIntercepted')}</p>
      ) : (
        <div className="form-stack">
          <label>
            <FieldLabel hint={sceneLine}>{t('customTaskMode')}</FieldLabel>
            <select value={mode} onChange={(event) => setMode(event.target.value as CustomTaskMode)}>
              <option value="scene">{t('customModeScene')}</option>
              <option value="none">{t('customModeNone')}</option>
              <option value="minigame">{t('customModeMinigame')}</option>
            </select>
          </label>
          {mode === 'minigame' && (
            <label>
              <FieldLabel>{t('minigameInstance')}</FieldLabel>
              <select dir="ltr" value={task.instance_key ?? ''} onChange={(event) => pickInstance(event.target.value)}>
                <option value="">{t('chooseMinigame')}</option>
                {choices.map((item) => (
                  <option key={item.key} value={item.key}>{item.key} · {item.minigame_id ?? item.variant ?? '—'}</option>
                ))}
              </select>
            </label>
          )}
          {mode === 'minigame' && task.instance_key && !minigame && (
            <span className="unresolved-badge">{t('customMissingInstance', { key: task.instance_key })}</span>
          )}
          {mode === 'minigame' && minigame && (
            <div className="custom-task-game">
              <MinigameMock minigameId={minigame.minigame_id} params={minigame.params ?? {}} instruction={minigame.instruction} seed={minigame.key} />
              <button type="button" className="button subtle compact" onClick={() => setEditing(!editing)}>
                {editing ? t('customHideContent') : t('customEditContent')}
              </button>
              {editing && (
                <MinigameParamsEditor
                  minigame={minigame}
                  fields={getMinigameParamFieldsForInstance(data, minigame)}
                  onChange={(params) => updateMinigame(minigame.id, { params })}
                />
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
