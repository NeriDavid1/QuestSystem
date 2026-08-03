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
    display_name: 'כתר התארים',
    theme: 'תארים באנגלית בסיסית דרך השלמה, דיבור ומשחקי התאמה',
    giver: 'teacher_maya',
    count: 6,
  },
  {
    id: 'demo-ql-blacksmith',
    key: 'blacksmith_will',
    display_name: 'ויל הנפח — המכה הראשונה',
    theme: 'הרפתקאות מצחיקות בנפחייה; פתיחת Slash עם מילים קלות לילדים',
    giver: 'Blacksmith',
    count: 3,
  },
  {
    id: 'demo-ql-maya',
    key: 'english_kingdom_maya',
    display_name: 'ממלכת האנגלית — נתיב האותיות',
    theme: 'אותיות באנגלית A–J (רמות 1–10)',
    giver: 'teacher_maya',
    count: 10,
  },
  {
    id: 'demo-ql-nouns',
    key: 'kingdom_nouns',
    display_name: 'ספר שמות העצם של הממלכה',
    theme: 'שמות עצם בממלכה דרך בלבולים קומיים — איות ודיבור',
    giver: 'teacher_maya',
    count: 7,
  },
] as const

const questNames: Record<string, Array<{ key: string; name: string }>> = {
  adjective_crown: [
    { key: 'bridge_too_short', name: 'הגשר קצר מדי' },
    { key: 'whispering_stone', name: 'האבן הלוחשת' },
    { key: 'big_and_small', name: 'מילים גדולות וקטנות' },
    { key: 'twelve_adjectives', name: 'שנים־עשר תארים בסיסיים' },
    { key: 'low_to_high', name: 'מנמוך לגבוה' },
    { key: 'adjective_challenge', name: 'אתגר התארים' },
  ],
  blacksmith_will: [
    { key: 'runaway_hammer', name: 'הפטיש הבורח' },
    { key: 'snoring_anvil', name: 'הסדן הנוחר' },
    { key: 'first_real_slash', name: 'המכה האמיתית הראשונה' },
  ],
  english_kingdom_maya: [
    { key: 'runaway_a', name: 'ה־A הבורחת' },
    { key: 'bee_bandit', name: 'שודד הדבורים' },
    { key: 'cat_on_c', name: 'חתול על ה־C' },
    { key: 'dog_ate_d', name: 'הכלב אכל את ה־D' },
    { key: 'mystery_egg', name: 'ביצת המסתורין' },
    { key: 'butterfly_chaos', name: 'כאוס אותיות הפרפר' },
    { key: 'genius_gate', name: 'שער הגאון' },
    { key: 'mayas_hat', name: 'הכובע האבוד של מאיה' },
    { key: 'letter_island', name: 'אי האותיות המבולבל' },
    { key: 'word_hero', name: 'סיום גיבור המילים' },
  ],
  kingdom_nouns: [
    { key: 'roles_without_names', name: 'תפקידים בלי שמות' },
    { key: 'castle_to_tower', name: 'הטירה שהפכה למגדל' },
    { key: 'crown_soup', name: 'מרק הכתר' },
    { key: 'soup_shield', name: 'מגן המרק' },
    { key: 'wizard_kitchen', name: 'הקוסם במטבח' },
    { key: 'dragon_goblin', name: 'הדרקון שהפך לגובלין' },
    { key: 'royal_noun_trial', name: 'משפט שמות העצם המלכותי' },
  ],
}

const questSummaries: Record<string, string> = {
  q01: 'התחילו בשיחה קצרה, בקרו בתחנה בעולם, והחזירו את פרס הלמידה לנותן המשימה.',
  q02: 'עקבו אחרי הרמז הבא והשלימו פעילות אוצר מילים ממוקדת.',
  q03: 'שילבו אתגר איות ואתגר דיבור כדי לקדם את הסיפור.',
  q04: 'תרגלו קבוצת מילים גדולה יותר דרך רצף מודרך של משחקים קטנים.',
  q05: 'השתמשו במפת העולם כדי לחבר מילה חדשה למשפט משמעותי.',
  q06: 'סיימו את הקו באתגר חזרה שבודק את כל אוצר המילים.',
  q07: 'פתחו את השער הבא בהוכחת שליטה בשיעור הקודם.',
  q08: 'שחזרו את האות החסרה והחזירו אותה למי שזקוק לה.',
  q09: 'פתרו אי מילים מבולבל ואספו את האות הבאה.',
  q10: 'השלימו את פעילות הסיום וזכו בתג הסופי.',
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
    questNames[spec.key].map((quest, index) => ({
      id: questId(spec.key, index),
      questline_id: spec.id,
      key: `q${String(index + 1).padStart(2, '0')}_${quest.key}`,
      position: index,
      name: quest.name,
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
            instance_id: `${quest.key}_minigame`,
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

const catalogSeed: Array<[CatalogEntry['kind'], string, string, string, string | null]> = [
  ['area', 'KingdomGate', 'Kingdom Gate', 'The main gate into the learning kingdom.', 'images/areas/KingdomGate.png'],
  ['area', 'The Oathstone Bridge', 'The Oathstone Bridge', 'A bridge where spelling quests begin.', null],
  ['area', 'SilverFountainCourt', 'Silver Fountain Court', 'A bright court near the letter island.', 'images/areas/SilverFountainCourt.png'],
  ['npc', 'teacher_maya', 'Teacher Maya', 'The friendly guide for the English Kingdom.', 'images/npcs/teacher_maya.png'],
  ['npc', 'Blacksmith', 'Blacksmith Will', 'A noisy but kind forge master.', 'images/npcs/Blacksmith.png'],
  ['interactable', 'Lost_Chest5_Silver_Fountain_Court', 'Lost Chest 5', 'A world station for a short activity.', 'images/interactables/Lost_Chest5_Silver_Fountain_Court.png'],
  ['interactable', 'WoodenCart3_The_Oath_stone_Bridge', 'Wooden Cart 3', 'A cart with a learning challenge.', 'images/interactables/WoodenCart3_The_Oath_stone_Bridge.png'],
  ['item', 'gem', 'Gem', 'A small reward for completing a speaking activity.', 'images/items/gem.png'],
  ['item', 'coin', 'Coin', 'A currency reward for mastery quests.', null],
  ['item', 'ancient_rune', 'Ancient Rune', 'A collectible for adjective and noun mastery.', 'images/items/ancient_rune.png'],
  ['minigame', 'letter_ordering', 'Letter Ordering', 'Arrange scrambled letter tiles to spell a target English word.', 'images/minigames/letter_ordering.png'],
  ['minigame', 'word_ordering', 'Word Ordering', 'Arrange scrambled English word tiles into a complete sentence.', 'images/minigames/word_ordering.png'],
  ['minigame', 'word_matching', 'Word Matching', 'Match English words/fragments (includes opposite pairing / Line Match).', 'images/minigames/word_matching.png'],
  ['minigame', 'letter_drawing', 'Letter Drawing', 'Trace or draw an English letter on screen.', null],
  ['minigame', 'speak_aloud', 'Speak Aloud', 'Say an English word or phrase; speech recognition validates it.', 'images/minigames/speak_aloud.png'],
]

// Mirrors _registry/minigames.yaml so demo mode renders the same per-game
// parameter schema (content_fields) that connected mode reads from the catalog.
const minigameCatalogMetadata: Record<string, Record<string, unknown>> = {
  letter_ordering: {
    unity_config: 'LetterOrderingQuestConfigSO',
    unity_content: 'LetterOrderingDataSO',
    category: 'spelling',
    english_focus: 'Spelling, letter recognition',
    difficulty_range: [1, 6],
    content_fields: ['prompt', 'targetWord', 'extraDistractorCount', 'customDistractors', 'wordRevealDatabase'],
    variants: ['word_spelling'],
    typical_stations: ['chest', 'cart', 'tombstone', 'exam_table'],
  },
  word_ordering: {
    unity_config: 'WordOrderingQuestConfigSO',
    unity_content: 'WordOrderingDataSO',
    category: 'grammar',
    english_focus: 'Sentence structure, adjective placement',
    difficulty_range: [2, 10],
    content_fields: ['prompt', 'englishWordsInOrder', 'preFilledIndices', 'distractorWords', 'wordRevealDatabase'],
    variants: ['sentence_building'],
    typical_stations: ['chest', 'cart', 'exam_table'],
  },
  word_matching: {
    unity_config: 'LineMatchQuestConfigSO',
    unity_content: 'LetterConnectionLevelConfigSO',
    category: 'vocabulary',
    english_focus: 'Vocabulary, missing-letter recognition, opposites',
    difficulty_range: [1, 8],
    content_fields: ['letters', 'wordTasks'],
    variants: ['word_to_image', 'letter_to_gap', 'opposite_pairing'],
    typical_stations: ['chest', 'exam_table'],
  },
  letter_drawing: {
    unity_config: 'DrawingQuestConfigSO',
    unity_content: 'LetterPathSO',
    category: 'motor_skills',
    english_focus: 'Letter formation, stroke order',
    difficulty_range: [1, 4],
    content_fields: ['letter', 'strokes', 'previewImage', 'clip'],
    variants: ['trace_guided', 'free_draw'],
    typical_stations: ['shop', 'chest', 'cart'],
  },
  speak_aloud: {
    unity_config: 'SpeakAloudQuestConfigSO',
    unity_content: 'SpeakAloudDataSO',
    category: 'pronunciation',
    english_focus: 'Pronunciation, spoken production',
    difficulty_range: [4, 10],
    content_fields: ['prompt', 'targetWords', 'targetPhrase', 'silenceTimeoutSeconds', 'allowFuzzyMatch', 'referenceClip', 'wordRevealDatabase'],
    variants: ['single_word', 'short_phrase'],
    typical_stations: ['fire_camp', 'cart', 'chest'],
    requires_microphone: true,
  },
}

function createCatalog(): CatalogEntry[] {
  return catalogSeed.map(([kind, external_id, name, description, image_path], index) => ({
    id: index + 1,
    kind,
    external_id,
    name,
    description,
    status: 'live_used',
    image_path,
    metadata: kind === 'minigame'
      ? { ...(minigameCatalogMetadata[external_id] ?? {}), demo: true }
      : { demo: true },
  }))
}

function createStepTypes(): StepTypeDefinition[] {
  // Must mirror supabase/migrations/20260803100000_quest_editor.sql seed exactly,
  // so demo mode and connected mode render identical step schemas.
  return [
    {
      id: 'talk_to_npc',
      unity_objective: 'TalkToNpc',
      description: 'Player initiates dialogue with an NPC',
      fields: [
        { name: 'npc_id', type: 'string', required: true, ref: 'npcs.yaml' },
        { name: 'dialogue_id', type: 'string', required: true, ref: '_registry/dialogues/' },
        { name: 'optional_flag', type: 'string', required: false, description: 'Sets a story flag after dialogue' },
      ],
      metadata: {},
    },
    {
      id: 'return_to_npc',
      unity_objective: 'TalkToNpc',
      description: 'Player returns to an NPC to turn in or continue',
      fields: [
        { name: 'npc_id', type: 'string', required: true, ref: 'npcs.yaml' },
        { name: 'dialogue_id', type: 'string', required: true, ref: '_registry/dialogues/' },
      ],
      metadata: {},
    },
    {
      id: 'play_minigame',
      unity_objective: 'CompleteMiniGame',
      description: 'Start and complete a minigame on a world station',
      fields: [
        { name: 'minigame_id', type: 'string', required: true, ref: 'minigames.yaml' },
        { name: 'world_object_id', type: 'string', required: true, ref: 'interactables.yaml' },
        { name: 'difficulty', type: 'integer', required: true, min: 1, max: 10 },
        { name: 'success_required', type: 'boolean', required: false, default: true },
        { name: 'instance_id', type: 'string', required: false, ref: '_registry/minigame_instances/' },
        { name: 'reward_item_id', type: 'string', required: false, ref: 'items.yaml' },
        { name: 'reward_amount', type: 'integer', required: false, min: 1, default: 1 },
      ],
      metadata: {},
    },
    {
      id: 'collect_item',
      unity_objective: 'Collect',
      description: 'Gather items from the world or drops',
      fields: [
        { name: 'item_id', type: 'string', required: true, ref: 'items.yaml' },
        { name: 'amount', type: 'integer', required: true, min: 1 },
      ],
      metadata: {},
    },
    {
      id: 'deliver_item',
      unity_objective: 'DeliverItem',
      description: 'Bring items to an NPC',
      fields: [
        { name: 'npc_id', type: 'string', required: true, ref: 'npcs.yaml' },
        { name: 'item_id', type: 'string', required: true, ref: 'items.yaml' },
        { name: 'amount', type: 'integer', required: true, min: 1 },
        { name: 'dialogue_id', type: 'string', required: false, ref: '_registry/dialogues/' },
      ],
      metadata: {},
    },
    {
      id: 'reach_location',
      unity_objective: 'EnterArea',
      description: 'Player must enter a trigger zone',
      fields: [
        { name: 'location_id', type: 'string', required: true, ref: 'areas.yaml' },
        { name: 'radius', type: 'number', required: false, default: 5 },
      ],
      metadata: {},
    },
  ]
}

function createDialogues(steps: QuestStep[]): Dialogue[] {
  const used = new Map<string, string>()
  for (const step of steps) {
    const dialogueKey = step.payload.dialogue_id
    if (typeof dialogueKey !== 'string' || !dialogueKey) continue
    if (used.has(dialogueKey)) continue
    used.set(dialogueKey, typeof step.payload.npc_id === 'string' ? step.payload.npc_id : 'teacher_maya')
  }
  return [...used.entries()].map(([key, speaker]) => ({
    id: `demo-dialogue-${key.replaceAll('_', '-')}`,
    key,
    speaker_external_id: speaker,
    source_path: `_registry/dialogues/${key.split('_')[0]}.yaml`,
    source_metadata: { demo: true },
  }))
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

function createMinigames(steps: QuestStep[]): MinigameInstance[] {
  const instances = new Map<string, MinigameInstance>()
  let index = 0
  for (const step of steps) {
    if (step.step_type !== 'play_minigame') continue
    const key = typeof step.payload.instance_id === 'string' && step.payload.instance_id
      ? step.payload.instance_id
      : `demo_minigame_${index + 1}`
    if (instances.has(key)) continue
    const minigameId = typeof step.payload.minigame_id === 'string' ? step.payload.minigame_id : 'letter_ordering'
    const spelling = minigameId === 'letter_ordering'
    index += 1
    const target = spelling ? 'long' : 'המילה המלאה'
    const params: Record<string, unknown> = spelling
      ? {
          prompt: 'סדרו את האותיות בסדר הנכון כדי להשלים את המילה',
          targetWord: target,
          extraDistractorCount: 2,
          customDistractors: [],
          wordRevealDatabase: '',
        }
      : {
          letters: [
            { id: 'd', value: 'd' },
            { id: 'o', value: 'o' },
            { id: 'g', value: 'g' },
          ],
          wordTasks: [{ id: 'task_1', image: '', fullWord: 'dog', missingIndices: [0] }],
        }
    instances.set(key, {
      id: `demo-minigame-${index}`,
      key,
      locale: 'he',
      instruction: spelling
        ? 'סדרו את האותיות בסדר הנכון כדי להשלים את המילה.'
        : 'התאימו את המילה לאות החסרה לפני שהשעון נגמר.',
      tasks: spelling
        ? ['סדרו את האותיות l, o, n, g', 'קראו את המילה שנוצרה']
        : ['מצאו את האות החסרה', 'התאימו את המילה למשמעות שלה'],
      target,
      variant: spelling ? 'word_spelling' : 'letter_to_gap',
      success: spelling
        ? 'המילה נכתבה נכון; פרס נוסף לתיק.'
        : 'התאמה מושלמת! המשימה ממשיכה קדימה.',
      params,
      source_path: `_registry/minigame_instances/${key.split('_')[0]}.yaml`,
      source_metadata: { demo: true },
    })
  }
  return [...instances.values()]
}

export function createDemoData(): EditorData {
  const questlines = createQuestlines()
  const quests = createQuests()
  const steps = createSteps(quests)
  const dialogues = createDialogues(steps)
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
    minigames: createMinigames(steps),
    revisions: [],
  }
}
