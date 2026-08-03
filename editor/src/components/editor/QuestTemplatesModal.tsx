import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import { Modal } from '../common/Modal'
import { Icon } from '../common/Icon'

export function QuestTemplatesModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { createQuestFromTemplate } = useEditorStore()

  const useTemplate = (kind: 'blank' | 'adventure') => {
    createQuestFromTemplate(kind)
    onClose()
  }

  return (
    <Modal title={t('templateTitle')} eyebrow={t('newStory')} onClose={onClose}>
      <p className="modal-copy">{t('templateCopy')}</p>
      <div className="template-grid">
        <button className="template-card" onClick={() => useTemplate('blank')}>
          <span className="template-icon">+</span>
          <strong>{t('templateBlank')}</strong>
          <p>{t('templateBlankCopy')}</p>
          <span className="template-cta"><Icon name="plus" /> {t('templateUse')}</span>
        </button>
        <button className="template-card" onClick={() => useTemplate('adventure')}>
          <span className="template-icon">✦</span>
          <strong>{t('templateAdventure')}</strong>
          <p>{t('templateAdventureCopy')}</p>
          <span className="template-cta"><Icon name="plus" /> {t('templateUse')}</span>
        </button>
      </div>
    </Modal>
  )
}
