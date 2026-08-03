import { useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { Icon } from '../common/Icon'

export function QuestlineRail() {
  const t = useT()
  const {
    data,
    selectedQuestlineId,
    setSelectedQuestlineId,
    setSelectedQuestId,
    setSelectedStepId,
    setShowNewQuestline,
    removeQuestline,
    duplicateQuestline,
    openConfirm,
  } = useEditorStore()
  const [filter, setFilter] = useState('')
  const visibleLines = data.questlines.filter((line) =>
    line.display_name.toLowerCase().includes(filter.toLowerCase().trim()),
  )

  return (
    <aside className="questline-rail">
      <div className="rail-heading">
        <div><p className="eyebrow">{t('workspaceLabel')}</p><h2>{t('questlines')}</h2></div>
        <button className="icon-button" onClick={() => setShowNewQuestline(true)} aria-label={t('railCreateAria')}><Icon name="plus" /></button>
      </div>
      <div className="rail-search"><Icon name="search" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t('railFilterPlaceholder')} /></div>
      <div className="rail-list">
        {visibleLines.map((line) => {
          const active = line.id === selectedQuestlineId
          const count = data.quests.filter((quest) => quest.questline_id === line.id).length
          return (
            <div className={`rail-line-wrap ${active ? 'active' : ''}`} key={line.id}>
              <button className="rail-line" onClick={() => { setSelectedQuestlineId(line.id); setSelectedQuestId(''); setSelectedStepId('') }}>
                <span className="rail-line-icon">{line.display_name.slice(0, 1)}</span>
                <span><strong>{line.display_name}</strong><small>{t('questsCount', { count })}</small></span>
                <span className={`rail-status ${line.status}`} />
              </button>
              <div className="rail-line-actions">
                <button
                  type="button"
                  className="rail-action"
                  aria-label={t('duplicateLineAria')}
                  title={t('duplicateLineAria')}
                  onClick={() => duplicateQuestline(line.id)}
                >
                  <Icon name="copy" />
                </button>
                <button
                  type="button"
                  className="rail-action"
                  aria-label={t('deleteLineAria')}
                  title={t('deleteLineAria')}
                  onClick={() => {
                    openConfirm({
                      title: t('deleteLineAria'),
                      message: line.display_name,
                      confirmLabel: t('deleteLineAria'),
                      tone: 'danger',
                      onConfirm: () => removeQuestline(line.id),
                    })
                  }}
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>
          )
        })}
        {visibleLines.length === 0 && <span className="muted rail-empty">{t('railEmpty')}</span>}
      </div>
      <div className="rail-tip"><span className="tip-spark">✦</span><div><strong>{t('creatorTipTitle')}</strong><p>{t('creatorTipCopy')}</p></div></div>
    </aside>
  )
}
