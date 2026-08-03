import type { ReactNode } from 'react'
import { Icon } from '../common/Icon'

export function InspectorSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return <section className={`inspector-section ${open ? 'open' : ''}`}><button className="section-toggle" onClick={onToggle}><span>{title}</span><Icon name={open ? 'chevron' : 'plus'} /></button>{open && <div className="section-body">{children}</div>}</section>
}
