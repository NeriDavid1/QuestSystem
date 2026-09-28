import { useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocaleProvider } from '../../i18n/LocaleContext'
import { getMinigameParamsForEntry } from '../../lib/minigameParams'
import { tracingSymbols } from '../../lib/letterDrawing'
import type { CatalogEntry, MinigameInstance } from '../../lib/types'
import { MinigameParamsEditor } from './MinigameParamsEditor'

const legacyCatalog: CatalogEntry = {
  id: 1, kind: 'minigame', external_id: 'letter_drawing', name: 'Letter Drawing',
  description: null, status: null, image_path: null, metadata: { content_fields: ['symbols'] },
}

function DrawingForm() {
  const [params, setParams] = useState<Record<string, unknown>>({ symbols: ['B'] })
  const minigame: MinigameInstance = {
    id: 'drawing', key: 'drawing', minigame_id: 'letter_drawing', params,
    locale: 'he', instruction: null, tasks: [], target: null, variant: null,
    success: null, source_path: null, source_metadata: {},
  }
  return <LocaleProvider>
    <MinigameParamsEditor minigame={minigame} fields={getMinigameParamsForEntry(legacyCatalog)} onChange={setParams} />
    <output data-testid="resolved-letters">{tracingSymbols(params).join('')}</output>
    <output data-testid="saved-params">{JSON.stringify(params)}</output>
  </LocaleProvider>
}

describe('Letter Drawing word authoring', () => {
  it('shows word input for an existing catalog-based exercise and resolves typed letters', () => {
    const ui = render(<DrawingForm />)
    const word = ui.getByPlaceholderText('הקלידו כאן מילה לציור')
    expect(word).not.toBeNull()
    expect((word as HTMLInputElement).value).toBe('')
    expect(ui.getByTestId('resolved-letters').textContent).toBe('B')
    fireEvent.change(word, { target: { value: 'Apple' } })
    expect(ui.getByTestId('resolved-letters').textContent).toBe('Apple')
    const saved = JSON.parse(ui.getByTestId('saved-params').textContent!)
    expect(saved).toEqual({ symbols: ['B'], word: 'Apple', drawingInputMode: 'Word' })
    expect(ui.container.querySelector('select')).toBeNull()
    fireEvent.change(word, { target: { value: '' } })
    expect(ui.getByTestId('resolved-letters').textContent).toBe('B')
    expect(JSON.parse(ui.getByTestId('saved-params').textContent!).drawingInputMode).toBe('Symbols')
  })
})
