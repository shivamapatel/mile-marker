import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForToken, getStravaEnv } from '@/lib/strava'
import { syncStravaActivities } from '@/lib/strava-sync'

// Receives the redirect back from Strava, exchanges the code for tokens, and
// stores them against the signed-in Supabase user. Tokens never reach the client.
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const scope = url.searchParams.get('scope')
  const oauthError = url.searchParams.get('error') // e.g. 'access_denied'
  const storedState = request.cookies.get('strava_oauth_state')?.value

  // Redirect home with an error reason and clear the one-time state cookie.
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${origin}/?strava_error=${reason}`)
    res.cookies.set('strava_oauth_state', '', { path: '/', maxAge: 0 })
    return res
  }

  if (oauthError) return fail('denied')
  if (!code || !state || !storedState || state !== storedState) return fail('state')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('auth')

  let env
  try {
    env = getStravaEnv()
  } catch {
    return fail('config')
  }

  let token
  try {
    token = await exchangeCodeForToken(env, code)
  } catch {
    return fail('exchange')
  }

  const athleteId = token.athlete?.id
  if (!athleteId) return fail('exchange')

  // Store tokens via a SECURITY DEFINER function scoped to auth.uid(). The
  // strava_connections table is deny-by-default under RLS, so token columns are
  // never readable/writable by client code — only this server route, using the
  // user's own session (no service role key), can persist them.
  const { error: storeError } = await supabase.rpc('store_strava_connection', {
    p_strava_athlete_id: athleteId,
    p_access_token: token.access_token,
    p_refresh_token: token.refresh_token,
    p_expires_at: token.expires_at,
    p_scope: scope,
  })

  if (storeError) return fail('store')

  // Best-effort first sync so activities are already present when the user lands
  // on the dashboard. A failure here shouldn't block a successful connection —
  // the user can retry via the manual "Sync Strava" button.
  try {
    await syncStravaActivities(user.id, supabase)
  } catch (e) {
    console.error('Initial Strava sync after connect failed:', e)
  }

  const res = NextResponse.redirect(`${origin}/?strava=connected`)
  res.cookies.set('strava_oauth_state', '', { path: '/', maxAge: 0 })
  return res
}
