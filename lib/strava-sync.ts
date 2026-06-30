import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getStravaEnv,
  refreshAccessToken,
  fetchRecentActivities,
  type StravaActivity,
} from '@/lib/strava'

// Refresh the access token if it expires within this window.
const EXPIRY_BUFFER_SECONDS = 300 // 5 minutes

type ConnectionTokens = {
  access_token: string
  refresh_token: string
  expires_at: number
}

export type SyncResult = { synced: number }

/**
 * Server-only. Resolves a Strava athlete id to the owning Mile Marker user_id
 * by looking it up in strava_connections via the admin (service role) client.
 *
 * Used by the webhook handler, which is called by Strava's servers and has no
 * logged-in Supabase session, so it cannot rely on RLS. The athlete id from a
 * webhook payload is treated purely as an UNTRUSTED lookup key — if no row
 * matches, this returns null and the caller writes nothing.
 */
export async function getUserIdByStravaAthleteId(
  athleteId: number
): Promise<string | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('strava_connections')
    .select('user_id')
    .eq('strava_athlete_id', athleteId)
    .maybeSingle<{ user_id: string }>()

  if (error) {
    console.error(`[strava webhook] athlete lookup failed for ${athleteId}: ${error.message}`)
    return null
  }

  return data?.user_id ?? null
}

/**
 * Server-only. Pulls the user's recent Strava activities and upserts them.
 *
 * - Token read/refresh uses the admin (service role) client, because
 *   `strava_connections` is deny-by-default under RLS and the server must read
 *   tokens back out without exposing them to the browser.
 * - Activity upserts use `db` (the user-scoped client) so RLS stays enforced.
 *
 * Returns only a safe count — never tokens.
 */
export async function syncStravaActivities(
  userId: string,
  db: SupabaseClient
): Promise<SyncResult> {
  const admin = createAdminClient()

  const { data: conn, error: connError } = await admin
    .from('strava_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle<ConnectionTokens>()

  if (connError) throw new Error(`Failed to read Strava connection: ${connError.message}`)
  if (!conn) throw new Error('No Strava connection for this user')

  const env = getStravaEnv()
  let accessToken = conn.access_token
  const nowSeconds = Math.floor(Date.now() / 1000)

  // Refresh if expired or close to expiring, then persist the new tokens.
  if (conn.expires_at <= nowSeconds + EXPIRY_BUFFER_SECONDS) {
    const refreshed = await refreshAccessToken(env, conn.refresh_token)
    accessToken = refreshed.access_token

    const { error: updateError } = await admin
      .from('strava_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw new Error(`Failed to update refreshed tokens: ${updateError.message}`)
  }

  const activities = await fetchRecentActivities(accessToken)

  // Mile Marker is a post-run journal, so we only persist runs and skip other
  // Strava activities (rides, swims, workouts, etc.).
  const runs = activities.filter((a: StravaActivity) => {
    const type = a.sport_type ?? a.type
    return type === 'Run' || type === 'TrailRun' || type === 'VirtualRun'
  })
  if (runs.length === 0) return { synced: 0 }

  const rows = runs.map((a: StravaActivity) => ({
    id: a.id,
    user_id: userId,
    name: a.name,
    sport_type: a.sport_type ?? a.type ?? null,
    start_date: a.start_date,
    start_date_local: a.start_date_local ?? null,
    timezone: a.timezone ?? null,
    distance: a.distance ?? 0,
    moving_time: a.moving_time ?? 0,
    elevation_gain: a.total_elevation_gain ?? 0,
    summary_polyline: a.map?.summary_polyline ?? null,
    strava_url: `https://www.strava.com/activities/${a.id}`,
    updated_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await db
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,id' })

  if (upsertError) throw new Error(`Failed to upsert activities: ${upsertError.message}`)

  return { synced: rows.length }
}
