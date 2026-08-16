import { useState } from 'react'
import { useT } from '../../i18n'
import { catalogImageUrl } from '../../lib/catalogImages'
import { getQuestRewards, getQuestSteps, getQuestlineQuests, getStepMinigame, getStepRewards } from '../../lib/editorData'
import type { CatalogEntry, CatalogKind, EditorData, Quest, QuestReward, QuestStep, Questline } from '../../lib/types'
import { useEditorStore } from '../../state/EditorStore'
import { EmptyState } from '../common/EmptyState'
import { StatusPill } from '../common/StatusPill'
import { MinigameMock } from './MinigameMock'

function findCatalog(data: EditorData, kind: CatalogKind, externalId: string | null | undefined): CatalogEntry | undefined {
  if (!externalId) return undefined
  return data.catalog.find((entry) => entry.kind === kind && entry.external_id === externalId)
}

function CatalogThumb({
  entry,
  className = 'preview-thumb',
  fallback,
}: {
  entry: CatalogEntry | undefined
  className?: string
  fallback?: string
}) {
  const t = useT()
  const [failed, setFailed] = useState(false)
  const url = catalogImageUrl(entry?.image_path)
  const showImage = Boolean(url) && !failed
  return (
    <div className={className} title={entry?.name || fallback || t('previewNoImage')}>
      {showImage ? (
        <img src={url!} alt={entry?.name || ''} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="preview-thumb-fallback">{fallback || entry?.name?.slice(0, 2) || t('previewNoImage')}</span>
      )}
    </div>
  )
}

function PhotoLabel({ entry, label, kind }: { entry: CatalogEntry | undefined; label: string; kind: CatalogKind }) {
  return (
    <div className="preview-photo-label">
      <CatalogThumb entry={entry} className={`preview-thumb preview-thumb-lg ${kind === 'item' || kind === 'minigame' ? 'contain' : ''}`} />
      <span className="content-text" dir="auto">{label}</span>
    </div>
  )
}

function RewardList({ data, rewards }: { data: EditorData; rewards: QuestReward[] }) {
  const t = useT()
  if (!rewards.length) return null
  return (
    <div className="preview-rewards">
      <small className="eyebrow">{t('previewRewards')}</small>
      <div className="preview-chips">
        {rewards.map((reward) => {
          if (reward.reward_type === 'xp') {
            return (
              <span className="preview-chip xp" key={reward.id}>
                {t('previewRewardXp', { amount: reward.xp_amount ?? 0 })}
              </span>
            )
          }
          const item = findCatalog(data, 'item', reward.item_external_id)
          return (
            <span className="preview-chip with-thumb" key={reward.id}>
              <CatalogThumb entry={item} className="preview-thumb preview-thumb-sm contain" />
              {t('previewRewardItem', { amount: reward.amount ?? 0, item: item?.name || reward.item_external_id || '?' })}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function payloadString(step: QuestStep, key: string): string | null {
  const value = step.payload[key]
  return typeof value === 'string' && value ? value : null
}

function questGiverId(quest: Quest, line: Questline): string | null {
  return quest.giver_external_id || line.default_giver_external_id
}

function introDialogueKey(data: EditorData, quest: Quest): string | null {
  if (quest.start_dialogue_id) return quest.start_dialogue_id
  const talk = getQuestSteps(data, quest.id).find(
    (step) => step.step_type === 'talk_to_npc' && typeof step.payload.dialogue_id === 'string' && step.payload.dialogue_id,
  )
  return talk ? String(talk.payload.dialogue_id) : null
}

function closeDialogueKey(data: EditorData, quest: Quest): string | null {
  if (quest.turn_in_dialogue_id) return quest.turn_in_dialogue_id
  const returns = getQuestSteps(data, quest.id).filter(
    (step) => step.step_type === 'return_to_npc' && typeof step.payload.dialogue_id === 'string' && step.payload.dialogue_id,
  )
  if (!returns.length) return null
  return String(returns[returns.length - 1].payload.dialogue_id)
}

function StepVisual({ data, step, index }: { data: EditorData; step: QuestStep; index: number }) {
  const t = useT()
  const npcId = payloadString(step, 'npc_id')
  const locationId = payloadString(step, 'location_id')
  const minigameId = payloadString(step, 'minigame_id')
  const worldObjectId = payloadString(step, 'world_object_id')
  const itemId = payloadString(step, 'item_id')
  const rewardItemId = payloadString(step, 'reward_item_id')

  const primary = (() => {
    switch (step.step_type) {
      case 'talk_to_npc':
      case 'return_to_npc':
        return { kind: 'npc' as const, entry: findCatalog(data, 'npc', npcId), label: findCatalog(data, 'npc', npcId)?.name || npcId || '' }
      case 'reach_location':
        return { kind: 'area' as const, entry: findCatalog(data, 'area', locationId), label: findCatalog(data, 'area', locationId)?.name || locationId || '' }
      case 'play_minigame':
        return { kind: 'minigame' as const, entry: findCatalog(data, 'minigame', minigameId), label: findCatalog(data, 'minigame', minigameId)?.name || minigameId || '' }
      case 'collect_item':
      case 'deliver_item':
        return { kind: 'item' as const, entry: findCatalog(data, 'item', itemId), label: findCatalog(data, 'item', itemId)?.name || itemId || '' }
      default:
        return null
    }
  })()

  const extras: Array<{ kind: CatalogKind; entry: CatalogEntry | undefined; label: string }> = []
  if (step.step_type === 'play_minigame') {
    if (worldObjectId) {
      const entry = findCatalog(data, 'interactable', worldObjectId)
      extras.push({ kind: 'interactable', entry, label: entry?.name || worldObjectId })
    }
    if (rewardItemId) {
      const entry = findCatalog(data, 'item', rewardItemId)
      extras.push({ kind: 'item', entry, label: entry?.name || rewardItemId })
    }
  }
  if (step.step_type === 'deliver_item' && npcId) {
    const entry = findCatalog(data, 'npc', npcId)
    extras.push({ kind: 'npc', entry, label: entry?.name || npcId })
  }

  const dialogue = typeof step.payload.dialogue_id === 'string' && step.payload.dialogue_id
    ? data.dialogues.find((item) => item.key === step.payload.dialogue_id)
    : undefined
  const dialogueLines = dialogue
    ? data.dialogueLines.filter((line) => line.dialogue_id === dialogue.id).sort((a, b) => a.line_order - b.line_order)
    : []

  const summaryBits = [
    npcId && (findCatalog(data, 'npc', npcId)?.name || npcId),
    locationId && (findCatalog(data, 'area', locationId)?.name || locationId),
    minigameId && (findCatalog(data, 'minigame', minigameId)?.name || minigameId),
    itemId && (findCatalog(data, 'item', itemId)?.name || itemId),
  ].filter(Boolean)

  return (
    <div className="preview-step">
      <CatalogThumb
        entry={primary?.entry}
        className={`preview-thumb preview-thumb-step ${primary?.kind === 'item' || primary?.kind === 'minigame' ? 'contain' : ''}`}
        fallback={String(index + 1)}
      />
      <div className="preview-step-card">
        <strong>{step.step_type.replaceAll('_', ' ')}</strong>
        {summaryBits.length > 0 && (
          <small className="content-text" dir="auto">{summaryBits.join(' · ')}</small>
        )}
        {extras.length > 0 && (
          <div className="preview-step-photos">
            {extras.map((photo) => (
              <PhotoLabel key={`${photo.kind}-${photo.label}`} entry={photo.entry} label={photo.label} kind={photo.kind} />
            ))}
          </div>
        )}
        {dialogue && dialogueLines.length > 0 && (
          <div className="preview-dialogue">
            <small className="eyebrow">{t('dialogue')}</small>
            {dialogueLines.map((line) => (
              <p className="content-text" dir="auto" key={line.id}>“{line.content || '…'}”</p>
            ))}
          </div>
        )}
        {step.step_type === 'play_minigame' && (() => {
          const instance = getStepMinigame(data, step)
          const kind = instance?.minigame_id || minigameId
          if (!kind) return null
          const params: Record<string, unknown> = { ...(instance?.params || {}) }
          if (!params.targetWord && instance?.target) params.targetWord = instance.target
          if (!params.targetPhrase && instance?.target) params.targetPhrase = instance.target
          return (
            <MinigameMock
              minigameId={kind}
              params={params}
              instruction={instance?.instruction}
              seed={instance?.key || step.key}
            />
          )
        })()}
        <RewardList data={data} rewards={getStepRewards(data, step.id)} />
      </div>
    </div>
  )
}

export function Preview() {
  const t = useT()
  const { data, selectedLine, selectedQuest, setSelectedQuestId } = useEditorStore()
  const [dialogueOpen, setDialogueOpen] = useState(true)

  if (!selectedLine) {
    return (
      <div className="page-content">
        <EmptyState icon="◉" title={t('chooseQuestlineTitle')} copy={t('chooseQuestlineCopy')} />
      </div>
    )
  }

  const quests = getQuestlineQuests(data, selectedLine.id)
  const quest = selectedQuest
  const questPrereqs = quest
    ? data.prerequisites
      .filter((edge) => edge.quest_id === quest.id)
      .map((edge) => data.quests.find((candidate) => candidate.id === edge.prerequisite_quest_id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : []

  const giverId = quest ? questGiverId(quest, selectedLine) : selectedLine.default_giver_external_id
  const giver = findCatalog(data, 'npc', giverId)
  const introKey = quest ? introDialogueKey(data, quest) : null
  const introDialogue = introKey ? data.dialogues.find((item) => item.key === introKey) : undefined
  const introLines = introDialogue
    ? data.dialogueLines.filter((line) => line.dialogue_id === introDialogue.id).sort((a, b) => a.line_order - b.line_order)
    : []
  const closeKey = quest && quest.wait_for_npc_turn_in ? closeDialogueKey(data, quest) : null
  const closeDialogue = closeKey ? data.dialogues.find((item) => item.key === closeKey) : undefined
  const closeLines = closeDialogue
    ? data.dialogueLines.filter((line) => line.dialogue_id === closeDialogue.id).sort((a, b) => a.line_order - b.line_order)
    : []

  return (
    <div className="page-content preview-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('previewEyebrow')}</p>
          <h1 className="content-text" dir="auto">{selectedLine.display_name}</h1>
          <p className="page-subtitle">{t('previewSubtitle')}</p>
        </div>
        <StatusPill status={selectedLine.status} />
      </div>
      <div className="preview-shell">
        <div className="preview-hero">
          <CatalogThumb entry={findCatalog(data, 'npc', selectedLine.default_giver_external_id)} className="preview-thumb preview-thumb-hero" fallback="✦" />
          <div>
            <p className="eyebrow">{t('learningAdventure')}</p>
            <h2 className="content-text" dir="auto">{selectedLine.display_name}</h2>
            <p className="content-text" dir="auto">{selectedLine.theme}</p>
          </div>
          <div className="preview-progress">
            <strong>{quests.length}</strong>
            <span>{t('questsInPath')}</span>
          </div>
        </div>
        <div className="preview-body">
          <div className="preview-path">
            {quests.map((item, index) => {
              const npc = findCatalog(data, 'npc', questGiverId(item, selectedLine))
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`preview-quest ${item.id === quest?.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedQuestId(item.id)
                    setDialogueOpen(true)
                  }}
                >
                  <span className="preview-quest-number">{String(index + 1).padStart(2, '0')}</span>
                  <CatalogThumb entry={npc} className="preview-thumb preview-thumb-sm" />
                  <span className="preview-quest-copy">
                    <strong className="content-text" dir="auto">{item.name}</strong>
                    <small className="content-text" dir="auto">{t('levelShort', { level: item.level_required })}</small>
                  </span>
                  <StatusPill status={item.status} />
                </button>
              )
            })}
          </div>
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
                      {questPrereqs.map((prereq) => (
                        <span className="preview-chip" key={prereq.id}>{prereq.name || prereq.key}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="preview-npc-hero">
                  <button
                    type="button"
                    className={`preview-npc-btn ${dialogueOpen ? 'open' : ''}`}
                    disabled={!introKey || introLines.length === 0}
                    onClick={() => setDialogueOpen((open) => !open)}
                  >
                    <CatalogThumb entry={giver} className="preview-thumb preview-thumb-giver" />
                    <span className="preview-npc-meta">
                      <strong className="content-text" dir="auto">{giver?.name || giverId || t('defaultGiver')}</strong>
                      {giver?.description && <small className="content-text" dir="auto">{giver.description}</small>}
                      {introKey && introLines.length > 0 && (
                        <small className="preview-npc-hint">{t('previewClickNpc')}</small>
                      )}
                    </span>
                  </button>
                  {dialogueOpen && introLines.length > 0 && (
                    <div className="preview-dialogue preview-intro-dialogue">
                      <small className="eyebrow">{t('previewStartDialogue')}</small>
                      {introLines.map((line) => (
                        <p className="content-text" dir="auto" key={line.id}>“{line.content || '…'}”</p>
                      ))}
                    </div>
                  )}
                </div>

                <RewardList data={data} rewards={getQuestRewards(data, quest.id)} />

                <div className="preview-steps">
                  {getQuestSteps(data, quest.id).map((step, index) => (
                    <StepVisual data={data} step={step} index={index} key={step.id} />
                  ))}
                </div>

                {quest.wait_for_npc_turn_in && (
                  <div className="preview-close-block">
                    <div className="preview-close-header">
                      <CatalogThumb entry={giver} className="preview-thumb preview-thumb-sm" />
                      <div>
                        <small className="eyebrow">{t('previewTurnInDialogue')}</small>
                        <small className="preview-close-badge content-text" dir="auto">{t('waitForNpcTurnIn')}</small>
                      </div>
                    </div>
                    {closeLines.length > 0 ? (
                      <div className="preview-dialogue">
                        {closeLines.map((line) => (
                          <p className="content-text" dir="auto" key={line.id}>“{line.content || '…'}”</p>
                        ))}
                      </div>
                    ) : (
                      <p className="preview-close-missing content-text" dir="auto">{t('noDialogueAttached')}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon="✦" title={t('selectQuestPreviewTitle')} copy={t('selectQuestPreviewCopy')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
