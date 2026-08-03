import { describe, expect, it } from 'vitest'
import { SaveConflictError, publishQuestline, saveQuestlineDraft } from './persistence'
import { createDemoData } from './demoData'
import { buildSnapshotDocument } from './editorData'
import type { EditorData, Questline } from './types'

function fixture(): { data: EditorData; line: Questline } {
  const data = createDemoData()
  const line = data.questlines[0]
  return { data, line }
}

describe('SaveConflictError', () => {
  it('is an Error with the conflict marker message', () => {
    const error = new SaveConflictError()
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('conflict')
    expect(error.name).toBe('SaveConflictError')
  })
})

describe('publishQuestline (local mode)', () => {
  it('creates revision version 1 with an immutable snapshot document', async () => {
    const { data, line } = fixture()
    const result = await publishQuestline({ data, line, userId: null, warningCount: 0 })
    expect(result.version).toBe(1)
    expect(result.revision.status).toBe('published')
    expect(result.revision.questline_id).toBe(line.id)
    expect(result.revision.document).toEqual(buildSnapshotDocument(data, line))
    expect(result.revision.published_at).toBeDefined()
  })

  it('increments version per publish for the same questline', async () => {
    const { data, line } = fixture()
    const first = await publishQuestline({ data, line, userId: null, warningCount: 0 })
    const withRevision: EditorData = { ...data, revisions: [...data.revisions, first.revision] }
    const second = await publishQuestline({ data: withRevision, line, userId: null, warningCount: 1 })
    expect(first.version).toBe(1)
    expect(second.version).toBe(2)
    expect(second.revision.validation_summary.warning_count).toBe(1)
  })

  it('keeps version numbering independent across questlines', async () => {
    const { data } = fixture()
    const a = data.questlines[0]
    const b = data.questlines[1]
    const first = await publishQuestline({ data, line: a, userId: null, warningCount: 0 })
    const withRevision: EditorData = { ...data, revisions: [...data.revisions, first.revision] }
    const resultB = await publishQuestline({ data: withRevision, line: b, userId: null, warningCount: 0 })
    expect(resultB.version).toBe(1)
  })
})

describe('saveQuestlineDraft without backend', () => {
  it('fails fast when Supabase is not configured', async () => {
    const { data, line } = fixture()
    await expect(
      saveQuestlineDraft({
        questline: line,
        quests: data.quests,
        steps: data.steps,
        prerequisites: data.prerequisites,
        rewards: data.rewards,
        dialogues: [],
        dialogueLines: [],
        minigames: [],
        deletedQuestIds: [],
        deletedStepIds: [],
        deletedDialogueIds: [],
        deletedMinigameIds: [],
        expectedUpdatedAt: null,
      }),
    ).rejects.toThrow('Supabase is not configured')
  })
})

describe('payload shape', () => {
  it('scopes shared dialogues out of the default save payload', () => {
    const { data, line } = fixture()
    const payload = {
      questline: line,
      quests: data.quests,
      steps: data.steps,
      prerequisites: data.prerequisites,
      rewards: data.rewards,
      dialogues: [] as typeof data.dialogues,
      dialogueLines: [] as typeof data.dialogueLines,
      minigames: [] as typeof data.minigames,
      deletedQuestIds: [],
      deletedStepIds: [],
      deletedDialogueIds: [],
      deletedMinigameIds: [],
      expectedUpdatedAt: line.updated_at ?? null,
    }
    // Untouched shared entities are never included in a draft save.
    expect(payload.dialogues).toHaveLength(0)
    expect(payload.dialogueLines).toHaveLength(0)
    expect(payload.minigames).toHaveLength(0)
    expect(payload.deletedQuestIds).toHaveLength(0)
  })
})
