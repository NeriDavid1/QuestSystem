import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import { Icon } from './Icon'

export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  widthClass,
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
  widthClass?: string
}) {
  const t = useT()
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className={`modal-card ${widthClass ?? ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('closeAria')}><Icon name="close" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}
