import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import type { QuestlineRevision } from '../../lib/types'
import { Modal } from '../common/Modal'
import { Icon } from '../common/Icon'

function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}

export function RevisionsModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { selectedLine, revisionsForLine, restoreRevisionAsDraft, openConfirm } = useEditorStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  if (!selectedLine) return null
  const revisions = revisionsForLine(selectedLine.id)

  const requestRestore = (revision: QuestlineRevision) => {
    openConfirm({
      title: t('revisionRestoreTitle'),
      message: t('revisionRestoreCopy'),
      confirmLabel: t('restoreAsDraft'),
      tone: 'primary',
      onConfirm: () => {
        restoreRevisionAsDraft(revision)
        onClose()
      },
    })
  }

  return (
    <Modal title={t('revisionHistoryTitle')} eyebrow={t('revisionHistoryEyebrow')} onClose={onClose} widthClass="revisions-modal">
      <p className="modal-copy">{t('revisionHistoryHint')}</p>
      {revisions.length === 0 ? (
        <p className="empty-inline">{t('noRevisions')}</p>
      ) : (
        <div className="revision-list">
          {revisions.map((revision) => (
            <div className={`revision-row ${expandedId === revision.id ? 'expanded' : ''}`} key={revision.id}>
              <div className="revision-row-top">
                <span className="revision-badge">v{revision.version}</span>
                <span className="revision-meta">
                  <strong>{t('revisionVersion', { version: revision.version })}</strong>
                  <small>{t('revisionPublishedAt', { date: formatDate(revision.published_at ?? revision.created_at) })}</small>
                </span>
                <div className="revision-actions">
                  <button className="button subtle compact" onClick={() => setExpandedId(expandedId === revision.id ? null : revision.id)}>
                    {t('viewRevision')}
                  </button>
                  <button className="button subtle compact" onClick={() => requestRestore(revision)}>
                    <Icon name="refresh" /> {t('restoreAsDraft')}
                  </button>
                </div>
              </div>
              {expandedId === revision.id && (
                <div className="revision-document">
                  <pre>{JSON.stringify(revision.document, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
