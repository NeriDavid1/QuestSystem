import { describe, expect, it } from 'vitest'
import { createDemoData } from './demoData'
import { buildQuestlineExportFiles } from './questlineExport'

describe('buildQuestlineExportFiles', () => {
  it('exports the selected questline as canonical YAML files plus a snapshot', () => {
    const data = createDemoData()
    const line = data.questlines[0]
    const files = buildQuestlineExportFiles(data, line)
    const paths = files.map((file) => file.path)

    expect(paths).toContain(`questlines/${line.key}/_index.yaml`)
    expect(paths).toContain(`questlines/${line.key}/_snapshot.json`)
    expect(paths).toContain(`questlines/${line.key}/q01_bridge_too_short.yaml`)
    expect(files.find((file) => file.path.endsWith('_index.yaml'))?.content).toContain(`id: ${line.key}`)
  })

  it('normalizes imported minigame instance keys back to instance_id', () => {
    const data = createDemoData()
    const line = data.questlines[0]
    const playStep = data.steps.find((step) => step.step_type === 'play_minigame')
    if (!playStep) throw new Error('Expected demo data to include a play_minigame step.')
    const quest = data.quests.find((item) => item.id === playStep.quest_id)
    if (!quest) throw new Error('Expected play_minigame step to belong to a quest.')

    playStep.payload = { ...playStep.payload, instance_key: 'imported_instance', instance_id: '' }
    const files = buildQuestlineExportFiles(data, line)
    const questFile = files.find((file) => file.path.endsWith(`${quest.key}.yaml`))

    expect(questFile?.content).toContain('instance_id: imported_instance')
    expect(questFile?.content).not.toContain('instance_key')
  })
})
