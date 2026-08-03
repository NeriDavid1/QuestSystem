import { useT } from '../../i18n'
import { useEditorStore, type View } from '../../state/EditorStore'
import { Icon } from '../common/Icon'

function getNavItems(t: ReturnType<typeof useT>): Array<{ id: View; label: string; icon: string }> {
  return [
    { id: 'overview', label: t('navOverview'), icon: 'grid' },
    { id: 'editor', label: t('navEditor'), icon: 'spark' },
    { id: 'library', label: t('navLibrary'), icon: 'book' },
    { id: 'preview', label: t('navPreview'), icon: 'eye' },
  ]
}

export function Sidebar() {
  const t = useT()
  const { view, setView, demoMode, user, dirty, handleSignOut } = useEditorStore()
  const navItems = getNavItems(t)
  return (
    <aside className="app-sidebar">
      <div className="app-brand"><div className="brand-mark">Q</div><div><strong>{t('brandName')}</strong><span>{t('brandTagline')}</span></div></div>
      <div className="workspace-switcher"><span className="workspace-avatar">EK</span><span><small>{t('workspaceLabel')}</small><strong>{t('workspaceName')}</strong></span><Icon name="chevron" /></div>
      <nav className="main-nav" aria-label={t('navMainAria')}>
        {navItems.map((item) => (
          <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => setView(item.id)}>
            <Icon name={item.icon} /><span>{item.label}</span>{item.id === 'editor' && dirty && <i className="nav-dirty-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-divider" />
      <div className="sidebar-section-label">{t('workspaceLabel')}</div>
      <button className={`main-nav settings-link ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
        <Icon name="settings" /><span>{t('navSettings')}</span>
      </button>
      <div className="sidebar-spacer" />
      <div className={`connection-card ${demoMode ? 'demo' : ''}`}>
        <span className="connection-dot" />
        <div><strong>{demoMode ? t('previewMode') : t('supabaseConnected')}</strong><small>{demoMode ? t('addEnvKeys') : t('rlsProtected')}</small></div>
      </div>
      {user && (
        <button className="user-card" onClick={() => void handleSignOut()}>
          <span className="user-avatar">{(user.email?.slice(0, 1) ?? 'U').toUpperCase()}</span>
          <span><strong>{user.email ?? t('editorFallback')}</strong><small>{t('signOut')}</small></span>
          <Icon name="logout" />
        </button>
      )}
    </aside>
  )
}
