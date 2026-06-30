'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useReflections } from '@/lib/useReflections'
import { useActivities } from '@/lib/useActivities'
import { formatDistance, formatDuration, formatPace, formatShortDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const STRAVA_ERROR_TEXT: Record<string, string> = {
  config: 'Strava isn’t configured yet. Add the Strava env vars and try again.',
  denied: 'Strava connection was cancelled.',
  state: 'Sign-in session expired. Please try connecting again.',
  auth: 'You need to be signed in to connect Strava.',
  exchange: 'Couldn’t complete the Strava handshake. Please try again.',
  store: 'Connected to Strava but couldn’t save it. Please try again.',
}

type StravaStatus = { loading: boolean; connected: boolean; athleteId: number | null }

export default function Dashboard() {
  const router = useRouter()
  const { reflections } = useReflections()
  const { activities } = useActivities()

  const [strava, setStrava] = useState<StravaStatus>({
    loading: true,
    connected: false,
    athleteId: null,
  })
  const [stravaMsg, setStravaMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/strava/status')
      .then(r => r.json())
      .then(d =>
        setStrava({
          loading: false,
          connected: !!d.connected,
          athleteId: d.stravaAthleteId ?? null,
        })
      )
      .catch(() => setStrava({ loading: false, connected: false, athleteId: null }))

    const params = new URLSearchParams(window.location.search)
    if (params.get('strava') === 'connected') {
      setStravaMsg('Strava connected.')
    } else {
      const err = params.get('strava_error')
      if (err) setStravaMsg(STRAVA_ERROR_TEXT[err] ?? 'Something went wrong connecting Strava.')
    }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const uncaptured = activities.filter(a => !reflections[a.id])
  const latestUncaptured = uncaptured[0] ?? null

  const recentCaptured = activities
    .filter(a => reflections[a.id])
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-espresso font-serif">Mile Marker</h1>
        <button
          onClick={handleSignOut}
          className="text-xs text-mocha hover:text-espresso transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Strava connection */}
      <section>
        <p className="text-xs uppercase tracking-widest text-mocha mb-3">Strava</p>
        <div className="bg-ivory rounded-2xl border border-sand p-5 flex items-center justify-between gap-4">
          {strava.loading ? (
            <p className="text-sm text-mocha">Checking connection…</p>
          ) : strava.connected ? (
            <div>
              <p className="text-sm font-medium text-espresso">Connected to Strava</p>
              <p className="text-xs text-mocha mt-0.5">Athlete #{strava.athleteId}</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-espresso">Not connected</p>
                <p className="text-xs text-mocha mt-0.5">Link Strava to bring in your runs.</p>
              </div>
              <a
                href="/api/strava/connect"
                className="shrink-0 bg-sienna-dark text-ivory text-sm font-medium rounded-xl px-4 py-2 hover:bg-sienna transition-colors"
              >
                Connect Strava
              </a>
            </>
          )}
        </div>
        {stravaMsg && <p className="text-xs text-mocha mt-2">{stravaMsg}</p>}
      </section>

      {/* Uncaptured run prompt */}
      {latestUncaptured ? (
        <section>
          <p className="text-xs uppercase tracking-widest text-mocha mb-3">Still fresh</p>
          <div className="bg-ivory rounded-2xl border border-sand p-5 space-y-4">
            <div>
              <p className="text-xs text-mocha mb-0.5">
                {formatShortDate(latestUncaptured.startDate)}
              </p>
              <h2 className="text-lg font-semibold text-espresso">{latestUncaptured.name}</h2>
            </div>

            <div className="flex gap-5">
              <div>
                <p className="text-base font-medium text-espresso">
                  {formatDistance(latestUncaptured.distance)}
                </p>
                <p className="text-xs text-mocha">Distance</p>
              </div>
              <div>
                <p className="text-base font-medium text-espresso">
                  {formatDuration(latestUncaptured.movingTime)}
                </p>
                <p className="text-xs text-mocha">Time</p>
              </div>
              <div>
                <p className="text-base font-medium text-espresso">
                  {formatPace(latestUncaptured.distance, latestUncaptured.movingTime)}
                </p>
                <p className="text-xs text-mocha">Pace</p>
              </div>
            </div>

            <Link
              href={`/activities/${latestUncaptured.id}/reflect`}
              className="block w-full text-center bg-sienna-dark text-ivory text-sm font-medium rounded-xl py-3 hover:bg-sienna transition-colors"
            >
              Capture reflection
            </Link>
          </div>

          {uncaptured.length > 1 && (
            <p className="text-xs text-mocha mt-2 text-center">
              {uncaptured.length - 1} other run{uncaptured.length - 1 > 1 ? 's' : ''} without a reflection
            </p>
          )}
        </section>
      ) : (
        <div className="bg-ivory rounded-2xl border border-sand p-5 text-center">
          <p className="text-sm text-mocha">All caught up — no uncaptured runs.</p>
        </div>
      )}

      {/* Recent reflections */}
      {recentCaptured.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-widest text-mocha mb-3">Field notes</p>
          <div className="space-y-2">
            {recentCaptured.map(activity => {
              const reflection = reflections[activity.id]
              return (
                <Link
                  key={activity.id}
                  href={`/activities/${activity.id}`}
                  className="block bg-ivory rounded-xl border border-sand px-4 py-3 hover:border-sienna transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-espresso truncate">{activity.name}</p>
                    <p className="text-xs text-mocha mt-0.5">
                      {formatShortDate(activity.startDate)}
                      {reflection.currentState && (
                        <> · <span className="italic font-serif">{reflection.currentState}</span></>
                      )}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
