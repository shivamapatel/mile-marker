import Link from 'next/link'
import DigestConsentCard from '@/components/DigestConsentCard'
import { createClient } from '@/lib/supabase/server'
import { formatMonthLabel } from '@/lib/monthly-digest/period'
import type { DigestTheme, EnergyDistribution } from '@/lib/monthly-digest/types'

type DbDigest = {
  id: string
  period_start: string
  reflection_count: number
  energy_distribution: EnergyDistribution
  themes: DigestTheme[]
  reflection_question: string | null
  generation_status: 'pending' | 'completed' | 'failed'
  generated_at: string | null
}

const MINIMUM_REFLECTIONS = 5

export default async function MonthlyDigestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const currentPeriodStart = new Date()
  currentPeriodStart.setUTCDate(1)
  currentPeriodStart.setUTCHours(0, 0, 0, 0)

  const [preferenceResult, digestsResult, reflectionCountResult] = await Promise.all([
    supabase
      .from('monthly_digest_preferences')
      .select('opted_in')
      .eq('user_id', user!.id)
      .maybeSingle<{ opted_in: boolean }>(),
    supabase
      .from('monthly_digests')
      .select('id, period_start, reflection_count, energy_distribution, themes, reflection_question, generation_status, generated_at')
      .eq('user_id', user!.id)
      .order('period_start', { ascending: false }),
    supabase
      .from('reflections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .gte('captured_at', currentPeriodStart.toISOString()),
  ])

  const optedIn = preferenceResult.data?.opted_in ?? false
  const digests = (digestsResult.data ?? []) as DbDigest[]
  const completedDigests = digests.filter(digest => digest.generation_status === 'completed')
  const latest = completedDigests[0] ?? null
  const latestEvidenceIds = latest
    ? [...new Set(latest.themes.flatMap(theme => theme.supportingReflectionIds))]
    : []
  const evidenceResult = latestEvidenceIds.length > 0
    ? await supabase
        .from('reflections')
        .select('id, activity_id')
        .in('id', latestEvidenceIds)
    : { data: [] as Array<{ id: string; activity_id: string | number }> }
  const activityByReflectionId = new Map(
    (evidenceResult.data ?? []).map(row => [row.id, String(row.activity_id)])
  )
  const currentReflectionCount = reflectionCountResult.count ?? 0
  const remaining = Math.max(0, MINIMUM_REFLECTIONS - currentReflectionCount)

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs uppercase tracking-widest text-mocha mb-2">Monthly Digest</p>
        <h1 className="text-2xl font-semibold font-serif text-espresso">A look back at your running</h1>
      </header>

      <DigestConsentCard initialOptedIn={optedIn} />

      {latest ? <Digest digest={latest} activityByReflectionId={activityByReflectionId} /> : (
        <section className="bg-ivory rounded-2xl border border-sand p-5 text-center">
          <p className="text-sm font-medium text-espresso">Your first digest is taking shape.</p>
          <p className="text-sm text-mocha mt-1 leading-relaxed">
            {remaining > 0
              ? `Reflect on ${remaining} more run${remaining === 1 ? '' : 's'} this month to become eligible.`
              : 'You’ve reflected enough this month. Your digest will be created after the month ends.'}
          </p>
        </section>
      )}

      {completedDigests.length > 1 ? (
        <section>
          <p className="text-xs uppercase tracking-widest text-mocha mb-3">Past digests</p>
          <div className="space-y-2">
            {completedDigests.slice(1).map(digest => (
              <Link
                key={digest.id}
                href={`/monthly-digest/${digest.id}`}
                className="block bg-ivory rounded-xl border border-sand px-4 py-3 text-sm font-medium text-espresso hover:border-sienna transition-colors"
              >
                {formatMonthLabel(digest.period_start)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Digest({
  digest,
  activityByReflectionId,
}: {
  digest: DbDigest
  activityByReflectionId: Map<string, string>
}) {
  const energyEntries = Object.entries(digest.energy_distribution) as Array<
    [keyof EnergyDistribution, number]
  >

  return (
    <article className="space-y-6">
      <div>
        <p className="text-xs text-mocha">Your reflection for</p>
        <h2 className="text-xl font-semibold text-espresso font-serif">
          {formatMonthLabel(digest.period_start)}
        </h2>
      </div>

      <section>
        <p className="text-xs uppercase tracking-widest text-mocha mb-3">Recurring Themes</p>
        <div className="space-y-3">
          {digest.themes.map(theme => (
            <div key={theme.title} className="bg-ivory rounded-2xl border border-sand p-5">
              <h3 className="text-base font-semibold text-espresso">{theme.title}</h3>
              <p className="text-sm text-espresso mt-2 leading-relaxed font-serif">
                {theme.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {theme.supportingReflectionIds.map((reflectionId, index) => {
                  const activityId = activityByReflectionId.get(reflectionId)
                  return activityId ? (
                    <Link
                      key={reflectionId}
                      href={`/activities/${activityId}`}
                      className="text-xs text-sienna-dark underline underline-offset-2"
                    >
                      Reflection {index + 1}
                    </Link>
                  ) : null
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-mocha mb-3">Energy This Month</p>
        <div className="bg-ivory rounded-2xl border border-sand p-5 space-y-3">
          {energyEntries.map(([energy, count]) => {
            const percent = digest.reflection_count === 0 ? 0 : Math.round((count / digest.reflection_count) * 100)
            return (
              <div key={energy}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-espresso">{energy}</span>
                  <span className="text-mocha">{count} · {percent}%</span>
                </div>
                <div className="h-2 bg-cream rounded-full overflow-hidden">
                  <div className="h-full bg-sienna rounded-full" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {digest.reflection_question ? (
        <section>
          <p className="text-xs uppercase tracking-widest text-mocha mb-3">For the Road Ahead</p>
          <blockquote className="bg-sienna-light rounded-2xl border border-sienna p-5 text-lg text-espresso leading-relaxed font-serif italic">
            {digest.reflection_question}
          </blockquote>
        </section>
      ) : null}
    </article>
  )
}
