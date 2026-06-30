'use client'
import { useState, useEffect, useCallback } from 'react'
import { Activity } from './types'
import { MOCK_ACTIVITIES } from './mockData'
import { createClient } from './supabase/client'

// Shape returned by the activities table (snake_case, synced from Strava).
interface DbActivity {
  id: number
  name: string
  sport_type: string | null
  start_date: string
  distance: number
  moving_time: number
  elevation_gain: number
  strava_url: string
}

function fromDb(row: DbActivity): Activity {
  return {
    id: String(row.id),
    name: row.name,
    sportType: row.sport_type ?? '',
    startDate: row.start_date,
    distance: row.distance,
    movingTime: row.moving_time,
    elevationGain: row.elevation_gain,
    stravaUrl: row.strava_url,
  }
}

const hasSupabaseEnv = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function useActivities() {
  // Without Supabase env, fall back to mock data so the UI still renders.
  const [activities, setActivities] = useState<Activity[]>(
    hasSupabaseEnv() ? [] : MOCK_ACTIVITIES
  )
  const [loading, setLoading] = useState(hasSupabaseEnv())
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    if (!hasSupabaseEnv()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('start_date', { ascending: false })
    if (!error && data) {
      setActivities((data as DbActivity[]).map(fromDb))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Triggers a server-side sync, then reloads from the DB. Tokens stay server-side.
  const sync = useCallback(async (): Promise<{ ok: boolean; synced?: number }> => {
    setSyncing(true)
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.ok) {
        await load()
        return { ok: true, synced: body.synced }
      }
      return { ok: false }
    } catch {
      return { ok: false }
    } finally {
      setSyncing(false)
    }
  }, [load])

  return { activities, loading, syncing, sync, reload: load }
}
