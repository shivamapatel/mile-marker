import { after, NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendRunNotification } from '@/lib/push'
import {
  getUserIdByStravaAthleteId,
  syncStravaActivities,
} from '@/lib/strava-sync'

// Strava push subscription webhook.
//
// Two responsibilities:
//  1. GET  — the one-time subscription handshake. Strava calls this when we
//            register the subscription and expects us to echo back the
//            `hub.challenge` it sent, but ONLY if `hub.verify_token` matches the
//            secret we configured. This proves we own the endpoint.
//  2. POST — live event notifications (a run was created/updated/deleted). The
//            payload is just a pointer (owner_id + object_id), never the run
//            data itself, so we use it purely as a trigger to pull fresh data.
//
// This route is reached by Strava's servers with NO logged-in user, so it is
// excluded from the auth guard in proxy.ts.

// GET: subscription verification handshake.
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN

  // Only echo the challenge when the verify token matches our secret. This stops
  // anyone else from completing a subscription against our endpoint.
  if (mode === 'subscribe' && token && token === expected && challenge) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  console.warn('[strava webhook] verification failed (bad mode or verify token)')
  return NextResponse.json({ error: 'verification_failed' }, { status: 403 })
}

type StravaWebhookEvent = {
  object_type?: string // 'activity' | 'athlete'
  object_id?: number // the activity id (for activity events)
  aspect_type?: string // 'create' | 'update' | 'delete'
  owner_id?: number // the athlete id — our lookup key into strava_connections
  subscription_id?: number
}

// POST: a real event from Strava. Strava expects a 200 within ~2 seconds and
// will retry on failure, so we keep the work minimal and idempotent (the upsert
// makes retries safe). We always respond { received: true } so Strava considers
// the event delivered, even on the no-op paths below.
export async function POST(request: NextRequest) {
  let event: StravaWebhookEvent
  try {
    event = await request.json()
  } catch {
    // Malformed body — acknowledge so Strava stops retrying, but do nothing.
    console.warn('[strava webhook] received unparseable POST body')
    return NextResponse.json({ received: true })
  }

  // We only act on new/updated activities. Ignore athlete events, deletes, and
  // anything else.
  const isActivity = event.object_type === 'activity'
  const isCreateOrUpdate =
    event.aspect_type === 'create' || event.aspect_type === 'update'

  if (!isActivity || !isCreateOrUpdate || !event.owner_id) {
    console.log(
      `[strava webhook] ignoring event object_type=${event.object_type} aspect_type=${event.aspect_type}`
    )
    return NextResponse.json({ received: true })
  }

  // Strava expects a fast acknowledgement. Resolve the verified user, sync the
  // run, and deliver any notification after the response has been sent.
  after(async () => {
    // Map the untrusted athlete id to a connection stored by Mile Marker. We
    // never accept a Mile Marker user id from the webhook payload.
    const userId = await getUserIdByStravaAthleteId(event.owner_id!)
    if (!userId) {
      console.warn(
        `[strava webhook] no connection for athlete ${event.owner_id} — ignoring`
      )
      return
    }

    console.log(
      `[strava webhook] activity ${event.object_id} for athlete ${event.owner_id} → user ${userId}; syncing`
    )

    try {
      const result = await syncStravaActivities(userId, createAdminClient())
      console.log(
        `[strava webhook] sync ok for user ${userId}: ${result.synced} activit${
          result.synced === 1 ? 'y' : 'ies'
        } upserted`
      )

      // Updates still refresh the activity data, but only a newly posted run
      // should create a post-run reminder.
      if (event.aspect_type === 'create' && event.object_id) {
        const notification = await sendRunNotification(userId, String(event.object_id))
        console.log(
          `[strava webhook] push result for activity ${event.object_id}: ${JSON.stringify(notification)}`
        )
      }
    } catch (error) {
      console.error(`[strava webhook] background processing failed for user ${userId}:`, error)
    }
  })

  return NextResponse.json({ received: true })
}
