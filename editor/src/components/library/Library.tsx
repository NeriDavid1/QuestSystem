import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getCatalogKindLabels } from '../../lib/labels'
import type { CatalogEntry, CatalogKind } from '../../lib/types'
import { Icon } from '../common/Icon'
import { EmptyState } from '../common/EmptyState'
import { CatalogCard } from './CatalogCard'
import { CatalogPreviewModal } from './CatalogPreviewModal'
import { DialogueCard } from './DialogueCard'
import { MinigameCard } from './MinigameCard'

export function Library() {
  const t = useT()
  const {
    data,
    libraryTab,
    setLibraryTab,
    createDialogue,
    removeDialogue,
    removeMinigame,
    openConfirm,
  } = useEditorStore()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<CatalogKind | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'live_used' | 'catalog_stub' | 'has_image'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [previewEntry, setPreviewEntry] = useState<CatalogEntry | null>(null)
  const normalizedSearch = search.toLowerCase().trim()
  const entries = data.catalog.filter((entry) => {
    if (kind !== 'all' && entry.kind !== kind) return false
    if (statusFilter === 'live_used' && entry.status !== 'live_used') return false
    if (statusFilter === 'catalog_stub' && entry.status !== 'catalog_stub') return false
    if (statusFilter === 'has_image' && !entry.image_path) return false
    return `${entry.name} ${entry.external_id} ${entry.description ?? ''}`.toLowerCase().includes(normalizedSearch)
  })
  const dialogues = data.dialogues.filter((dialogue) => `${dialogue.key} ${dialogue.speaker_external_id ?? ''}`.toLowerCase().includes(normalizedSearch))
  const minigames = data.minigames.filter((minigame) => `${minigame.key} ${minigame.instruction ?? ''}`.toLowerCase().includes(normalizedSearch))
  const catalogKindLabels = getCatalogKindLabels(t)

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1200)
    } catch {
      /* clipboard may be blocked */
    }
  }

  const confirmDeleteDialogue = (dialogueId: string, key: string) => {
    openConfirm({
      title: t('deleteDialogueAria'),
      message: key,
      confirmLabel: t('deleteDialogueAria'),
      tone: 'danger',
      onConfirm: () => removeDialogue(dialogueId),
    })
  }

  return (
    <div className="page-content library-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('libraryEyebrow')}</p>
          <h1>{t('libraryTitle')}</h1>
          <p className="page-subtitle">{t('librarySubtitle')}</p>
        </div>
        <div className="library-count"><strong>{data.catalog.length + data.dialogues.length + data.minigames.length}</strong><span>{t('importedEntries')}</span></div>
      </div>
      <div className="library-tabs">
        <button className={libraryTab === 'catalog' ? 'active' : ''} onClick={() => setLibraryTab('catalog')}><Icon name="grid" /> {t('worldCatalog')} <span>{data.catalog.length}</span></button>
        <button className={libraryTab === 'dialogues' ? 'active' : ''} onClick={() => setLibraryTab('dialogues')}><Icon name="book" /> {t('dialogues')} <span>{data.dialogues.length}</span></button>
        <button className={libraryTab === 'minigames' ? 'active' : ''} onClick={() => setLibraryTab('minigames')}><Icon name="spark" /> {t('minigameBriefs')} <span>{data.minigames.length}</span></button>
      </div>
      <div className="library-toolbar">
        <div className="search-box"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchPlaceholder')} /></div>
        {libraryTab === 'catalog' && (
          <>
            <select value={kind} onChange={(event) => setKind(event.target.value as CatalogKind | 'all')}>
              <option value="all">{t('allTypes')}</option>
              {Object.entries(catalogKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">{t('allStatuses')}</option>
              <option value="live_used">{t('liveUsed')}</option>
              <option value="catalog_stub">{t('catalogStub')}</option>
              <option value="has_image">{t('hasImage')}</option>
            </select>
          </>
        )}
        {libraryTab === 'dialogues' && (
          <button type="button" className="button subtle compact" onClick={() => createDialogue()}>
            <Icon name="plus" /> {t('newDialogue')}
          </button>
        )}
      </div>
      {libraryTab === 'catalog' && (
        <div className="catalog-grid">
          {entries.map((entry) => (
            <CatalogCard
              key={entry.id}
              entry={entry}
              copied={copiedId === entry.external_id}
              onCopy={() => void copyId(entry.external_id)}
              onOpen={() => setPreviewEntry(entry)}
            />
          ))}
        </div>
      )}
      {libraryTab === 'dialogues' && (
        <div className="library-list">
          {dialogues.map((dialogue) => (
            <DialogueCard
              key={dialogue.id}
              dialogue={dialogue}
              data={data}
              onDelete={() => confirmDeleteDialogue(dialogue.id, dialogue.key)}
            />
          ))}
        </div>
      )}
      {libraryTab === 'minigames' && (
        <div className="library-grid">
          {minigames.map((minigame) => (
            <MinigameCard
              key={`${minigame.key}-${minigame.locale}`}
              minigame={minigame}
              onDelete={() => openConfirm({
                title: t('deleteMinigameAria'),
                message: minigame.key,
                confirmLabel: t('deleteMinigameAria'),
                tone: 'danger',
                onConfirm: () => removeMinigame(minigame.id),
              })}
            />
          ))}
        </div>
      )}
      {((libraryTab === 'catalog' && entries.length === 0) || (libraryTab === 'dialogues' && dialogues.length === 0) || (libraryTab === 'minigames' && minigames.length === 0)) && <EmptyState icon="⌕" title={t('nothingFoundTitle')} copy={t('nothingFoundCopy')} />}
      {previewEntry && (
        <CatalogPreviewModal
          key={previewEntry.id}
          entry={previewEntry}
          copied={copiedId === previewEntry.external_id}
          onCopy={() => void copyId(previewEntry.external_id)}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </div>
  )
}
