import { memo } from 'react'
import { useT } from '../../i18n'
import type { Quest, QuestPrerequisite, QuestStep } from '../../lib/types'
import { getStatusLabel } from '../../lib/labels'

function GraphWithStepCountsInner({
  quests,
  prerequisites,
  steps,
  selectedQuestId,
  onSelect,
}: {
  quests: Quest[]
  prerequisites: QuestPrerequisite[]
  steps: QuestStep[]
  selectedQuestId: string
  onSelect: (questId: string) => void
}) {
  const t = useT()
  const nodeWidth = 192
  const nodeHeight = 110
  const gap = 22
  const padding = 30
  const width = Math.max(720, padding * 2 + quests.length * (nodeWidth + gap) - gap)
  const height = 248
  const positions = new Map(
    quests.map((quest, index) => [quest.id, { x: padding + index * (nodeWidth + gap), y: 55 }]),
  )

  return (
    <div className="graph-scroll">
      <svg
        className="quest-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('graphAria')}
        style={{ minWidth: width }}
      >
        <defs>
          <linearGradient id="edge-gradient-main" x1="0" x2="1">
            <stop offset="0%" stopColor="#8a79ff" />
            <stop offset="100%" stopColor="#5bddd1" />
          </linearGradient>
          <filter id="node-shadow-main" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#07152e" floodOpacity="0.12" />
          </filter>
          <marker id="arrowhead-main" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#8a79ff" />
          </marker>
        </defs>
        {prerequisites.map((edge) => {
          const from = positions.get(edge.prerequisite_quest_id)
          const to = positions.get(edge.quest_id)
          if (!from || !to) return null
          const startX = from.x + nodeWidth
          const endX = to.x
          const midX = (startX + endX) / 2
          return (
            <path
              key={`${edge.prerequisite_quest_id}-${edge.quest_id}`}
              d={`M ${startX} ${from.y + nodeHeight / 2} C ${midX} ${from.y + nodeHeight / 2}, ${midX} ${to.y + nodeHeight / 2}, ${endX} ${to.y + nodeHeight / 2}`}
              className="graph-edge"
              markerEnd="url(#arrowhead-main)"
            />
          )
        })}
        {quests.map((quest, index) => {
          const point = positions.get(quest.id)
          if (!point) return null
          const selected = quest.id === selectedQuestId
          const stepCount = steps.filter((step) => step.quest_id === quest.id).length
          return (
            <g
              key={quest.id}
              transform={`translate(${point.x}, ${point.y})`}
              className={`graph-node ${selected ? 'selected' : ''}`}
              onClick={() => onSelect(quest.id)}
              tabIndex={0}
              role="button"
              aria-label={t('openQuestAria', { name: quest.name })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(quest.id)
              }}
            >
              <rect width={nodeWidth} height={nodeHeight} rx="17" filter="url(#node-shadow-main)" />
              <rect className="node-accent" width="5" height={nodeHeight} rx="2.5" />
              <text className="node-index" x="20" y="28">{String(index + 1).padStart(2, '0')}</text>
              <text className="node-name content-text" x="20" y="55">
                {quest.name.length > 25 ? `${quest.name.slice(0, 24)}…` : quest.name}
              </text>
              <text className="node-meta" x="20" y="82">{stepCount}</text>
              <text className="node-meta-label" x="32" y="82">{t('stepsLabel')}</text>
              <text className="node-level" x={nodeWidth - 20} y="28" textAnchor="end">{t('levelShort', { level: quest.level_required })}</text>
              <circle className="node-status-dot" cx={nodeWidth - 24} cy={nodeHeight - 20} r="4" />
              <text className="node-status" x={nodeWidth - 34} y={nodeHeight - 16} textAnchor="end">
                {getStatusLabel(t, quest.status)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export const GraphWithStepCounts = memo(GraphWithStepCountsInner)
