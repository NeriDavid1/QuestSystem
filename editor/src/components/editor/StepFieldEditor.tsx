import { useT } from '../../i18n'
import type { EditorData, QuestStep, StepField } from '../../lib/types'
import { getCatalogKindForRef } from '../../lib/editorData'
import { CatalogSelect } from './CatalogSelect'
import { FieldLabel } from '../common/FieldLabel'

function isMissingRequired(step: QuestStep, field: StepField): boolean {
  const value = step.payload[field.name]
  return Boolean(field.required) && (value === undefined || value === null || value === '')
}

export function StepFieldEditor({
  field,
  step,
  data,
  onPayloadChange,
}: {
  field: StepField
  step: QuestStep
  data: EditorData
  onPayloadChange: (patch: Record<string, unknown>) => void
}) {
  const t = useT()
  const value = step.payload[field.name]
  const missing = isMissingRequired(step, field)
  const catalogKind = getCatalogKindForRef(field.ref)
  const isDialogueRef = Boolean(field.ref?.includes('dialogues'))
  const isNumeric = field.type === 'integer' || field.type === 'number'
  const label = field.name.replaceAll('_', ' ')
  const inputId = `field-${step.id}-${field.name}`
  const unresolvedCatalog = Boolean(
    catalogKind
    && value
    && !data.catalog.some((entry) => entry.kind === catalogKind && entry.external_id === String(value)),
  )
  const unresolvedDialogue = Boolean(
    isDialogueRef
    && value
    && !data.dialogues.some((dialogue) => dialogue.key === String(value)),
  )

  const renderControl = () => {
    if (catalogKind) {
      return <CatalogSelect kind={catalogKind} value={String(value ?? '')} data={data} onChange={(next) => onPayloadChange({ [field.name]: next })} />
    }
    if (isDialogueRef) {
      return (
        <>
          <input list={`dialogues-${step.id}`} dir="ltr" value={String(value ?? '')} onChange={(event) => onPayloadChange({ [field.name]: event.target.value })} />
          <datalist id={`dialogues-${step.id}`}>
            {data.dialogues.map((dialogue) => <option key={dialogue.key} value={dialogue.key} />)}
          </datalist>
        </>
      )
    }
    if (field.type === 'boolean') {
      return (
        <label className="checkbox-label">
          <input type="checkbox" checked={Boolean(value ?? field.default ?? false)} onChange={(event) => onPayloadChange({ [field.name]: event.target.checked })} />
          <span>{t('enabled')}</span>
        </label>
      )
    }
    if (field.type === 'json') {
      return <textarea className="content-text" dir="ltr" rows={3} value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')} onChange={(event) => { try { onPayloadChange({ [field.name]: JSON.parse(event.target.value) }) } catch { onPayloadChange({ [field.name]: event.target.value }) } }} />
    }
    return (
      <input
        dir={isNumeric ? 'ltr' : 'auto'}
        className={isNumeric ? undefined : 'content-text'}
        type={isNumeric ? 'number' : 'text'}
        value={String(value ?? field.default ?? '')}
        min={field.min}
        max={field.max}
        onChange={(event) => onPayloadChange({ [field.name]: isNumeric ? Number(event.target.value) : event.target.value })}
      />
    )
  }

  return (
    <label className={`step-field ${missing ? 'has-error' : ''}`} htmlFor={inputId}>
      <FieldLabel hint={field.required ? t('required') : t('optional')}>{label}</FieldLabel>
      {renderControl()}
      {field.description && <small className="field-description">{field.description}</small>}
      {(unresolvedCatalog || unresolvedDialogue) && <span className="unresolved-badge">{t('unresolvedRefBadge')}</span>}
      {missing && <span className="field-error">{t('requiredField')}</span>}
    </label>
  )
}
