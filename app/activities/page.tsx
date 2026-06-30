'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useReflections } from '@/lib/useReflections'
import { useActivities } from '@/lib/useActivities'
import { formatDistance, formatDuration, formatShortDate } from '@/lib/utils'

export default function ActivitiesPage() {
  const { reflections } = useReflections()
  const { activities, loading, syncing, sync } = useActivities()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  async function handleSync() {
    setSyncMsg(null)
    const result = await sync()
    if (result.ok) {
      setSyncMsg(
        result.synced === 0
          ? 'No new activities found.'
          : `Synced ${result.synced} activit${result.synced === 1 ? 'y' : 'ies'}.`
      )
    } else {
      setSyncMsg('Sync failed. Make sure Strava is connected and try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-espresso">Activities</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="shrink-0 text-sm font-medium text-sienna-dark hover:text-sienna transition-colors disabled:opacity-60"
        >
          {syncing ? 'Syncing…' : 'Sync Strava'}
        </button>
      </div>

      {syncMsg && <p className="text-xs text-mocha">{syncMsg}</p>}

      {loading && activities.length === 0 ? (
        <p className="text-sm text-mocha">Loading activities…</p>
      ) : activities.length === 0 ? (
        <div className="bg-ivory rounded-2xl border border-sand p-5 text-center">
          <p className="text-sm text-mocha">
            No activities yet. Connect Strava or tap Sync to bring in your runs.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(activity => {
            const captured = !!reflections[activity.id]
            return (
              <Link
                key={activity.id}
                href={`/activities/${activity.id}`}
                className="block bg-ivory rounded-xl border border-sand px-4 py-4 hover:border-sienna transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-espresso truncate">{activity.name}</p>
                    <p className="text-xs text-mocha mt-0.5">{formatShortDate(activity.startDate)}</p>
                  </div>
                  <div className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 mt-0.5 border ${
                    captured
                      ? 'bg-ivory text-mocha border-sand'
                      : 'bg-sienna-light text-sienna border-sienna'
                  }`}>
                    {captured ? 'Captured' : 'Not yet'}
                  </div>
                </div>

                <div className="flex gap-4 mt-3 text-xs text-mocha">
                  <span>{formatDistance(activity.distance)}</span>
                  <span>{formatDuration(activity.movingTime)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
