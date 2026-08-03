import { useT } from '../../i18n'
import type { Quest, QuestPrerequisite } from '../../lib/types'

export function PrerequisiteEditor({
  quest,
  quests,
  prerequisites,
  onToggle,
}: {
  quest: Quest
  quests: Quest[]
  prerequisites: QuestPrerequisite[]
  onToggle: (prerequisiteQuestId: string, enabled: boolean) => void
}) {
  const t = useT()
  const candidates = quests.filter((candidate) => candidate.id !== quest.id)
  if (candidates.length === 0) {
    return <div className="empty-inline">{t('addPrerequisiteHint')}</div>
  }
  return (
    <div className="prerequisite-list">
      {candidates.map((candidate) => {
        const checked = prerequisites.some((edge) => edge.prerequisite_quest_id === candidate.id)
        return (
          <label className="checkbox-label prerequisite-option" key={candidate.id}>
            <input type="checkbox" checked={checked} onChange={(event) => onToggle(candidate.id, event.target.checked)} />
            <span><strong>{candidate.name || t('untitledQuest')}</strong><small dir="ltr">{candidate.key}</small></span>
          </label>
        )
      })}
    </div>
  )
}
