// Server-only Strava OAuth helpers.
// IMPORTANT: never import this module into client components — it reads secrets
// (STRAVA_CLIENT_SECRET) and exchanges tokens that must stay server-side.

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities'

// Minimal scopes: read profile + read all activities (for later sync milestones).
export const STRAVA_SCOPES = 'read,activity:read_all'

export type StravaEnv = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Reads and validates the required Strava env vars.
 * Throws if any are missing so callers can surface a config error.
 */
export function getStravaEnv(): StravaEnv {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const redirectUri = process.env.STRAVA_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing Strava env vars. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REDIRECT_URI.'
    )
  }

  return { clientId, clientSecret, redirectUri }
}

/** Builds the Strava authorization URL the user is redirected to. */
export function buildAuthorizeUrl(env: StravaEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: STRAVA_SCOPES,
    state,
  })
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`
}

export type StravaTokenResponse = {
  access_token: string
  refresh_token: string
  expires_at: number // unix epoch seconds
  athlete?: { id: number }
}

/** Exchanges a one-time authorization code for Strava tokens. */
export async function exchangeCodeForToken(
  env: StravaEnv,
  code: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Strava token exchange failed (${res.status}): ${detail}`)
  }

  return (await res.json()) as StravaTokenResponse
}

/** Refreshes an expired/expiring access token using the stored refresh token. */
export async function refreshAccessToken(
  env: StravaEnv,
  refreshToken: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Strava token refresh failed (${res.status}): ${detail}`)
  }

  return (await res.json()) as StravaTokenResponse
}

// Subset of Strava's summary-activity shape that we persist.
export type StravaActivity = {
  id: number
  name: string
  sport_type?: string
  type?: string
  start_date: string
  start_date_local?: string
  timezone?: string
  distance: number
  moving_time: number
  total_elevation_gain: number
  map?: { summary_polyline?: string | null }
}

/** Fetches the most recent activities for the authenticated athlete. */
export async function fetchRecentActivities(
  accessToken: string,
  perPage = 30
): Promise<StravaActivity[]> {
  const res = await fetch(`${STRAVA_ACTIVITIES_URL}?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Strava activities fetch failed (${res.status}): ${detail}`)
  }

  return (await res.json()) as StravaActivity[]
}
