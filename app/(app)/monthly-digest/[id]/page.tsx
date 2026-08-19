import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMonthLabel } from '@/lib/monthly-digest/period'
import type { DigestTheme, EnergyDistribution } from '@/lib/monthly-digest/types'

export default async function ArchivedDigestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('monthly_digests')
    .select('period_start, reflection_count, energy_distribution, themes, reflection_question')
    .eq('id', id)
    .eq('generation_status', 'completed')
    .maybeSingle<{
      period_start: string
      reflection_count: number
      energy_distribution: EnergyDistribution
      themes: DigestTheme[]
      reflection_question: string
    }>()

  if (!data) notFound()

  const evidenceIds = [...new Set(data.themes.flatMap(theme => theme.supportingReflectionIds))]
  const { data: evidence } = evidenceIds.length > 0
    ? await supabase
        .from('reflections')
        .select('id, activity_id')
        .in('id', evidenceIds)
    : { data: [] as Array<{ id: string; activity_id: string | number }> }
  const activityByReflectionId = new Map(
    (evidence ?? []).map(row => [row.id, String(row.activity_id)])
  )

  return (
    <div className="space-y-6">
      <Link href="/monthly-digest" className="text-sm text-mocha hover:text-espresso transition-colors">
        ← Monthly Digest
      </Link>
      <header>
        <p className="text-xs uppercase tracking-widest text-mocha">Monthly Digest</p>
        <h1 className="text-2xl font-semibold text-espresso font-serif mt-2">
          {formatMonthLabel(data.period_start)}
        </h1>
      </header>

      <section className="space-y-3">
        {data.themes.map(theme => (
          <div key={theme.title} className="bg-ivory rounded-2xl border border-sand p-5">
            <h2 className="font-semibold text-espresso">{theme.title}</h2>
            <p className="text-sm text-espresso leading-relaxed font-serif mt-2">{theme.description}</p>
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
      </section>

      <section className="bg-sienna-light rounded-2xl border border-sienna p-5">
        <p className="text-xs uppercase tracking-widest text-mocha mb-2">For the Road Ahead</p>
        <p className="text-lg text-espresso leading-relaxed font-serif italic">{data.reflection_question}</p>
      </section>
    </div>
  )
}
