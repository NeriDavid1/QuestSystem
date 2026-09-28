import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocaleProvider } from '../../i18n/LocaleContext'
import { MinigameMock } from './MinigameMock'

function preview(kind: string, params: Record<string, unknown>) {
  return render(<LocaleProvider><MinigameMock minigameId={kind} params={params} seed="bee" /></LocaleProvider>).container
}

describe('Listen & Build preview', () => {
  it('uses the Unity frame and square tile art even without an assigned recording', () => {
    const ui = preview('listening_letter_ordering', { targetWord: 'bee', prompt: 'Clue', visualVariant: 'Classic' })
    expect(ui.querySelector('.mg-listen-frame')?.getAttribute('src')).toContain('ListeningFrame')
    expect(ui.querySelectorAll('.mg-listen-slots img')).toHaveLength(3)
    expect(ui.querySelector('.mg-listen-tiles span')?.getAttribute('style')).toContain('LetterTile')
    expect(ui.querySelector('.mg-listen-controls')).toBeNull()
    expect(ui.querySelector('.mg-listen-prompt')?.textContent).toBe('Clue')
  })

  it('shows the Unity speaker for audio and respects the clue mode', () => {
    const ui = preview('listening_letter_ordering', { targetWord: 'bee', prompt: 'Hidden clue', promptAudio: 'Assets/BEE.mp3', hintMode: 'AudioOnly' })
    expect(ui.querySelector('.mg-listen-controls img')?.getAttribute('src')).toContain('ListenButton')
    expect(ui.querySelector('.mg-listen-prompt')?.textContent).not.toBe('Hidden clue')
  })

  it('keeps the original Letter Ordering preview', () => {
    const ui = preview('letter_ordering', { targetWord: 'bee', visualVariant: 'ListenAndBuild' })
    expect(ui.querySelector('.mg-mock-parchment')).not.toBeNull()
    expect(ui.querySelector('.mg-listen-board')).toBeNull()
  })
})
