import { createClient } from '@supabase/supabase-js'

// ⚠️ SERVER-ONLY. Never import this into a client component.
//
// This client uses the Supabase SERVICE ROLE key, which bypasses RLS. It exists
// for narrow, server-only purposes:
//   1. Reading and updating Strava tokens in `strava_connections` during
//      sync/token-refresh, where the server must read tokens back out (the
//      `authenticated` role is shared with the browser, so a token-returning RLS
//      path would expose tokens to client code).
//   2. The Strava webhook handler, which is called by Strava (no logged-in
//      Supabase session) and so cannot use a user-scoped client. There it also
//      drives the `activities` upsert — safe because the user_id is resolved
//      from our own strava_connections lookup, never from the request payload.
//
// Everywhere a real user session exists (manual sync, reflections), use the
// normal user-scoped client so RLS stays enforced. The service role key must
// never be sent to the browser (no NEXT_PUBLIC_ prefix, no client imports).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
