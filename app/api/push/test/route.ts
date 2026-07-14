import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTestNotification } from '@/lib/push'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const delivered = await sendTestNotification(user.id)
    return NextResponse.json({ delivered })
  } catch (error) {
    console.error('[push] test notification failed:', error)
    return NextResponse.json({ error: 'Could not send test notification' }, { status: 500 })
  }
}
