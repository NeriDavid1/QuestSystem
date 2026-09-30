import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import type { ValidationIssue } from '../../lib/types'

export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const t = useT()
  const { focusEntity } = useEditorStore()
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  // Blocking issues first, so the one that stops publishing is always visible.
  const ordered = [...errors, ...warnings]
  return (
    <section className="validation-panel">
      <div className="validation-summary"><span className={`validation-icon ${errors.length ? 'has-errors' : 'valid'}`}>{errors.length ? '!' : '✓'}</span><div><strong>{errors.length ? t('blockingIssues', { count: errors.length }) : t('readyToPublish')}</strong><span>{warnings.length ? t('warningsToReview', { count: warnings.length }) : t('noValidationBlockers')}</span></div></div>
      <div className="validation-list">
        {ordered.length ? ordered.map((issue, index) => (
          <button
            type="button"
            className={`validation-item ${issue.severity}`}
            key={`${issue.code}-${issue.entityId ?? ''}-${index}`}
            title={t('showIssue')}
            disabled={!issue.entityId}
            onClick={() => issue.entityId && focusEntity(issue.entityId)}
          >
            <span>{issue.severity === 'error' ? '!' : '·'}</span><span>{issue.message}</span>
          </button>
        )) : <div className="validation-item success"><span>✓</span><span>{t('validationAllReady')}</span></div>}
      </div>
    </section>
  )
}
