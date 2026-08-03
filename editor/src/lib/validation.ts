import type { EditorData, Questline, ValidationIssue } from './types'
import type { MessageKey } from '../i18n/messages'
import {
  getCatalogKindForRef,
  getQuestSteps,
  getQuestlineQuests,
  getStepMinigameKey,
  getStepType,
} from './editorData'

export type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string

export function validateQuestline(
  data: EditorData,
  line: Questline | undefined,
  t: TranslateFn,
): ValidationIssue[] {
  if (!line) {
    return [{ severity: 'error', code: 'missing_line', message: t('validationSelectLine') }]
  }

  const issues: ValidationIssue[] = []
  const quests = getQuestlineQuests(data, line.id)
  const keys = new Set<string>()

  if (quests.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty_questline',
      message: t('validationEmptyLine'),
      entityId: line.id,
    })
  }

  for (const quest of quests) {
    if (keys.has(quest.key)) {
      issues.push({
        severity: 'error',
        code: 'duplicate_quest_key',
        message: t('validationDuplicateKey', { key: quest.key }),
        entityId: quest.id,
      })
    }
    keys.add(quest.key)

    if (!quest.name.trim()) {
      issues.push({
        severity: 'error',
        code: 'missing_quest_name',
        message: t('validationMissingName'),
        entityId: quest.id,
      })
    }
    if (!quest.giver_external_id) {
      issues.push({
        severity: 'warning',
        code: 'missing_giver',
        message: t('validationMissingGiver', { name: quest.name || t('untitledQuest') }),
        entityId: quest.id,
      })
    }

    const steps = getQuestSteps(data, quest.id)
    if (steps.length === 0) {
      issues.push({
        severity: 'error',
        code: 'empty_quest',
        message: t('validationNoSteps', { name: quest.name || t('untitledQuest') }),
        entityId: quest.id,
      })
    }

    for (const step of steps) {
      const type = getStepType(data, step.step_type)
      if (!type) {
        issues.push({
          severity: 'error',
          code: 'unknown_step_type',
          message: t('validationUnknownStep', { key: step.key }),
          entityId: step.id,
        })
        continue
      }

      for (const field of type.fields) {
        const value = step.payload[field.name]
        if (field.required && (value === undefined || value === null || value === '')) {
          issues.push({
            severity: 'error',
            code: 'missing_step_field',
            message: t('validationMissingField', { field: field.name, type: type.id }),
            entityId: step.id,
          })
        }

        const kind = getCatalogKindForRef(field.ref)
        if (kind && value) {
          const found = data.catalog.some(
            (entry) => entry.kind === kind && entry.external_id === String(value),
          )
          if (!found) {
            issues.push({
              severity: 'warning',
              code: 'unresolved_reference',
              message: t('validationUnresolvedRef', { value: String(value), kind }),
              entityId: step.id,
            })
          }
        }

        if (field.ref?.includes('dialogues') && value) {
          const found = data.dialogues.some((dialogue) => dialogue.key === String(value))
          if (!found) {
            issues.push({
              severity: 'warning',
              code: 'unresolved_dialogue',
              message: t('validationUnresolvedDialogue', { value: String(value) }),
              entityId: step.id,
            })
          }
        }

        if (field.ref?.includes('minigame_instances')) {
          const minigameValue = getStepMinigameKey(step)
          if (minigameValue) {
            const found = data.minigames.some((minigame) => minigame.key === minigameValue)
            if (!found) {
              issues.push({
                severity: 'warning',
                code: 'unresolved_minigame',
                message: t('validationUnresolvedMinigame', { value: minigameValue }),
                entityId: step.id,
              })
            }
          }
        }
      }
    }
  }

  const questIds = new Set(quests.map((item) => item.id))
  const stepIds = new Set(data.steps.filter((step) => questIds.has(step.quest_id)).map((step) => step.id))
  for (const reward of data.rewards.filter((item) =>
    (item.scope === 'quest' && item.quest_id !== null && questIds.has(item.quest_id))
    || (item.scope === 'step' && item.step_id !== null && stepIds.has(item.step_id)),
  )) {
    if (reward.reward_type === 'xp' && (reward.xp_amount === null || reward.xp_amount < 0)) {
      issues.push({
        severity: 'error',
        code: 'invalid_xp_reward',
        message: t('validationInvalidXp'),
        entityId: reward.id,
      })
    }
    if (reward.reward_type === 'item' && (!reward.item_external_id || !reward.amount || reward.amount < 1)) {
      issues.push({
        severity: 'error',
        code: 'invalid_item_reward',
        message: t('validationInvalidItem'),
        entityId: reward.id,
      })
    }
  }

  const byId = new Map(quests.map((quest) => [quest.id, quest]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (questId: string): boolean => {
    if (visiting.has(questId)) return true
    if (visited.has(questId)) return false
    visiting.add(questId)
    const hasCycle = data.prerequisites
      .filter((edge) => edge.quest_id === questId)
      .some((edge) => byId.has(edge.prerequisite_quest_id) && visit(edge.prerequisite_quest_id))
    visiting.delete(questId)
    visited.add(questId)
    return hasCycle
  }

  if (quests.some((quest) => visit(quest.id))) {
    issues.push({
      severity: 'error',
      code: 'cycle',
      message: t('validationCycle'),
      entityId: line.id,
    })
  }

  return issues
}
