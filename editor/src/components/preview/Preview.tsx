import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { getQuestRewards, getQuestSteps, getQuestlineQuests, getStepRewards } from '../../lib/editorData'
import type { QuestReward } from '../../lib/types'
import { EmptyState } from '../common/EmptyState'
import { StatusPill } from '../common/StatusPill'

function RewardList({ rewards }: { rewards: QuestReward[] }) {
  const t = useT()
  if (!rewards.length) return null
  return (
    <div className="preview-rewards">
      <small className="eyebrow">{t('previewRewards')}</small>
      <div className="preview-chips">
        {rewards.map((reward) => (
          <span className="preview-chip" key={reward.id}>
            {reward.reward_type === 'xp'
              ? t('previewRewardXp', { amount: reward.xp_amount ?? 0 })
              : t('previewRewardItem', { amount: reward.amount ?? 0, item: reward.item_external_id ?? '?' })}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Preview() {
  const t = useT()
  const { data, selectedLine, selectedQuest, setSelectedQuestId } = useEditorStore()
  if (!selectedLine) return <div className="page-content"><EmptyState icon="◉" title={t('chooseQuestlineTitle')} copy={t('chooseQuestlineCopy')} /></div>
  const quests = getQuestlineQuests(data, selectedLine.id)
  const quest = selectedQuest
  const questPrereqs = quest
    ? data.prerequisites
      .filter((edge) => edge.quest_id === quest.id)
      .map((edge) => data.quests.find((candidate) => candidate.id === edge.prerequisite_quest_id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : []

  return (
    <div className="page-content preview-page">
      <div className="page-heading"><div><p className="eyebrow">{t('previewEyebrow')}</p><h1 className="content-text" dir="auto">{selectedLine.display_name}</h1><p className="page-subtitle">{t('previewSubtitle')}</p></div><StatusPill status={selectedLine.status} /></div>
      <div className="preview-shell">
        <div className="preview-hero"><div className="preview-crown">✦</div><div><p className="eyebrow">{t('learningAdventure')}</p><h2 className="content-text" dir="auto">{selectedLine.display_name}</h2><p className="content-text" dir="auto">{selectedLine.theme}</p></div><div className="preview-progress"><strong>{quests.length}</strong><span>{t('questsInPath')}</span></div></div>
        <div className="preview-body">
          <div className="preview-path">{quests.map((item, index) => <button key={item.id} className={`preview-quest ${item.id === quest?.id ? 'selected' : ''}`} onClick={() => setSelectedQuestId(item.id)}><span className="preview-quest-number">{String(index + 1).padStart(2, '0')}</span><span><strong className="content-text" dir="auto">{item.name}</strong><small className="content-text" dir="auto">{item.summary}</small></span><StatusPill status={item.status} /></button>)}</div>
          <div className="preview-detail">
            {quest ? (
              <>
                <p className="eyebrow">{t('questBrief')}</p>
                <h2 className="content-text" dir="auto">{quest.name}</h2>
                <p className="content-text" dir="auto">{quest.summary}</p>
                {questPrereqs.length > 0 && (
                  <div className="preview-prereqs">
                    <small className="eyebrow">{t('previewPrerequisites')}</small>
                    <div className="preview-chips">
                      {questPrereqs.map((prereq) => <span className="preview-chip" key={prereq.id}>{prereq.name || prereq.key}</span>)}
                    </div>
                  </div>
                )}
                <RewardList rewards={getQuestRewards(data, quest.id)} />
                {(quest.start_dialogue_id || quest.turn_in_dialogue_id) && (
                  <div className="preview-quest-dialogues">
                    {([
                      { key: quest.start_dialogue_id, label: t('previewStartDialogue') },
                      { key: quest.turn_in_dialogue_id, label: t('previewTurnInDialogue') },
                    ] as const).map((slot) => {
                      if (!slot.key) return null
                      const dialogue = data.dialogues.find((item) => item.key === slot.key)
                      const dialogueLines = dialogue
                        ? data.dialogueLines.filter((line) => line.dialogue_id === dialogue.id).sort((a, b) => a.line_order - b.line_order)
                        : []
                      if (!dialogue || dialogueLines.length === 0) return null
                      return (
                        <div className="preview-dialogue" key={slot.label}>
                          <small className="eyebrow">{slot.label}</small>
                          {dialogueLines.slice(0, 3).map((line) => (
                            <p className="content-text" dir="auto" key={line.id}>“{line.content || '…'}”</p>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="preview-steps">
                  {getQuestSteps(data, quest.id).map((step, index) => {
                    const dialogue = typeof step.payload.dialogue_id === 'string' && step.payload.dialogue_id
                      ? data.dialogues.find((item) => item.key === step.payload.dialogue_id)
                      : undefined
                    const dialogueLines = dialogue ? data.dialogueLines.filter((line) => line.dialogue_id === dialogue.id).sort((a, b) => a.line_order - b.line_order) : []
                    return (
                      <div className="preview-step" key={step.id}>
                        <span>{index + 1}</span>
                        <div>
                          <strong>{step.step_type.replaceAll('_', ' ')}</strong>
                          <small dir="auto">{Object.values(step.payload).filter((value) => typeof value === 'string').slice(0, 2).join(' · ')}</small>
                          {dialogue && dialogueLines.length > 0 && (
                            <div className="preview-dialogue">
                              {dialogueLines.slice(0, 3).map((line) => <p className="content-text" dir="auto" key={line.id}>“{line.content || '…'}”</p>)}
                            </div>
                          )}
                          <RewardList rewards={getStepRewards(data, step.id)} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : <EmptyState icon="✦" title={t('selectQuestPreviewTitle')} copy={t('selectQuestPreviewCopy')} />}
          </div>
        </div>
      </div>
    </div>
  )
}
