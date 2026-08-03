import { useT } from '../../i18n'
import { Icon } from './Icon'

export function PublishConfirmModal({  warningCount,
  busy,
  onClose,
  onConfirm,
}: {
  warningCount: number
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('releaseCheck')}</p>
            <h2 id="publish-title">{t('publishSnapshotTitle')}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('closeAria')}><Icon name="close" /></button>
        </div>
        <p className="modal-copy">{t('publishCopy')}</p>
        {warningCount > 0 && (
          <div className="publish-warning"><Icon name="warning" /><span>{warningCount === 1 ? t('publishWarning', { count: warningCount }) : t('publishWarnings', { count: warningCount })}</span></div>
        )}
        <div className="modal-actions">
          <button className="button subtle" onClick={onClose}>{t('keepEditing')}</button>
          <button className="button primary" onClick={onConfirm} disabled={busy}>{busy ? t('publishing') : t('publishSnapshot')}</button>
        </div>
      </section>
    </div>
  )
}
