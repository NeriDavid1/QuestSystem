import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocaleProvider } from '../i18n'
import { EditorStoreProvider, useEditorStore } from './EditorStore'

function Probe() {
  const { data, issues, addQuest, addStep, updateQuest, removeQuestline, selectedQuestlineId } = useEditorStore()
  const errors = issues.filter((issue) => issue.severity === 'error').length
  return (
    <div>
      <span data-testid="quest-count">{data.quests.length}</span>
      <span data-testid="step-count">{data.steps.length}</span>
      <span data-testid="questline-count">{data.questlines.length}</span>
      <span data-testid="selected-questline">{selectedQuestlineId}</span>
      <span data-testid="error-count">{errors}</span>
      <button onClick={addQuest}>add-quest</button>
      <button onClick={addStep}>add-step</button>
      <button onClick={() => {
        const quest = data.quests[data.quests.length - 1]
        if (quest) updateQuest({ name: 'Named quest' })
      }}>name-quest</button>
      <button onClick={() => {
        const lineId = selectedQuestlineId || data.questlines[0]?.id
        if (lineId) removeQuestline(lineId)
      }}>remove-questline</button>
    </div>
  )
}

describe('EditorStore critical flow', () => {
  it('add quest -> add step -> validation state updates', async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <EditorStoreProvider>
          <Probe />
        </EditorStoreProvider>
      </LocaleProvider>,
    )

    const initialQuests = Number(screen.getByTestId('quest-count').textContent)
    expect(initialQuests).toBeGreaterThan(0)
    // Fresh demo data validates cleanly.
    await waitFor(() => expect(screen.getByTestId('error-count').textContent).toBe('0'))

    await user.click(screen.getByRole('button', { name: 'add-quest' }))
    await waitFor(() => expect(screen.getByTestId('quest-count').textContent).toBe(String(initialQuests + 1)))
    // New quest has no steps -> validation flags it.
    await waitFor(() => expect(Number(screen.getByTestId('error-count').textContent)).toBeGreaterThan(0))

    await user.click(screen.getByRole('button', { name: 'add-step' }))
    await waitFor(() => expect(screen.getByTestId('step-count').textContent).toBe(String(initialQuests * 2 + 1)))

    await user.click(screen.getByRole('button', { name: 'name-quest' }))
    await user.click(screen.getByRole('button', { name: 'add-step' }))
    // Step missing a required dialogue still keeps errors non-zero after naming.
    await waitFor(() => expect(Number(screen.getByTestId('error-count').textContent)).toBeGreaterThan(0))
  })

  it('undo restores a previously added quest', async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <EditorStoreProvider>
          <Probe />
        </EditorStoreProvider>
      </LocaleProvider>,
    )
    const before = Number(screen.getByTestId('quest-count').textContent)
    await user.click(screen.getByRole('button', { name: 'add-quest' }))
    await waitFor(() => expect(screen.getByTestId('quest-count').textContent).toBe(String(before + 1)))

    // Store registers Ctrl/Cmd+Z undo via a window keydown listener.
    await user.keyboard('{Control>}z{/Control}')
    await waitFor(() => expect(screen.getByTestId('quest-count').textContent).toBe(String(before)))
  })

  it('removeQuestline drops the line and selects another remaining line', async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <EditorStoreProvider>
          <Probe />
        </EditorStoreProvider>
      </LocaleProvider>,
    )

    await waitFor(() => expect(Number(screen.getByTestId('questline-count').textContent)).toBeGreaterThan(1))
    const beforeLines = Number(screen.getByTestId('questline-count').textContent)
    const beforeQuests = Number(screen.getByTestId('quest-count').textContent)
    const removedId = screen.getByTestId('selected-questline').textContent ?? ''

    await user.click(screen.getByRole('button', { name: 'remove-questline' }))

    await waitFor(() => {
      expect(screen.getByTestId('questline-count').textContent).toBe(String(beforeLines - 1))
      expect(Number(screen.getByTestId('quest-count').textContent)).toBeLessThan(beforeQuests)
      expect(screen.getByTestId('selected-questline').textContent).not.toBe(removedId)
      expect(screen.getByTestId('selected-questline').textContent).not.toBe('')
    })
  })
})
