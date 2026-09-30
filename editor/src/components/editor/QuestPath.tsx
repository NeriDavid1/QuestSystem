import { memo } from 'react'
import { useT } from '../../i18n'
import { getStatusLabel } from '../../lib/labels'
import { stepSummary, stepTypeIcon, stepTypeName } from '../../lib/stepPresentation'
import type { EditorData, Quest, QuestPrerequisite, ValidationIssue } from '../../lib/types'

/**
 * The questline as a vertical path of quest cards, in play order. Every quest
 * is visible without scrolling sideways; a card links to the one above when it
 * unlocks after it, and names any other quest it waits for.
 */
function QuestPathInner({
  data,
  quests,
  prerequisites,
  issues,
  selectedQuestId,
  onSelect,
}: {
  data: EditorData
  quests: Quest[]
  prerequisites: QuestPrerequisite[]
  issues: ValidationIssue[]
  selectedQuestId: string
  onSelect: (questId: string) => void
}) {
  const t = useT()
  const numberOf = new Map(quests.map((quest, index) => [quest.id, `Q${String(index + 1).padStart(2, '0')}`]))

  return (
    <ol className="quest-path" aria-label={t('graphAria')}>
      {quests.map((quest, index) => {
        const steps = data.steps.filter((step) => step.quest_id === quest.id).sort((a, b) => a.position - b.position)
        const stepIds = new Set(steps.map((step) => step.id))
        const questIssues = issues.filter((issue) => issue.entityId === quest.id || (issue.entityId && stepIds.has(issue.entityId)))
        const severity = questIssues.some((issue) => issue.severity === 'error') ? 'error' : questIssues.length ? 'warning' : ''
        const requires = prerequisites.filter((edge) => edge.quest_id === quest.id).map((edge) => edge.prerequisite_quest_id)
        const previous = quests[index - 1]
        const linkedToPrevious = Boolean(previous && requires.includes(previous.id))
        const otherRequirements = requires.filter((id) => id !== previous?.id).map((id) => numberOf.get(id)).filter(Boolean)
        return (
          <li key={quest.id} className={`quest-path-item ${linkedToPrevious ? 'linked' : ''}`}>
            <button
              type="button"
              className={`quest-path-card status-${quest.status} ${quest.id === selectedQuestId ? 'selected' : ''}`}
              aria-label={t('openQuestAria', { name: quest.name })}
              aria-pressed={quest.id === selectedQuestId}
              onClick={() => onSelect(quest.id)}
            >
              <span className="quest-path-number">{numberOf.get(quest.id)}</span>
              <span className="quest-path-body">
                <span className="quest-path-title">
                  <strong className="content-text" dir="auto">{quest.name || t('untitledQuest')}</strong>
                  {severity && <span className={`step-issue-dot ${severity}`} title={t('validationNotes', { count: questIssues.length })} />}
                </span>
                <span className="quest-path-meta">
                  <span>{t('levelShort', { level: quest.level_required })}</span>
                  <span>{steps.length} {t('stepsLabel')}</span>
                  <span className="quest-path-status"><i />{getStatusLabel(t, quest.status)}</span>
                  {otherRequirements.length > 0 && <span className="quest-path-requires">{t('questPathAfter', { list: otherRequirements.join(', ') })}</span>}
                </span>
                {steps.length > 0 && (
                  <span className="quest-path-steps" aria-hidden="true">
                    {steps.map((step) => (
                      <span key={step.id} className="step-type-icon" title={`${stepTypeName(t, step.step_type)} · ${stepSummary(t, data, step)}`}>
                        {stepTypeIcon(step.step_type)}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export const QuestPath = memo(QuestPathInner)
