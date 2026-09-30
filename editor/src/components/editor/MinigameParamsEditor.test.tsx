import { useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocaleProvider } from '../../i18n/LocaleContext'
import { getMinigameParamsForEntry } from '../../lib/minigameParams'
import { tracingSteps } from '../../lib/letterDrawing'
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
    <output data-testid="resolved-letters">{tracingSteps(params).join(',')}</output>
    <output data-testid="saved-params">{JSON.stringify(params)}</output>
  </LocaleProvider>
}

describe('Letter Drawing manual authoring', () => {
  it('lets the author type letters and a word in one ordered list', () => {
    const ui = render(<DrawingForm />)
    const letter = ui.getByPlaceholderText('A / Apple') as HTMLInputElement
    expect(letter.value).toBe('B')
    fireEvent.click(ui.getByText('הוספת אות או מילה'))
    const entries = ui.getAllByPlaceholderText('A / Apple') as HTMLInputElement[]
    fireEvent.change(entries[1], { target: { value: 'bag' } })
    expect(ui.getByTestId('resolved-letters').textContent).toBe('B,bag')
    const saved = JSON.parse(ui.getByTestId('saved-params').textContent!)
    expect(saved).toEqual({ symbols: ['B', 'bag'] })
    expect(ui.container.querySelector('select')).toBeNull()
  })
})
