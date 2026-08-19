import 'server-only'

import {
  MONTHLY_DIGEST_RESPONSE_SCHEMA,
  MONTHLY_DIGEST_SYSTEM_PROMPT,
  buildMonthlyDigestInput,
} from './prompt'
import type { DigestReflection, DigestTheme, EnergyDistribution } from './types'

type OpenRouterResponse = {
  id?: string
  model?: string
  provider?: string
  choices?: Array<{ message?: { content?: string | null } }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    cost?: number
  }
  error?: { message?: string; code?: number | string; metadata?: unknown }
}

export type GeneratedDigest = {
  themes: DigestTheme[]
  reflectionQuestion: string
  generationId: string | null
  requestedModel: string
  model: string
  provider: string | null
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  cost: number | null
}

export async function generateDigestWithOpenRouter(args: {
  monthLabel: string
  reflections: DigestReflection[]
  energyDistribution: EnergyDistribution
}): Promise<GeneratedDigest> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const requestedModel = process.env.OPENROUTER_MODEL

  if (!apiKey || !requestedModel) {
    throw new Error('Missing OPENROUTER_API_KEY or OPENROUTER_MODEL')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mile-marker-v1.vercel.app',
      'X-OpenRouter-Title': 'Mile Marker',
    },
    body: JSON.stringify({
      model: requestedModel,
      temperature: 0.7,
      messages: [
        { role: 'system', content: MONTHLY_DIGEST_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildMonthlyDigestInput(
            args.monthLabel,
            args.reflections,
            args.energyDistribution
          ),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'mile_marker_monthly_digest',
          strict: true,
          schema: MONTHLY_DIGEST_RESPONSE_SCHEMA,
        },
      },
      provider: {
        require_parameters: true,
        data_collection: 'deny',
        zdr: true,
      },
    }),
  })

  const body = (await response.json()) as OpenRouterResponse
  if (!response.ok) {
    const details = body.error
      ? JSON.stringify({
          message: body.error.message,
          code: body.error.code,
          metadata: body.error.metadata,
        })
      : `OpenRouter request failed (${response.status})`
    throw new Error(details)
  }

  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter returned an empty response')

  const parsed = JSON.parse(content) as unknown
  const output = validateDigestOutput(parsed, args.reflections)

  return {
    ...output,
    generationId: body.id ?? null,
    requestedModel,
    model: body.model ?? requestedModel,
    provider: body.provider ?? null,
    promptTokens: body.usage?.prompt_tokens ?? null,
    completionTokens: body.usage?.completion_tokens ?? null,
    totalTokens: body.usage?.total_tokens ?? null,
    cost: body.usage?.cost ?? null,
  }
}

function validateDigestOutput(
  value: unknown,
  reflections: DigestReflection[]
): Pick<GeneratedDigest, 'themes' | 'reflectionQuestion'> {
  if (!isRecord(value) || !Array.isArray(value.themes)) {
    throw new Error('OpenRouter returned an invalid digest shape')
  }

  const validIds = new Set(reflections.map(reflection => reflection.id))
  const themes = value.themes.map((theme, index) => {
    if (
      !isRecord(theme) ||
      typeof theme.title !== 'string' ||
      typeof theme.description !== 'string' ||
      !Array.isArray(theme.supportingReflectionIds)
    ) {
      throw new Error(`Theme ${index + 1} is invalid`)
    }

    const ids = [...new Set(theme.supportingReflectionIds)]
    if (
      ids.length < 2 ||
      ids.some(id => typeof id !== 'string' || !validIds.has(id))
    ) {
      throw new Error(`Theme ${index + 1} contains unsupported reflection evidence`)
    }

    return {
      title: theme.title.trim(),
      description: theme.description.trim(),
      supportingReflectionIds: ids as string[],
    }
  })

  if (themes.length > 3 || typeof value.reflectionQuestion !== 'string') {
    throw new Error('OpenRouter returned an invalid digest response')
  }

  const reflectionQuestion = value.reflectionQuestion.trim()
  if (!reflectionQuestion || themes.some(theme => !theme.title || !theme.description)) {
    throw new Error('OpenRouter returned empty digest content')
  }

  return { themes, reflectionQuestion }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
