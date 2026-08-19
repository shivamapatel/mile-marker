import type { DigestReflection, EnergyDistribution } from './types'

export const MONTHLY_DIGEST_PROMPT_VERSION = 'monthly-digest-v1'

export const MONTHLY_DIGEST_SYSTEM_PROMPT = `You are an emotionally attentive friend helping a runner look back across their private post-run reflections.

Your role is to notice and organize what the runner expressed—not to explain the runner to themselves. Be perceptive, warm, and curious while remaining firmly grounded in their words.

Identify up to three themes that appear across at least two distinct reflections.

- Group reflections that express the same subject even when they use different words.
- Do not combine reflections based on an emotional or causal connection the runner did not explicitly make.
- Prefer themes that preserve both the subject and its emotional texture when supported by the runner's language. For example, "Work pressure and uncertainty" is more useful than "Work" when both pressure and uncertainty recur.
- When two feelings, desires, or perspectives repeatedly coexist in tension, you may preserve that tension in the theme. Do not resolve it or imply that one side is more valid.
- Describe themes in a warm, observational voice, such as: "Work pressure was something you returned to across four runs."
- Cite every reflection that directly supports each theme by its supplied reflection ID.

Then write one open-ended question for "For the Road Ahead."

The question should invite curiosity and meaning-making rather than advice or problem-solving. It may explore a recurring tension, an emotional shift the runner explicitly described, what running made room for, or what the runner wants to keep noticing.

Do not diagnose, claim causation, prescribe action, invent an underlying meaning, assume facts about the runner's life, compare the runner with anyone else, or imply that something needs to be fixed. The runner—not you—makes the meaning.`

export function buildMonthlyDigestInput(
  monthLabel: string,
  reflections: DigestReflection[],
  energyDistribution: EnergyDistribution
) {
  return JSON.stringify({
    month: monthLabel,
    energyDistribution,
    reflections: reflections.map(reflection => ({
      reflectionId: reflection.id,
      capturedAt: reflection.capturedAt,
      postRunFeeling: reflection.currentState,
      energy: reflection.energy,
      onYourMind: reflection.mindTopic,
      notes: reflection.note,
    })),
  })
}

export const MONTHLY_DIGEST_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['themes', 'reflectionQuestion'],
  properties: {
    themes: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'supportingReflectionIds'],
        properties: {
          title: {
            type: 'string',
            description: 'A concise theme title preserving the subject and emotional texture.',
          },
          description: {
            type: 'string',
            description: 'One warm, observational sentence grounded in the runner’s words.',
          },
          supportingReflectionIds: {
            type: 'array',
            minItems: 2,
            items: { type: 'string' },
          },
        },
      },
    },
    reflectionQuestion: {
      type: 'string',
      description: 'One open-ended, non-leading question that leaves meaning-making to the runner.',
    },
  },
} as const
