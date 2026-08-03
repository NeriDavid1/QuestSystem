import type {
  CatalogEntry,
  Dialogue,
  DialogueLine,
  EditorData,
  MinigameInstance,
  Quest,
  QuestPrerequisite,
  QuestReward,
  QuestStep,
  Questline,
  StepTypeDefinition,
} from './types'

const questlineSpecs = [
  {
    id: 'demo-ql-adjective',
    key: 'adjective_crown',
    display_name: 'The Adjective Crown',
    theme: 'Basic English adjectives through completion, speaking, and final matching games',
    giver: 'teacher_maya',
    count: 6,
  },
  {
    id: 'demo-ql-blacksmith',
    key: 'blacksmith_will',
    display_name: 'Will the Smith — First Slash',
    theme: 'Silly forge adventures; unlock Slash with the easiest kid words',
    giver: 'Blacksmith',
    count: 3,
  },
  {
    id: 'demo-ql-maya',
    key: 'english_kingdom_maya',
    display_name: 'English Kingdom — Letter Path',
    theme: 'English letters A–J (levels 1–10)',
    giver: 'teacher_maya',
    count: 10,
  },
  {
    id: 'demo-ql-nouns',
    key: 'kingdom_nouns',
    display_name: 'The Kingdom Book of Nouns',
    theme: 'Kingdom nouns through comic mix-ups — spell and speak',
    giver: 'teacher_maya',
    count: 7,
  },
] as const

const questNames: Record<string, string[]> = {
  adjective_crown: [
    'The Bridge Is Too Short',
    'The Whispering Stone',
    'Big and Small Words',
    'Twelve Basic Adjectives',
    'From Low to High',
    'The Adjective Challenge',
  ],
  blacksmith_will: ['The Runaway Hammer', 'The Snoring Anvil', 'First Real Slash'],
  english_kingdom_maya: [
    'The Runaway A',
    'The Bee Bandit',
    'Cat on the C',
    'The Dog Ate My D',
    'The Mystery Egg',
    'Butterfly Letter Chaos',
    'The Genius Gate',
    "Maya's Lost Hat",
    'Letter Island Mix-Up',
    'Word Hero Graduation',
  ],
  kingdom_nouns: [
    'Roles Without Names',
    'The Castle That Became a Tower',
    'The Crown Soup',
    'The Soup Shield',
    'The Wizard in the Kitchen',
    'The Dragon Who Became a Goblin',
    'The Royal Noun Trial',
  ],
}

const questSummaries: Record<string, string> = {
  q01: 'Start with a short conversation, visit a world station, and bring the learning reward back to the giver.',
  q02: 'Follow the next clue and complete a focused vocabulary activity.',
  q03: 'Combine a spelling challenge and a speaking challenge to move the story forward.',
  q04: 'Practice a larger set of words through a guided sequence of small games.',
  q05: 'Use the world map to connect a new word with a meaningful sentence.',
  q06: 'Finish the line with a review challenge that checks the full vocabulary set.',
  q07: 'Open the next gate by proving mastery of the previous lesson.',
  q08: 'Recover the missing letter and return it to the person who needs it.',
  q09: 'Untangle a mixed-up word island and collect the next letter.',
  q10: 'Complete the graduation activity and earn the final badge.',
}

function questId(lineKey: string, index: number): string {
  return `demo-quest-${lineKey}-${index + 1}`
}

function stepId(lineKey: string, index: number, suffix: string): string {
  return `demo-step-${lineKey}-${index + 1}-${suffix}`
}

function createQuestlines(): Questline[] {
  return questlineSpecs.map((spec) => ({
    id: spec.id,
    key: spec.key,
    display_name: spec.display_name,
    theme: spec.theme,
    default_giver_external_id: spec.giver,
    status: 'draft',
    level_min: 1,
    level_max: spec.count,
    source_path: `questlines/${spec.key}/_index.yaml`,
    source_metadata: { demo: true },
  }))
}

function createQuests(): Quest[] {
  return questlineSpecs.flatMap((spec) =>
    questNames[spec.key].map((name, index) => ({
      id: questId(spec.key, index),
      questline_id: spec.id,
      key: `q${String(index + 1).padStart(2, '0')}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
      position: index,
      name,
      level_required: spec.key === 'kingdom_nouns' && index === 0 ? 50 : index + 1,
      giver_external_id: spec.giver,
      summary: questSummaries[`q${String(index + 1).padStart(2, '0')}`] ?? questSummaries.q01,
      status: 'complete',
      source_path: `questlines/${spec.key}/q${String(index + 1).padStart(2, '0')}.yaml`,
      source_metadata: { demo: true },
    })),
  )
}

function createSteps(quests: Quest[]): QuestStep[] {
  return quests.flatMap((quest) => {
    const lineKey = quest.questline_id.replace('demo-ql-', '')
    const position = quest.position
    const stepType = position % 3 === 0 ? 'talk_to_npc' : position % 3 === 1 ? 'reach_location' : 'play_minigame'
    const payload =
      stepType === 'talk_to_npc'
        ? { npc_id: quest.giver_external_id ?? 'teacher_maya', dialogue_id: `${lineKey}_${quest.key}_intro` }
        : stepType === 'reach_location'
          ? { location_id: position % 2 === 0 ? 'KingdomGate' : 'The Oathstone Bridge' }
          : {
              minigame_id: position % 2 === 0 ? 'letter_ordering' : 'word_matching',
              world_object_id: 'Lost_Chest5_Silver_Fountain_Court',
              difficulty: Math.min(7, position + 1),
              success_required: true,
            }

    return [
      {
        id: stepId(lineKey, position, 'intro'),
        quest_id: quest.id,
        key: `${quest.key}_step_01`,
        position: 0,
        step_type: stepType,
        payload,
        source_metadata: { demo: true, source_position: 0 },
      },
      {
        id: stepId(lineKey, position, 'finish'),
        quest_id: quest.id,
        key: `${quest.key}_step_02`,
        position: 1,
        step_type: position % 2 === 0 ? 'deliver_item' : 'return_to_npc',
        payload:
          position % 2 === 0
            ? {
                npc_id: quest.giver_external_id ?? 'teacher_maya',
                item_id: 'gem',
                amount: 1,
                dialogue_id: `${lineKey}_${quest.key}_complete`,
              }
            : {
                npc_id: quest.giver_external_id ?? 'teacher_maya',
                dialogue_id: `${lineKey}_${quest.key}_complete`,
              },
        source_metadata: { demo: true, source_position: 1 },
      },
    ]
  })
}

function createPrerequisites(quests: Quest[]): QuestPrerequisite[] {
  return quests
    .filter((quest) => quest.position > 0)
    .map((quest) => {
      const previous = quests.find(
        (candidate) =>
          candidate.questline_id === quest.questline_id && candidate.position === quest.position - 1,
      )
      return previous
        ? { quest_id: quest.id, prerequisite_quest_id: previous.id }
        : null
    })
    .filter((edge): edge is QuestPrerequisite => edge !== null)
}

function createRewards(quests: Quest[], steps: QuestStep[]): QuestReward[] {
  const questRewards = quests.map((quest, index) => ({
    id: `demo-reward-quest-${quest.id}`,
    scope: 'quest' as const,
    quest_id: quest.id,
    step_id: null,
    reward_type: index % 4 === 3 ? ('item' as const) : ('xp' as const),
    xp_amount: index % 4 === 3 ? null : 50 + quest.position * 25,
    item_external_id: index % 4 === 3 ? 'coin' : null,
    amount: index % 4 === 3 ? 5 : null,
    source_metadata: { demo: true },
  }))
  const stepRewards = steps
    .filter((step) => step.step_type === 'play_minigame' || step.step_type === 'deliver_item')
    .map((step) => ({
      id: `demo-reward-step-${step.id}`,
      scope: 'step' as const,
      quest_id: null,
      step_id: step.id,
      reward_type: 'item' as const,
      xp_amount: null,
      item_external_id: 'gem',
      amount: 1,
      source_metadata: { demo: true },
    }))
  return [...questRewards, ...stepRewards]
}

const catalogSeed: Array<[CatalogEntry['kind'], string, string, string]> = [
  ['area', 'KingdomGate', 'Kingdom Gate', 'The main gate into the learning kingdom.'],
  ['area', 'The Oathstone Bridge', 'The Oathstone Bridge', 'A bridge where spelling quests begin.'],
  ['area', 'SilverFountainCourt', 'Silver Fountain Court', 'A bright court near the letter island.'],
  ['npc', 'teacher_maya', 'Teacher Maya', 'The friendly guide for the English Kingdom.'],
  ['npc', 'Blacksmith', 'Blacksmith Will', 'A noisy but kind forge master.'],
  ['interactable', 'Lost_Chest5_Silver_Fountain_Court', 'Lost Chest 5', 'A world station for a short activity.'],
  ['interactable', 'WoodenCart3_The_Oath_stone_Bridge', 'Wooden Cart 3', 'A cart with a learning challenge.'],
  ['item', 'gem', 'Gem', 'A small reward for completing a speaking activity.'],
  ['item', 'ancient_rune', 'Ancient Rune', 'A collectible for adjective and noun mastery.'],
  ['minigame', 'letter_ordering', 'Letter Ordering', 'Arrange letters into a word.'],
  ['minigame', 'word_matching', 'Word Matching', 'Match a word to the missing letter.'],
]

function createCatalog(): CatalogEntry[] {
  return catalogSeed.map(([kind, external_id, name, description], index) => ({
    id: index + 1,
    kind,
    external_id,
    name,
    description,
    status: 'live_used',
    image_path: null,
    metadata: { demo: true },
  }))
}

function createStepTypes(): StepTypeDefinition[] {
  return [
    {
      id: 'talk_to_npc',
      unity_objective: 'TalkToNpc',
      description: 'Start a conversation with a character.',
      fields: [
        { name: 'npc_id', type: 'string', required: true, ref: 'npcs' },
        { name: 'dialogue_id', type: 'string', required: true, ref: 'dialogues' },
      ],
      metadata: {},
    },
    {
      id: 'return_to_npc',
      unity_objective: 'TalkToNpc',
      description: 'Return to a character after completing the activity.',
      fields: [
        { name: 'npc_id', type: 'string', required: true, ref: 'npcs' },
        { name: 'dialogue_id', type: 'string', required: true, ref: 'dialogues' },
      ],
      metadata: {},
    },
    {
      id: 'reach_location',
      unity_objective: 'EnterArea',
      description: 'Enter a world location.',
      fields: [
        { name: 'location_id', type: 'string', required: true, ref: 'areas' },
        { name: 'radius', type: 'number', required: false, default: 5 },
      ],
      metadata: {},
    },
    {
      id: 'play_minigame',
      unity_objective: 'CompleteMiniGame',
      description: 'Complete a learning activity at a world station.',
      fields: [
        { name: 'minigame_id', type: 'string', required: true, ref: 'minigames' },
        { name: 'world_object_id', type: 'string', required: true, ref: 'interactables' },
        { name: 'difficulty', type: 'integer', required: true, min: 1, max: 10 },
        { name: 'success_required', type: 'boolean', required: false, default: true },
      ],
      metadata: {},
    },
    {
      id: 'collect_item',
      unity_objective: 'Collect',
      description: 'Collect an item from the world.',
      fields: [
        { name: 'item_id', type: 'string', required: true, ref: 'items' },
        { name: 'amount', type: 'integer', required: true, min: 1 },
      ],
      metadata: {},
    },
    {
      id: 'deliver_item',
      unity_objective: 'DeliverItem',
      description: 'Bring an item to a character.',
      fields: [
        { name: 'npc_id', type: 'string', required: true, ref: 'npcs' },
        { name: 'item_id', type: 'string', required: true, ref: 'items' },
        { name: 'amount', type: 'integer', required: true, min: 1 },
        { name: 'dialogue_id', type: 'string', required: false, ref: 'dialogues' },
      ],
      metadata: {},
    },
  ]
}

function createDialogues(): Dialogue[] {
  return [
    {
      id: 'demo-dialogue-intro',
      key: 'adjective_knight_oak_log_request',
      speaker_external_id: 'teacher_maya',
      source_path: '_registry/dialogues/adjective_crown.yaml',
      source_metadata: { demo: true },
    },
    {
      id: 'demo-dialogue-complete',
      key: 'adjective_knight_oak_log_delivered',
      speaker_external_id: 'teacher_maya',
      source_path: '_registry/dialogues/adjective_crown.yaml',
      source_metadata: { demo: true },
    },
  ]
}

function createDialogueLines(dialogues: Dialogue[]): DialogueLine[] {
  return dialogues.flatMap((dialogue, index) => [
    {
      id: `${dialogue.id}-line-0`,
      dialogue_id: dialogue.id,
      locale: 'he',
      line_order: 0,
      content:
        index === 0
          ? 'השלימו את האתגר וחזרו אליי עם הפריט.'
          : 'כל הכבוד! הפריט התקבל והמשימה מתקדמת.',
      line_format: 'plain_text',
    },
  ])
}

function createMinigames(): MinigameInstance[] {
  return [
    {
      id: 'demo-minigame-long',
      key: 'q01_bridge_too_short_s2',
      locale: 'he',
      instruction: 'סדרו את האותיות של LONG',
      tasks: ['סדרו l, o, n, g', 'צרו long — ארוך'],
      target: 'long',
      variant: 'word_spelling',
      success: 'LONG נכתב נכון; Oak Log נוסף לתיק',
      source_path: '_registry/minigame_instances/adjective_crown.yaml',
      source_metadata: { demo: true },
    },
  ]
}

export function createDemoData(): EditorData {
  const questlines = createQuestlines()
  const quests = createQuests()
  const steps = createSteps(quests)
  const dialogues = createDialogues()
  return {
    questlines,
    quests,
    steps,
    prerequisites: createPrerequisites(quests),
    rewards: createRewards(quests, steps),
    catalog: createCatalog(),
    stepTypes: createStepTypes(),
    dialogues,
    dialogueLines: createDialogueLines(dialogues),
    minigames: createMinigames(),
    revisions: [],
  }
}
