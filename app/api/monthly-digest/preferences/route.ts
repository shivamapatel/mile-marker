import { createClient } from '@/lib/supabase/server'
import { generateMonthlyDigestForUser } from '@/lib/monthly-digest/generate'
import { getPreviousMonthPeriod } from '@/lib/monthly-digest/period'

export const maxDuration = 300

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { optedIn?: unknown } | null
  if (typeof body?.optedIn !== 'boolean') {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('monthly_digest_preferences')
    .upsert({
      user_id: user.id,
      opted_in: body.optedIn,
      opted_in_at: body.optedIn ? now : null,
      updated_at: now,
    }, { onConflict: 'user_id' })

  if (error) return Response.json({ error: 'save_failed' }, { status: 500 })

  if (!body.optedIn) return Response.json({ optedIn: false })

  try {
    const period = getPreviousMonthPeriod()
    const generation = await generateMonthlyDigestForUser(user.id, period)

    return Response.json({
      optedIn: true,
      period: period.start,
      generation,
    })
  } catch (generationError) {
    console.error('Immediate monthly digest generation failed', generationError)

    // Opt-in still succeeded. The normal monthly job can retry a failed digest,
    // so do not tell the client that its preference change was lost.
    return Response.json({
      optedIn: true,
      period: getPreviousMonthPeriod().start,
      generation: { status: 'failed' },
    })
  }
}
