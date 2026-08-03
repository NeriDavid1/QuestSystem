import type { CatalogKind } from './types'
import { useT } from '../i18n'

export type Translate = ReturnType<typeof useT>

export function getCatalogKindLabels(t: Translate): Record<CatalogKind, string> {
  return {
    area: t('catalogAreas'),
    npc: t('catalogNpcs'),
    interactable: t('catalogStations'),
    item: t('catalogItems'),
    minigame: t('catalogMinigames'),
  }
}

export function getCatalogKindSingular(t: Translate, kind: CatalogKind): string {
  return {
    area: t('catalogArea'),
    npc: t('catalogNpc'),
    interactable: t('catalogStation'),
    item: t('catalogItem'),
    minigame: t('catalogMinigame'),
  }[kind]
}

export function getCatalogStatusLabel(t: Translate, status: string): string {
  if (status === 'live_used') return t('liveUsed')
  if (status === 'catalog_stub' || status === 'catalog') return t('catalogStub')
  return status.replace('_', ' ')
}

export function getStatusLabel(t: Translate, status: string): string {
  if (status === 'draft') return t('statusDraft')
  if (status === 'published') return t('statusPublished')
  if (status === 'complete') return t('statusComplete')
  return status.replace('_', ' ')
}

export const catalogKindIcons: Record<CatalogKind, string> = {
  area: '⌖',
  npc: '♙',
  interactable: '▣',
  item: '✦',
  minigame: '⌘',
}

export const catalogKindRefSuffixes: Record<CatalogKind, string> = {
  npc: 'npcs',
  area: 'areas',
  interactable: 'interactables',
  item: 'items',
  minigame: 'minigames',
}
