import { useState, type FormEvent } from 'react'
import { useT } from '../../i18n'
import { slugify } from '../../lib/editorData'
import { Modal } from './Modal'
import { FieldLabel } from './FieldLabel'
import { Icon } from './Icon'

export function NewQuestlineModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, key: string, theme: string) => void
}) {
  const t = useT()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [theme, setTheme] = useState('')
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCreate(name.trim(), (key || slugify(name)).trim(), theme.trim())
  }
  return (
    <Modal title={t('createQuestline')} eyebrow={t('newStory')} onClose={onClose}>
      <form className="form-stack" onSubmit={create}>
        <label>
          <FieldLabel>{t('displayName')}</FieldLabel>
          <input className="content-text" dir="auto" value={name} onChange={(event) => { setName(event.target.value); if (!key) setKey(slugify(event.target.value)) }} placeholder={t('displayNamePlaceholder')} required />
        </label>
        <label>
          <FieldLabel hint={t('questlineKeyHint')}>{t('questlineKey')}</FieldLabel>
          <input dir="ltr" value={key} onChange={(event) => setKey(slugify(event.target.value))} placeholder={t('questlineKeyPlaceholder')} required />
        </label>
        <label>
          <FieldLabel>{t('learningGoal')}</FieldLabel>
          <textarea className="content-text" dir="auto" value={theme} onChange={(event) => setTheme(event.target.value)} rows={3} placeholder={t('learningGoalPlaceholder')} />
        </label>
        <div className="modal-actions">
          <button type="button" className="button subtle" onClick={onClose}>{t('cancel')}</button>
          <button className="button primary"><Icon name="plus" /> {t('createDraft')}</button>
        </div>
      </form>
    </Modal>
  )
}
