import { useLocale } from '../../i18n'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { Icon } from '../common/Icon'

export function Settings() {
  const { locale, setLocale } = useLocale()
  const t = useT()
  const { data, demoMode } = useEditorStore()
  return (
    <div className="page-content settings-page">
      <div className="page-heading"><div><p className="eyebrow">{t('settingsEyebrow')}</p><h1>{t('settingsTitle')}</h1><p className="page-subtitle">{t('settingsSubtitle')}</p></div></div>
      <div className="settings-grid">
        <section className="panel settings-card language-card"><div className="settings-title"><span className="settings-icon"><Icon name="spark" /></span><div><h2>{t('languageSectionTitle')}</h2><p>{t('languageSectionCopy')}</p></div></div><div className="setting-row"><span>{t('languageLabel')}</span><div className="language-toggle"><button type="button" className={locale === 'he' ? 'active' : ''} aria-pressed={locale === 'he'} onClick={() => setLocale('he')}>{t('languageHebrew')}</button><button type="button" className={locale === 'en' ? 'active' : ''} aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>{t('languageEnglish')}</button></div></div><p className="language-note">{t('languageRtlNote')}</p></section>
        <section className="panel settings-card"><div className="settings-title"><span className="settings-icon"><Icon name="lock" /></span><div><h2>{t('connectionTitle')}</h2><p>{t('connectionCopy')}</p></div></div><div className="setting-row"><span>{t('environment')}</span><strong className={demoMode ? 'setting-warning' : 'setting-good'}>{demoMode ? t('previewNotConnected') : t('connectedSupabase')}</strong></div><div className="setting-row"><span>{t('authentication')}</span><strong>{t('authRequired')}</strong></div><div className="setting-row"><span>{t('runtimeContract')}</span><strong>{t('publishedOnly')}</strong></div></section>
        <section className="panel settings-card"><div className="settings-title"><span className="settings-icon"><Icon name="refresh" /></span><div><h2>{t('importBridgeTitle')}</h2><p>{t('importBridgeCopy')}</p></div></div><div className="setting-row"><span>{t('sourceBundle')}</span><code dir="ltr">supabase/seed/quest_content_bundle.json</code></div><div className="setting-row"><span>{t('conflictReport')}</span><code dir="ltr">reports/quest_import_report.json</code></div><div className="setting-row"><span>{t('importedEntities')}</span><strong>{t('sharedRecords', { count: data.catalog.length + data.dialogues.length + data.minigames.length })}</strong></div></section>
      </div>
      <section className="panel schema-card"><div className="panel-heading"><div><p className="eyebrow">{t('backendContract')}</p><h2>{t('protectedTables')}</h2></div><span className="muted">{t('rlsEnabled')}</span></div><div className="schema-list">{['questlines', 'quests', 'quest_steps', 'quest_prerequisites', 'quest_rewards', 'dialogues', 'minigame_instances', 'questline_revisions', 'audit_log'].map((table) => <span key={table} dir="ltr"><Icon name="check" />{table}</span>)}</div></section>
    </div>
  )
}
