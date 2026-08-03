import { useT } from '../../i18n'
import type { CatalogKind, EditorData } from '../../lib/types'
import { getCatalogKindSingular } from '../../lib/labels'

export function CatalogSelect({
  kind,
  value,
  data,
  onChange,
}: {
  kind: CatalogKind
  value: string
  data: EditorData
  onChange: (value: string) => void
}) {
  const t = useT()
  const options = data.catalog.filter((entry) => entry.kind === kind)
  return (
    <select dir="ltr" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{t('chooseCatalog', { kind: getCatalogKindSingular(t, kind) })}</option>
      {options.map((entry) => (
        <option key={entry.external_id} value={entry.external_id}>{entry.name} · {entry.external_id}</option>
      ))}
    </select>
  )
}
