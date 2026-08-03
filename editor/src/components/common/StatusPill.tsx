import { useT } from '../../i18n'
import { getStatusLabel } from '../../lib/labels'

export function StatusPill({ status }: { status: string }) {
  const t = useT()
  return <span className={`status-pill status-${status}`}>{getStatusLabel(t, status)}</span>
}
