import { useT } from '../../i18n'
import type { ValidationIssue } from '../../lib/types'

export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const t = useT()
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  return (
    <section className="validation-panel">
      <div className="validation-summary"><span className={`validation-icon ${errors.length ? 'has-errors' : 'valid'}`}>{errors.length ? '!' : '✓'}</span><div><strong>{errors.length ? t('blockingIssues', { count: errors.length }) : t('readyToPublish')}</strong><span>{warnings.length ? t('warningsToReview', { count: warnings.length }) : t('noValidationBlockers')}</span></div></div>
      <div className="validation-list">{issues.length ? issues.slice(0, 6).map((issue, index) => <div className={`validation-item ${issue.severity}`} key={`${issue.code}-${issue.entityId ?? index}`}><span>{issue.severity === 'error' ? '!' : '·'}</span><span>{issue.message}</span></div>) : <div className="validation-item success"><span>✓</span><span>{t('validationAllReady')}</span></div>}</div>
    </section>
  )
}
