import { useT } from '../../i18n'
import { useEditorStore } from '../../state/EditorStore'
import type { DialogueLine } from '../../lib/types'
import { DEFAULT_DIALOGUE_LOCALE } from '../../lib/editorData'
import { FieldLabel } from '../common/FieldLabel'
import { Icon } from '../common/Icon'

export function DialogueLinesEditor({
  dialogueId,
  lines,
  onAddLine,
}: {
  dialogueId: string
  lines: DialogueLine[]
  onAddLine?: () => void
}) {
  const t = useT()
  const { updateDialogueLine, addDialogueLine, removeDialogueLine, moveDialogueLine } = useEditorStore()
  const locales = Array.from(new Set(lines.map((line) => line.locale)))
  const nextLocale = lines[0]?.locale ?? DEFAULT_DIALOGUE_LOCALE
  return (
    <div className="dialogue-lines-editor">
      <div className="dialogue-locale-tabs">
        <span className="eyebrow">{t('lines')}</span>
        {locales.map((locale) => <span className="locale-tab" key={locale}>{locale}</span>)}
        {locales.length === 0 && <span className="locale-tab">{DEFAULT_DIALOGUE_LOCALE}</span>}
      </div>
      {lines.map((line, index) => (
        <div className="dialogue-line-row" key={line.id}>
          <label>
            <FieldLabel hint={t('dialogueTextHint', { n: index + 1, locale: line.locale })}>{t('dialogueText')}</FieldLabel>
            <textarea
              className="content-text"
              rows={2}
              value={line.content}
              dir="auto"
              onChange={(event) => updateDialogueLine(line.id, { content: event.target.value })}
              placeholder={t('dialoguePlaceholder')}
            />
          </label>
          <div className="dialogue-line-actions">
            <button type="button" className="icon-button" aria-label={t('moveLineUp')} disabled={index === 0} onClick={() => moveDialogueLine(line.id, -1)}>↑</button>
            <button type="button" className="icon-button" aria-label={t('moveLineDown')} disabled={index === lines.length - 1} onClick={() => moveDialogueLine(line.id, 1)}>↓</button>
            <button type="button" className="icon-button" aria-label={t('removeLine')} disabled={lines.length <= 1} onClick={() => removeDialogueLine(line.id)}><Icon name="close" /></button>
          </div>
        </div>
      ))}
      <button type="button" className="add-inline-button" onClick={onAddLine ?? (() => addDialogueLine(dialogueId, nextLocale))}><Icon name="plus" /> {t('addLine')}</button>
    </div>
  )
}
