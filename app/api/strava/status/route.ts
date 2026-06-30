import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Reports whether the signed-in user has a Strava connection.
// Reads only safe, non-secret fields via a SECURITY DEFINER function — token
// columns are never exposed to client code.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 })
  }

  const { data } = await supabase.rpc('get_strava_connection_status')
  const row = Array.isArray(data) ? data[0] : null

  return NextResponse.json({
    connected: !!row,
    stravaAthleteId: row?.strava_athlete_id ?? null,
    scope: row?.scope ?? null,
    expiresAt: row?.expires_at ?? null,
  })
}
