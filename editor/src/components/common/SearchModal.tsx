import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { Modal } from './Modal'
import { Icon } from './Icon'

interface SearchResult {
  id: string
  type: 'questline' | 'quest' | 'step' | 'dialogue' | 'minigame' | 'catalog'
  title: string
  subtitle: string
}

export function SearchModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const {
    data,
    setView,
    setLibraryTab,
    setSelectedQuestlineId,
    setSelectedQuestId,
    setSelectedStepId,
  } = useEditorStore()
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()

  const results = useMemo<SearchResult[]>(() => {
    if (!normalized) return []
    const matches = (value: string) => value.toLowerCase().includes(normalized)
    const output: SearchResult[] = []

    for (const line of data.questlines) {
      if (matches(line.display_name) || matches(line.key)) {
        output.push({ id: `ql-${line.id}`, type: 'questline', title: line.display_name, subtitle: line.key })
      }
    }
    for (const quest of data.quests) {
      if (matches(quest.name) || matches(quest.key)) {
        const line = data.questlines.find((item) => item.id === quest.questline_id)
        output.push({ id: `q-${quest.id}`, type: 'quest', title: quest.name, subtitle: `${line?.display_name ?? ''} · ${quest.key}` })
      }
    }
    for (const step of data.steps) {
      if (matches(step.key) || matches(step.step_type)) {
        const quest = data.quests.find((item) => item.id === step.quest_id)
        output.push({ id: `s-${step.id}`, type: 'step', title: step.key, subtitle: `${quest?.name ?? ''} · ${step.step_type}` })
      }
    }
    for (const dialogue of data.dialogues) {
      if (matches(dialogue.key)) {
        output.push({ id: `d-${dialogue.id}`, type: 'dialogue', title: dialogue.key, subtitle: dialogue.speaker_external_id ?? '' })
      }
    }
    for (const minigame of data.minigames) {
      if (matches(minigame.key) || matches(minigame.instruction ?? '')) {
        output.push({ id: `m-${minigame.id}`, type: 'minigame', title: minigame.key, subtitle: minigame.instruction ?? '' })
      }
    }
    for (const entry of data.catalog) {
      if (matches(entry.name) || matches(entry.external_id)) {
        output.push({ id: `c-${entry.id}`, type: 'catalog', title: entry.name, subtitle: entry.external_id })
      }
    }
    return output.slice(0, 40)
  }, [data, normalized])

  const open = (result: SearchResult) => {
    if (result.type === 'questline') {
      setSelectedQuestlineId(result.id.replace('ql-', ''))
      setView('editor')
    } else if (result.type === 'quest') {
      const quest = data.quests.find((item) => item.id === result.id.replace('q-', ''))
      if (quest) {
        setSelectedQuestlineId(quest.questline_id)
        setSelectedQuestId(quest.id)
        setView('editor')
      }
    } else if (result.type === 'step') {
      const step = data.steps.find((item) => item.id === result.id.replace('s-', ''))
      const quest = step ? data.quests.find((item) => item.id === step.quest_id) : undefined
      if (step && quest) {
        setSelectedQuestlineId(quest.questline_id)
        setSelectedQuestId(quest.id)
        setSelectedStepId(step.id)
        setView('editor')
      }
    } else if (result.type === 'dialogue') {
      setLibraryTab('dialogues')
      setView('library')
    } else if (result.type === 'minigame') {
      setLibraryTab('minigames')
      setView('library')
    } else {
      setLibraryTab('catalog')
      setView('library')
    }
    onClose()
  }

  const typeLabel: Record<SearchResult['type'], string> = {
    questline: t('searchQuestline'),
    quest: t('searchQuest'),
    step: t('searchStep'),
    dialogue: t('searchDialogue'),
    minigame: t('searchMinigame'),
    catalog: t('searchCatalog'),
  }

  return (
    <Modal title={t('searchModalTitle')} onClose={onClose} widthClass="search-modal">
      <div className="search-box search-modal-input">
        <Icon name="search" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholderAll')}
        />
      </div>
      {normalized && (
        <p className="search-count muted">
          {results.length ? t('searchResultsCount', { count: results.length }) : t('searchNoResults')}
        </p>
      )}
      <div className="search-results">
        {results.map((result) => (
          <button key={result.id} className="search-result" onClick={() => open(result)}>
            <span className="search-result-type">{typeLabel[result.type]}</span>
            <span className="search-result-copy">
              <strong className="content-text" dir="auto">{result.title}</strong>
              <small dir="ltr">{result.subtitle}</small>
            </span>
            <Icon name="chevron" />
          </button>
        ))}
        {normalized && results.length === 0 && (
          <p className="empty-inline">{t('searchNoResults')}</p>
        )}
      </div>
    </Modal>
  )
}
