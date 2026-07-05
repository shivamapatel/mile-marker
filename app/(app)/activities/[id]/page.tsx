'use client'
import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useReflections } from '@/lib/useReflections'
import { useActivities } from '@/lib/useActivities'
import { formatDistance, formatDuration, formatPace, formatDate } from '@/lib/utils'

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { reflections } = useReflections()
  const { activities, loading } = useActivities()

  const activity = activities.find(a => a.id === id)

  if (loading && !activity) {
    return <p className="text-sm text-mocha">Loading…</p>
  }
  if (!activity) notFound()

  const reflection = reflections[id] ?? null

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link href="/activities" className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M5 12l7-7M5 12l7 7" />
        </svg>
        Activities
      </Link>

      {/* Run header */}
      <div>
        <p className="text-xs text-mocha mb-1">{formatDate(activity.startDate)}</p>
        <h1 className="text-2xl font-semibold text-espresso">{activity.name}</h1>
      </div>

      {/* Stats */}
      <div className="bg-ivory rounded-2xl border border-sand p-5">
        <div className="flex gap-6">
          <div>
            <p className="text-lg font-semibold text-espresso">{formatDistance(activity.distance)}</p>
            <p className="text-xs text-mocha mt-0.5">Distance</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-espresso">{formatDuration(activity.movingTime)}</p>
            <p className="text-xs text-mocha mt-0.5">Time</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-espresso">{formatPace(activity.distance, activity.movingTime)}</p>
            <p className="text-xs text-mocha mt-0.5">Pace</p>
          </div>
        </div>
        {activity.elevationGain > 0 && (
          <p className="text-xs text-mocha mt-3 pt-3 border-t border-sand">
            {Math.round(activity.elevationGain * 3.281)} ft elevation
          </p>
        )}
      </div>

      {/* Reflection */}
      {reflection ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-mocha">Your reflection</p>
            <Link
              href={`/activities/${activity.id}/reflect`}
              className="text-xs text-mocha hover:text-espresso transition-colors underline underline-offset-2"
            >
              Edit
            </Link>
          </div>

          <div className="bg-ivory rounded-2xl border border-sand p-5 space-y-5">
            {reflection.currentState && (
              <div>
                <p className="text-xs text-mocha mb-1">Post run feeling</p>
                <p className="text-espresso italic break-words font-serif text-lg leading-snug">{reflection.currentState}</p>
              </div>
            )}

            {reflection.energy && (
              <div className="flex items-center gap-3">
                <p className="text-xs text-mocha">Energy</p>
                <span className="text-xs font-medium px-2.5 py-1 bg-sienna-light text-sienna-dark border border-sienna rounded-full">
                  {reflection.energy}
                </span>
              </div>
            )}

            {reflection.mindTopic && (
              <div>
                <p className="text-xs text-mocha mb-1">On your mind</p>
                <p className="text-sm text-espresso break-words">{reflection.mindTopic}</p>
              </div>
            )}

            {reflection.note && (
              <div>
                <p className="text-xs text-mocha mb-1">Notes</p>
                <p className="text-base text-espresso leading-relaxed break-words font-serif">{reflection.note}</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-mocha">No reflection captured yet.</p>
          <Link
            href={`/activities/${activity.id}/reflect`}
            className="block w-full text-center bg-sienna-dark text-ivory text-sm font-medium rounded-xl py-3 hover:bg-sienna transition-colors"
          >
            Capture reflection
          </Link>
        </div>
      )}
    </div>
  )
}
