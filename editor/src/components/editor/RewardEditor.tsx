import { useT } from '../../i18n'
import type { EditorData, QuestReward } from '../../lib/types'
import { Icon } from '../common/Icon'
import { CatalogSelect } from './CatalogSelect'

export function RewardEditor({
  data,
  rewards,
  onAdd,
  onUpdate,
  onRemove,
}: {
  data: EditorData
  rewards: QuestReward[]
  onAdd: () => void
  onUpdate: (rewardId: string, patch: Partial<QuestReward>) => void
  onRemove: (rewardId: string) => void
}) {
  const t = useT()
  return (
    <div className="reward-editor">
      {rewards.map((reward) => (
        <div className={`reward-editor-row ${reward.reward_type}`} key={reward.id}>
          <select
            aria-label={t('rewardTypeAria')}
            value={reward.reward_type}
            onChange={(event) => {
              const type = event.target.value as QuestReward['reward_type']
              onUpdate(
                reward.id,
                type === 'xp'
                  ? { reward_type: type, xp_amount: reward.xp_amount ?? 50, item_external_id: null, amount: null }
                  : {
                    reward_type: type,
                    xp_amount: null,
                    item_external_id: reward.item_external_id ?? data.catalog.find((entry) => entry.kind === 'item')?.external_id ?? null,
                    amount: reward.amount ?? 1,
                  },
              )
            }}
          >
            <option value="xp">{t('rewardXp')}</option>
            <option value="item">{t('rewardItem')}</option>
          </select>
          {reward.reward_type === 'xp' ? (
            <input
              aria-label={t('xpAmountAria')}
              type="number"
              min={0}
              value={reward.xp_amount ?? 0}
              onChange={(event) => onUpdate(reward.id, { xp_amount: Number(event.target.value) })}
            />
          ) : (
            <>
              <CatalogSelect
                kind="item"
                value={reward.item_external_id ?? ''}
                data={data}
                onChange={(value) => onUpdate(reward.id, { item_external_id: value || null })}
              />
              <input
                aria-label={t('itemAmountAria')}
                type="number"
                min={1}
                value={reward.amount ?? 1}
                onChange={(event) => onUpdate(reward.id, { amount: Number(event.target.value) })}
              />
            </>
          )}
          <button type="button" className="icon-button reward-remove" aria-label={t('removeRewardAria')} onClick={() => onRemove(reward.id)}><Icon name="close" /></button>
        </div>
      ))}
      <button type="button" className="add-inline-button" onClick={onAdd}><Icon name="plus" /> {t('addReward')}</button>
    </div>
  )
}
