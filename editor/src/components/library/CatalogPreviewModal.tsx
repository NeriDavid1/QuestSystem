import { useState } from 'react'
import { useT } from '../../i18n'
import { catalogImageUrl } from '../../lib/catalogImages'
import { catalogKindIcons, getCatalogKindSingular, getCatalogStatusLabel } from '../../lib/labels'
import type { CatalogEntry } from '../../lib/types'
import { Icon } from '../common/Icon'

export function CatalogPreviewModal({
  entry,
  copied,
  onCopy,
  onClose,
}: {
  entry: CatalogEntry
  copied: boolean
  onCopy: () => void
  onClose: () => void
}) {
  const t = useT()
  const imageUrl = catalogImageUrl(entry.image_path)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !imageFailed
  const status = entry.status ?? 'catalog'
  const statusClass = status === 'live_used' ? 'live' : status === 'catalog_stub' ? 'stub' : ''
  const containImage = entry.kind === 'item' || entry.kind === 'minigame'

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="modal-card catalog-preview-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-preview-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{getCatalogKindSingular(t, entry.kind)}</p>
            <h2 id="catalog-preview-title" className="content-text" dir="auto">{entry.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('closeAria')}><Icon name="close" /></button>
        </div>
        <div className={`catalog-preview-image ${containImage ? 'contain' : ''}`}>
          {showImage ? (
            <img src={imageUrl!} alt={entry.name} onError={() => setImageFailed(true)} />
          ) : (
            <span className="catalog-thumb-fallback catalog-preview-fallback">{catalogKindIcons[entry.kind]}</span>
          )}
        </div>
        <div className="catalog-preview-meta">
          <span className={`library-status catalog-status ${statusClass}`}>{getCatalogStatusLabel(t, status)}</span>
          <div className="catalog-id-row">
            <code title={entry.external_id}>{entry.external_id}</code>
            <button type="button" className={`catalog-copy ${copied ? 'copied' : ''}`} onClick={onCopy}>{copied ? t('copied') : t('copy')}</button>
          </div>
          <p className="content-text" dir="auto">{entry.description ?? t('importedFromRegistry')}</p>
        </div>
      </section>
    </div>
  )
}
