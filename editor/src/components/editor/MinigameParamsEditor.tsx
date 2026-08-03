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

function isJsonText(value: unknown): boolean {
  try {
    JSON.parse(String(value))
    return true
  } catch {
    return false
  }
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
