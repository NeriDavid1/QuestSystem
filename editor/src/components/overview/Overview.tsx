import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getQuestlineQuests } from '../../lib/editorData'
import { validateQuestline } from '../../lib/validation'
import { Icon } from '../common/Icon'
import { StatusPill } from '../common/StatusPill'

function CoverageItem({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="coverage-item"><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>
}

export function Overview() {
  const t = useT()
  const { data, setView, setSelectedQuestlineId } = useEditorStore()
  const published = data.questlines.filter((line) => line.status === 'published').length
  const draft = data.questlines.filter((line) => line.status === 'draft').length
  const validation = data.questlines.map((line) => validateQuestline(data, line, t))
  const blockingIssues = validation.reduce(
    (total, issues) => total + issues.filter((issue) => issue.severity === 'error').length,
    0,
  )

  return (
    <div className="page-content overview-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('overviewEyebrow')}</p>
          <h1>{t('overviewTitle')}</h1>
          <p className="page-subtitle">{t('overviewSubtitle')}</p>
        </div>
        <button className="button primary" onClick={() => setView('editor')}>
          <Icon name="spark" /> {t('overviewOpenWorkspace')}
        </button>
      </div>
      <div className="metric-grid">
        <div className="metric-card metric-purple">
          <div className="metric-icon"><Icon name="book" /></div>
          <div><span className="metric-label">{t('metricQuestlines')}</span><strong>{data.questlines.length}</strong></div>
          <span className="metric-foot">{t('metricDrafts', { count: draft })}</span>
        </div>
        <div className="metric-card metric-mint">
          <div className="metric-icon"><Icon name="check" /></div>
          <div><span className="metric-label">{t('metricPublished')}</span><strong>{published}</strong></div>
          <span className="metric-foot">{t('metricSafeSnapshots')}</span>
        </div>
        <div className="metric-card metric-gold">
          <div className="metric-icon"><Icon name="warning" /></div>
          <div><span className="metric-label">{t('metricBlocking')}</span><strong>{blockingIssues}</strong></div>
          <span className="metric-foot">{t('metricAcrossLines')}</span>
        </div>
        <div className="metric-card metric-blue">
          <div className="metric-icon"><Icon name="spark" /></div>
          <div><span className="metric-label">{t('metricSteps')}</span><strong>{data.steps.length}</strong></div>
          <span className="metric-foot">{t('metricGuided')}</span>
        </div>
      </div>
      <div className="overview-grid">
        <section className="panel questline-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">{t('yourWorld')}</p><h2>{t('questlines')}</h2></div>
            <span className="muted">{t('linesCount', { count: data.questlines.length })}</span>
          </div>
          <div className="overview-lines">
            {data.questlines.map((line) => {
              const quests = getQuestlineQuests(data, line.id)
              const lineIssues = validateQuestline(data, line, t)
              return (
                <button className="line-row" key={line.id} onClick={() => { setSelectedQuestlineId(line.id); setView('editor') }}>
                  <span className="line-avatar">{line.display_name.slice(0, 1)}</span>
                  <span className="line-info">
                    <strong className="content-text" dir="auto">{line.display_name}</strong>
                    <small className="content-text" dir="auto">{t('questsCount', { count: quests.length })} · {line.theme ?? t('noThemeYet')}</small>
                  </span>
                  <span className="line-health">
                    {lineIssues.some((issue) => issue.severity === 'error') ? (
                      <span className="health-warning"><Icon name="warning" /> {t('needsWork')}</span>
                    ) : (
                      <span className="health-ready"><Icon name="check" /> {t('ready')}</span>
                    )}
                    <StatusPill status={line.status} />
                  </span>
                  <Icon name="chevron" />
                </button>
              )
            })}
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">{t('safePublishing')}</p><h2>{t('howLoopWorks')}</h2></div>
            <div className="pulse-dot" />
          </div>
          <div className="flow-list">
            <div className="flow-step"><span>01</span><div><strong>{t('flowEditTitle')}</strong><p>{t('flowEditCopy')}</p></div></div>
            <div className="flow-step"><span>02</span><div><strong>{t('flowValidateTitle')}</strong><p>{t('flowValidateCopy')}</p></div></div>
            <div className="flow-step"><span>03</span><div><strong>{t('flowPublishTitle')}</strong><p>{t('flowPublishCopy')}</p></div></div>
          </div>
          <div className="callout"><Icon name="spark" /><span>{t('yamlCallout')}</span></div>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading"><div><p className="eyebrow">{t('recentlyImported')}</p><h2>{t('contentCoverage')}</h2></div><span className="muted">{t('fromRegistry')}</span></div>
        <div className="coverage-grid">
          <CoverageItem label={t('coverageCatalog')} value={data.catalog.length} detail={t('coverageCatalogDetail')} />
          <CoverageItem label={t('coverageDialogues')} value={data.dialogues.length} detail={t('coverageDialogueLines', { count: data.dialogueLines.length })} />
          <CoverageItem label={t('coverageMinigames')} value={data.minigames.length} detail={t('coverageMinigamesDetail')} />
          <CoverageItem label={t('coverageSnapshots')} value={data.revisions.length} detail={t('coverageSnapshotsDetail')} />
        </div>
      </section>
    </div>
  )
}
