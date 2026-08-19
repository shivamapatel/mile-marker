import { createAdminClient } from '@/lib/supabase/admin'
import { generateMonthlyDigestForUser } from '@/lib/monthly-digest/generate'
import { getPreviousMonthPeriod } from '@/lib/monthly-digest/period'

export const maxDuration = 300

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('monthly_digest_preferences')
    .select('user_id')
    .eq('opted_in', true)

  if (error) return Response.json({ error: 'preference_lookup_failed' }, { status: 500 })

  const period = getPreviousMonthPeriod()
  const results = await Promise.allSettled(
    (data as Array<{ user_id: string }>).map(({ user_id }) =>
      generateMonthlyDigestForUser(user_id, period)
    )
  )

  return Response.json({
    period: period.start,
    eligibleUsersChecked: results.length,
    completed: results.filter(
      result => result.status === 'fulfilled' && result.value.status === 'completed'
    ).length,
    failed: results.filter(result => result.status === 'rejected').length,
  })
}
