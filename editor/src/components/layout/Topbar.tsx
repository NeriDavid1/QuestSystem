import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { Icon } from '../common/Icon'

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const t = useT()
  const { view, dirty, history, undo, redo, user } = useEditorStore()
  const viewLabel =
    view === 'editor' ? t('navEditor') : view === 'overview' ? t('navOverview') : view === 'library' ? t('navLibrary') : view === 'preview' ? t('navPreview') : t('navSettings')
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>{t('workspaceName')}</span>
        <Icon name="chevron" />
        <strong>{viewLabel}</strong>
      </div>
      <div className="topbar-actions">
        <div className={`save-state ${dirty ? 'dirty' : ''}`}><span />{dirty ? t('unsavedChanges') : t('allChangesSaved')}</div>
        <button className="icon-button top-icon" aria-label={t('undo')} title={t('undo')} disabled={!history.canUndo} onClick={undo}><Icon name="undo" /></button>
        <button className="icon-button top-icon" aria-label={t('redo')} title={t('redo')} disabled={!history.canRedo} onClick={redo}><Icon name="redo" /></button>
        <button className="icon-button top-icon" aria-label={t('search')} title={t('search')} onClick={onOpenSearch}><Icon name="search" /></button>
        <span className="top-avatar">{(user?.email?.slice(0, 1) ?? 'E').toUpperCase()}</span>
      </div>
    </header>
  )
}
