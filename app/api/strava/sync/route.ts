import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncStravaActivities } from '@/lib/strava-sync'

// Manual "Sync Strava" endpoint. Auth is enforced via the user's Supabase
// session; token read/refresh happens server-side inside syncStravaActivities.
// Returns only a safe count — never tokens.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const result = await syncStravaActivities(user.id, supabase)
    return NextResponse.json({ ok: true, synced: result.synced })
  } catch (e) {
    console.error('Strava sync failed:', e)
    return NextResponse.json({ ok: false, error: 'sync_failed' }, { status: 500 })
  }
}
