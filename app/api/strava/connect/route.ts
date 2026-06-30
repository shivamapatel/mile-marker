import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAuthorizeUrl, getStravaEnv } from '@/lib/strava'

// Starts the Strava OAuth flow for the currently signed-in Supabase user.
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin

  // A Supabase session is required so we can attach the connection to a user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  let env
  try {
    env = getStravaEnv()
  } catch {
    return NextResponse.redirect(`${origin}/?strava_error=config`)
  }

  // CSRF protection: random state echoed back by Strava and verified in callback.
  const state = crypto.randomUUID()
  const response = NextResponse.redirect(buildAuthorizeUrl(env, state))
  response.cookies.set('strava_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  })
  return response
}
