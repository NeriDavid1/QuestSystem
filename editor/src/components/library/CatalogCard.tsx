import { memo, useState } from 'react'
import { useT } from '../../i18n'
import { catalogImageUrl } from '../../lib/catalogImages'
import { catalogKindIcons, getCatalogKindSingular, getCatalogStatusLabel } from '../../lib/labels'
import type { CatalogEntry } from '../../lib/types'

export const CatalogCard = memo(function CatalogCard({
  entry,
  copied,
  onCopy,
  onOpen,
}: {
  entry: CatalogEntry
  copied: boolean
  onCopy: () => void
  onOpen: () => void
}) {
  const t = useT()
  const imageUrl = catalogImageUrl(entry.image_path)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !imageFailed
  const status = entry.status ?? 'catalog'
  const statusClass = status === 'live_used' ? 'live' : status === 'catalog_stub' ? 'stub' : ''

  return (
    <article
      className="catalog-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <div className={`catalog-thumb ${entry.kind === 'item' || entry.kind === 'minigame' ? 'contain' : ''}`}>
        {showImage ? (
          <img src={imageUrl!} alt={entry.name} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="catalog-thumb-fallback">{catalogKindIcons[entry.kind]}</span>
        )}
      </div>
      <div className="catalog-card-body">
        <div className="catalog-card-top">
          <p className="eyebrow">{getCatalogKindSingular(t, entry.kind)}</p>
          <span className={`library-status catalog-status ${statusClass}`}>{getCatalogStatusLabel(t, status)}</span>
        </div>
        <h3 className="content-text" dir="auto">{entry.name}</h3>
        <div className="catalog-id-row">
          <code title={entry.external_id}>{entry.external_id}</code>
          <button
            type="button"
            className={`catalog-copy ${copied ? 'copied' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              onCopy()
            }}
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
        <p className="content-text" dir="auto">{entry.description ?? t('importedFromRegistry')}</p>
      </div>
    </article>
  )
})
