import { useT } from '../../i18n'
import type { ConfirmState } from '../../state/EditorStore'

export function ConfirmDialog({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  const t = useT()
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="modal-card confirm-modal" role="dialog" aria-modal="true" aria-label={state.title}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('releaseCheck')}</p>
            <h2>{state.title}</h2>
          </div>
        </div>
        <p className="modal-copy">{state.message}</p>
        <div className="modal-actions">
          <button className="button subtle" onClick={onCancel}>{t('cancel')}</button>
          <button
            className={`button ${state.tone === 'danger' ? 'danger' : 'primary'}`}
            onClick={() => {
              state.onConfirm()
              onCancel()
            }}
          >
            {state.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
