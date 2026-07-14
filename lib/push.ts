import webpush, { type PushSubscription } from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

type DbPushSubscription = {
  id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
}

let configured = false

function configureWebPush() {
  if (configured) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      'Missing Web Push env vars. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.'
    )
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

function toWebPushSubscription(row: DbPushSubscription): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh_key,
      auth: row.auth_key,
    },
  }
}

function statusCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return null
  const value = (error as { statusCode?: unknown }).statusCode
  return typeof value === 'number' ? value : null
}

async function deliverToSubscriptions(
  subscriptions: DbPushSubscription[],
  payload: { title: string; body: string; url: string }
) {
  configureWebPush()
  const admin = createAdminClient()
  let delivered = 0

  await Promise.all(
    subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification(
          toWebPushSubscription(subscription),
          JSON.stringify(payload)
        )
        delivered += 1
      } catch (error) {
        const code = statusCode(error)

        if (code === 404 || code === 410) {
          const { error: deleteError } = await admin
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)

          if (deleteError) {
            console.error('[push] failed to remove expired subscription:', deleteError)
          }
          return
        }

        console.error(`[push] delivery failed${code ? ` (${code})` : ''}:`, error)
      }
    })
  )

  return delivered
}

export async function sendRunNotification(userId: string, activityId: string) {
  const admin = createAdminClient()

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('id,endpoint,p256dh_key,auth_key')
    .eq('user_id', userId)

  if (subscriptionsError) throw subscriptionsError
  if (!subscriptions?.length) return { delivered: 0, skipped: 'no_subscriptions' as const }

  // Claim this user/activity pair before sending. Strava retries webhook events,
  // so the unique key acts as an idempotency lock and prevents duplicate pushes.
  const { error: claimError } = await admin.from('notification_deliveries').insert({
    user_id: userId,
    activity_id: activityId,
  })

  if (claimError?.code === '23505') {
    return { delivered: 0, skipped: 'already_delivered' as const }
  }
  if (claimError) throw claimError

  const { data: activity } = await admin
    .from('activities')
    .select('name')
    .eq('user_id', userId)
    .eq('id', activityId)
    .maybeSingle()

  const delivered = await deliverToSubscriptions(
    subscriptions as DbPushSubscription[],
    {
      title: 'Mile Marker',
      body: activity?.name
        ? `${activity.name} is ready for your reflection.`
        : 'Your run is ready for your reflection.',
      url: `/activities/${activityId}/reflect`,
    }
  )

  if (delivered === 0) {
    await admin
      .from('notification_deliveries')
      .delete()
      .eq('user_id', userId)
      .eq('activity_id', activityId)
  }

  return { delivered, skipped: null }
}

export async function sendTestNotification(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id,endpoint,p256dh_key,auth_key')
    .eq('user_id', userId)

  if (error) throw error
  if (!data?.length) return 0

  return deliverToSubscriptions(data as DbPushSubscription[], {
    title: 'Mile Marker',
    body: 'Post-run reminders are ready.',
    url: '/',
  })
}
