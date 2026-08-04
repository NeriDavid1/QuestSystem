import { useState } from 'react'
import { useT, type MessageKey } from '../../i18n'
import type { MinigameInstance } from '../../lib/types'
import {
  normalizeParamValue,
  readMinigameParam,
  type MinigameParamField,
} from '../../lib/minigameParams'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'

type LetterTile = { id: string; value: string }
type WordTask = { id: string; image: string; fullWord: string; missingIndices: number[] }

function isJsonText(value: unknown): boolean {
  try {
    JSON.parse(String(value))
    return true
  } catch {
    return false
  }
}

function asLetterTiles(value: unknown): LetterTile[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      return {
        id: String(record.id ?? `letter_${index + 1}`),
        value: String(record.value ?? ''),
      }
    }
    return { id: `letter_${index + 1}`, value: String(item ?? '') }
  })
}

function asWordTasks(value: unknown): WordTask[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const missing = Array.isArray(record.missingIndices)
        ? record.missingIndices.map((entry) => Math.trunc(Number(entry))).filter((entry) => Number.isFinite(entry))
        : []
      return {
        id: String(record.id ?? `task_${index + 1}`),
        image: String(record.image ?? ''),
        fullWord: String(record.fullWord ?? ''),
        missingIndices: missing,
      }
    }
    return { id: `task_${index + 1}`, image: '', fullWord: String(item ?? ''), missingIndices: [] }
  })
}

function JsonParamInput({
  field,
  minigame,
  onChange,
}: {
  field: MinigameParamField
  minigame: MinigameInstance
  onChange: (params: Record<string, unknown>) => void
}) {
  const t = useT()
  const current = readMinigameParam(minigame, field)
  const [text, setText] = useState(() =>
    typeof current === 'object' && current !== null ? JSON.stringify(current, null, 2) : String(current ?? ''),
  )
  const [error, setError] = useState(false)

  return (
    <div className={`minigame-param-json ${error ? 'invalid' : ''}`}>
      <textarea
        className="content-text minigame-param-json-input"
        dir="ltr"
        rows={4}
        value={text}
        placeholder="[ ]"
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          const ok = isJsonText(next)
          setError(!ok)
          if (ok) onChange({ ...(minigame.params ?? {}), [field.name]: JSON.parse(next) })
        }}
      />
      <span className="minigame-param-json-hint">{error ? t('minigameParamJsonInvalid') : t('minigameParamJsonHint')}</span>
    </div>
  )
}

function ArrayParamInput({
  field,
  minigame,
  onChange,
}: {
  field: MinigameParamField
  minigame: MinigameInstance
  onChange: (params: Record<string, unknown>) => void
}) {
  const t = useT()
  const value = readMinigameParam(minigame, field)
  const items = Array.isArray(value) ? value.map((item) => String(item ?? '')) : ['']
  const commit = (next: string[]) => onChange({ ...(minigame.params ?? {}), [field.name]: normalizeParamValue(field, next) })
  const numeric = field.type === 'integerArray'

  return (
    <div className="minigame-param-array">
      {items.length === 0 && <p className="minigame-empty-hint">{t('minigameParamsArrayEmpty')}</p>}
      {items.map((item, index) => (
        <div className="minigame-param-row" key={index}>
          <label>
            <span className="minigame-task-index">{index + 1}</span>
            <input
              className="content-text"
              dir="ltr"
              type={numeric ? 'number' : 'text'}
              value={item}
              onChange={(event) => commit(items.map((entry, entryIndex) => (entryIndex === index ? event.target.value : entry)))}
            />
          </label>
          <button
            type="button"
            className="icon-button tiny"
            aria-label={t('minigameParamRemove', { n: index + 1 })}
            title={t('minigameParamRemove', { n: index + 1 })}
            onClick={() => commit(items.filter((_, entryIndex) => entryIndex !== index))}
          >
            <Icon name="close" />
          </button>
        </div>
      ))}
      <button type="button" className="button subtle compact" onClick={() => commit([...items, ''])}>
        <Icon name="plus" /> {t('minigameParamAdd')}
      </button>
    </div>
  )
}

function LettersEditor({
  minigame,
  onChange,
}: {
  minigame: MinigameInstance
  onChange: (params: Record<string, unknown>) => void
}) {
  const t = useT()
  const letters = asLetterTiles(readMinigameParam(minigame, { name: 'letters', labelKey: 'minigameParamLetters', type: 'json' }))
  const commit = (next: LetterTile[]) => onChange({ ...(minigame.params ?? {}), letters: next })

  return (
    <div className="minigame-structured-list">
      {letters.length === 0 && <p className="minigame-empty-hint">{t('minigameParamsArrayEmpty')}</p>}
      {letters.map((letter, index) => (
        <div className="minigame-structured-row" key={`${letter.id}-${index}`}>
          <label>
            <span className="minigame-task-index">id</span>
            <input
              className="content-text"
              dir="ltr"
              value={letter.id}
              onChange={(event) =>
                commit(letters.map((entry, entryIndex) => (entryIndex === index ? { ...entry, id: event.target.value } : entry)))
              }
            />
          </label>
          <label>
            <span className="minigame-task-index">{t('minigameParamLetter')}</span>
            <input
              className="content-text"
              dir="ltr"
              maxLength={4}
              value={letter.value}
              onChange={(event) =>
                commit(letters.map((entry, entryIndex) => (entryIndex === index ? { ...entry, value: event.target.value } : entry)))
              }
            />
          </label>
          <button
            type="button"
            className="icon-button tiny"
            aria-label={t('minigameParamRemove', { n: index + 1 })}
            onClick={() => commit(letters.filter((_, entryIndex) => entryIndex !== index))}
          >
            <Icon name="close" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button subtle compact"
        onClick={() => commit([...letters, { id: `letter_${letters.length + 1}`, value: '' }])}
      >
        <Icon name="plus" /> {t('minigameParamAddLetter')}
      </button>
    </div>
  )
}

function WordTasksEditor({
  minigame,
  onChange,
}: {
  minigame: MinigameInstance
  onChange: (params: Record<string, unknown>) => void
}) {
  const t = useT()
  const tasks = asWordTasks(readMinigameParam(minigame, { name: 'wordTasks', labelKey: 'minigameParamWordTasks', type: 'json' }))
  const commit = (next: WordTask[]) => onChange({ ...(minigame.params ?? {}), wordTasks: next })

  return (
    <div className="minigame-structured-list">
      {tasks.length === 0 && <p className="minigame-empty-hint">{t('minigameParamsArrayEmpty')}</p>}
      {tasks.map((task, index) => (
        <div className="minigame-word-task-card" key={`${task.id}-${index}`}>
          <div className="minigame-structured-row">
            <label>
              <span className="minigame-task-index">id</span>
              <input
                className="content-text"
                dir="ltr"
                value={task.id}
                onChange={(event) =>
                  commit(tasks.map((entry, entryIndex) => (entryIndex === index ? { ...entry, id: event.target.value } : entry)))
                }
              />
            </label>
            <label>
              <span className="minigame-task-index">{t('minigameParamFullWord')}</span>
              <input
                className="content-text"
                dir="ltr"
                value={task.fullWord}
                onChange={(event) =>
                  commit(tasks.map((entry, entryIndex) => (entryIndex === index ? { ...entry, fullWord: event.target.value } : entry)))
                }
              />
            </label>
            <button
              type="button"
              className="icon-button tiny"
              aria-label={t('minigameParamRemove', { n: index + 1 })}
              onClick={() => commit(tasks.filter((_, entryIndex) => entryIndex !== index))}
            >
              <Icon name="close" />
            </button>
          </div>
          <label>
            <FieldLabel hint={t('minigameParamMissingIndicesHint')}>{t('minigameParamMissingIndices')}</FieldLabel>
            <input
              className="content-text"
              dir="ltr"
              value={task.missingIndices.join(', ')}
              placeholder="0, 2"
              onChange={(event) => {
                const missingIndices = event.target.value
                  .split(/[,\s]+/)
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .map((part) => Math.trunc(Number(part)))
                  .filter((part) => Number.isFinite(part))
                commit(tasks.map((entry, entryIndex) => (entryIndex === index ? { ...entry, missingIndices } : entry)))
              }}
            />
          </label>
          <label>
            <FieldLabel>{t('minigameParamTaskImage')}</FieldLabel>
            <input
              className="content-text"
              dir="ltr"
              value={task.image}
              placeholder="Assets/… or relative path"
              onChange={(event) =>
                commit(tasks.map((entry, entryIndex) => (entryIndex === index ? { ...entry, image: event.target.value } : entry)))
              }
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="button subtle compact"
        onClick={() =>
          commit([...tasks, { id: `task_${tasks.length + 1}`, image: '', fullWord: '', missingIndices: [] }])
        }
      >
        <Icon name="plus" /> {t('minigameParamAddWordTask')}
      </button>
    </div>
  )
}

function AdvancedAssetField({
  field,
  minigame,
  onChange,
}: {
  field: MinigameParamField
  minigame: MinigameInstance
  onChange: (params: Record<string, unknown>) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(Boolean(readMinigameParam(minigame, field)))
  const value = readMinigameParam(minigame, field)

  return (
    <div className="minigame-param-advanced">
      <button type="button" className="button subtle compact" onClick={() => setOpen((current) => !current)}>
        <Icon name={open ? 'close' : 'plus'} /> {t('minigameParamAdvancedToggle')}
      </button>
      {open && (
        <label className="minigame-param-field">
          <FieldLabel hint={field.hintKey ? t(field.hintKey as MessageKey) : undefined}>
            {t(field.labelKey as MessageKey)} <code className="minigame-param-name">{field.name}</code>
          </FieldLabel>
          <input
            className="content-text"
            dir="ltr"
            value={String(value ?? '')}
            placeholder="Assets/…"
            onChange={(event) => onChange({ ...(minigame.params ?? {}), [field.name]: event.target.value })}
          />
        </label>
      )}
    </div>
  )
}

/**
 * Renders the per-game content parameters declared by the catalog minigame entry
 * (its `content_fields` metadata), matching the Unity data ScriptableObjects.
 */
export function MinigameParamsEditor({
  minigame,
  fields,
  onChange,
}: {
  minigame: MinigameInstance
  fields: MinigameParamField[]
  onChange: (params: Record<string, unknown>) => void
}) {
  const t = useT()
  const params = minigame.params ?? {}
  const setScalar = (field: MinigameParamField, value: unknown) => {
    onChange({ ...params, [field.name]: normalizeParamValue(field, value) })
  }

  return (
    <div className="minigame-params-editor">
      {fields.length === 0 ? (
        <p className="minigame-empty-hint">{t('minigameParamsNone')}</p>
      ) : (
        fields.map((field) => {
          if (field.name === 'letters') {
            return (
              <div className="minigame-param-field" key={field.name}>
                <FieldLabel>{t(field.labelKey as MessageKey)} <code className="minigame-param-name">{field.name}</code></FieldLabel>
                <LettersEditor minigame={minigame} onChange={onChange} />
              </div>
            )
          }
          if (field.name === 'wordTasks') {
            return (
              <div className="minigame-param-field" key={field.name}>
                <FieldLabel>{t(field.labelKey as MessageKey)} <code className="minigame-param-name">{field.name}</code></FieldLabel>
                <WordTasksEditor minigame={minigame} onChange={onChange} />
              </div>
            )
          }
          if (field.name === 'wordRevealDatabase') {
            return <AdvancedAssetField key={field.name} field={field} minigame={minigame} onChange={onChange} />
          }

          const value = readMinigameParam(minigame, field)
          return (
            <label className="minigame-param-field" key={field.name}>
              <FieldLabel hint={field.hintKey ? t(field.hintKey as MessageKey) : undefined}>
                {t(field.labelKey as MessageKey)} <code className="minigame-param-name">{field.name}</code>
              </FieldLabel>

              {field.type === 'boolean' ? (
                <input
                  type="checkbox"
                  className="minigame-param-checkbox"
                  checked={value === true}
                  onChange={(event) => setScalar(field, event.target.checked)}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  className="content-text"
                  dir="auto"
                  rows={2}
                  value={String(value ?? '')}
                  onChange={(event) => setScalar(field, event.target.value)}
                />
              ) : field.type === 'string' || field.type === 'asset' ? (
                <input
                  className="content-text"
                  dir={field.type === 'asset' ? 'ltr' : 'auto'}
                  value={String(value ?? '')}
                  placeholder={field.type === 'asset' ? 'Assets/…' : ''}
                  onChange={(event) => setScalar(field, event.target.value)}
                />
              ) : field.type === 'number' || field.type === 'integer' ? (
                <input
                  className="content-text"
                  dir="ltr"
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.type === 'number' ? '0.1' : '1'}
                  value={Number(value ?? 0)}
                  onChange={(event) => setScalar(field, event.target.value === '' ? defaultValueFor(field) : event.target.value)}
                />
              ) : field.type === 'json' ? (
                <JsonParamInput field={field} minigame={minigame} onChange={onChange} />
              ) : (
                <ArrayParamInput field={field} minigame={minigame} onChange={onChange} />
              )}
            </label>
          )
        })
      )}
    </div>
  )
}

function defaultValueFor(field: MinigameParamField): unknown {
  return field.default ?? (field.type === 'number' || field.type === 'integer' ? 0 : '')
}
