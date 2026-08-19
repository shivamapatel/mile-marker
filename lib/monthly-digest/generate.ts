import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { generateDigestWithOpenRouter } from './openrouter'
import { MONTHLY_DIGEST_PROMPT_VERSION } from './prompt'
import type { MonthPeriod } from './period'
import type { DigestReflection, EnergyDistribution } from './types'

const MINIMUM_REFLECTIONS = 5

type DbReflection = {
  id: string
  captured_at: string
  current_state: string | null
  energy: string | null
  mind_topic: string | null
  note: string | null
}

export type DigestGenerationResult =
  | { status: 'completed'; digestId: string }
  | { status: 'skipped'; reason: 'not_opted_in' | 'ineligible' | 'already_completed' }

export async function generateMonthlyDigestForUser(
  userId: string,
  period: MonthPeriod
): Promise<DigestGenerationResult> {
  const admin = createAdminClient()

  const [{ data: preference, error: preferenceError }, { data: existing, error: existingError }] =
    await Promise.all([
      admin
        .from('monthly_digest_preferences')
        .select('opted_in')
        .eq('user_id', userId)
        .maybeSingle<{ opted_in: boolean }>(),
      admin
        .from('monthly_digests')
        .select('id, generation_status')
        .eq('user_id', userId)
        .eq('period_start', period.start)
        .maybeSingle<{ id: string; generation_status: string }>(),
    ])

  if (preferenceError) throw new Error(`Failed to read digest preference: ${preferenceError.message}`)
  if (existingError) throw new Error(`Failed to read existing digest: ${existingError.message}`)
  if (!preference?.opted_in) return { status: 'skipped', reason: 'not_opted_in' }
  if (existing?.generation_status === 'completed') {
    return { status: 'skipped', reason: 'already_completed' }
  }

  const { data, error: reflectionsError } = await admin
    .from('reflections')
    .select('id, captured_at, current_state, energy, mind_topic, note')
    .eq('user_id', userId)
    .gte('captured_at', `${period.start}T00:00:00.000Z`)
    .lt('captured_at', `${period.end}T00:00:00.000Z`)
    .order('captured_at', { ascending: true })

  if (reflectionsError) {
    throw new Error(`Failed to read reflections: ${reflectionsError.message}`)
  }

  const reflections = (data as DbReflection[]).flatMap(toDigestReflection)
  if (reflections.length < MINIMUM_REFLECTIONS) {
    return { status: 'skipped', reason: 'ineligible' }
  }

  const requestedModel = process.env.OPENROUTER_MODEL
  if (!requestedModel) throw new Error('Missing OPENROUTER_MODEL')

  const energyDistribution = countEnergy(reflections)
  let digestId = existing?.id ?? null

  if (digestId) {
    const { error } = await admin
      .from('monthly_digests')
      .update({
        reflection_count: reflections.length,
        energy_distribution: energyDistribution,
        requested_model: requestedModel,
        prompt_version: MONTHLY_DIGEST_PROMPT_VERSION,
        generation_status: 'pending',
        error_message: null,
      })
      .eq('id', digestId)
      .eq('user_id', userId)
    if (error) throw new Error(`Failed to prepare digest retry: ${error.message}`)
  } else {
    const { data: pending, error } = await admin
      .from('monthly_digests')
      .insert({
        user_id: userId,
        period_start: period.start,
        period_end: period.end,
        reflection_count: reflections.length,
        energy_distribution: energyDistribution,
        requested_model: requestedModel,
        prompt_version: MONTHLY_DIGEST_PROMPT_VERSION,
        generation_status: 'pending',
      })
      .select('id')
      .single<{ id: string }>()
    if (error) throw new Error(`Failed to create pending digest: ${error.message}`)
    digestId = pending.id
  }

  try {
    const generated = await generateDigestWithOpenRouter({
      monthLabel: period.label,
      reflections,
      energyDistribution,
    })

    const { error } = await admin
      .from('monthly_digests')
      .update({
        themes: generated.themes,
        reflection_question: generated.reflectionQuestion,
        requested_model: generated.requestedModel,
        model: generated.model,
        provider: generated.provider,
        openrouter_generation_id: generated.generationId,
        prompt_tokens: generated.promptTokens,
        completion_tokens: generated.completionTokens,
        total_tokens: generated.totalTokens,
        cost: generated.cost,
        generation_status: 'completed',
        error_message: null,
        generated_at: new Date().toISOString(),
      })
      .eq('id', digestId)
      .eq('user_id', userId)

    if (error) throw new Error(`Failed to save completed digest: ${error.message}`)
    return { status: 'completed', digestId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation error'
    await admin
      .from('monthly_digests')
      .update({ generation_status: 'failed', error_message: message.slice(0, 1000) })
      .eq('id', digestId)
      .eq('user_id', userId)
    throw error
  }
}

function toDigestReflection(row: DbReflection): DigestReflection[] {
  if (row.energy !== 'Drained' && row.energy !== 'Steady' && row.energy !== 'Charged') {
    return []
  }

  return [{
    id: row.id,
    capturedAt: row.captured_at,
    currentState: row.current_state ?? '',
    energy: row.energy,
    mindTopic: row.mind_topic ?? '',
    note: row.note ?? '',
  }]
}

function countEnergy(reflections: DigestReflection[]): EnergyDistribution {
  const result: EnergyDistribution = { Drained: 0, Steady: 0, Charged: 0 }
  for (const reflection of reflections) result[reflection.energy] += 1
  return result
}
