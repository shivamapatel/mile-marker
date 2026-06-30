'use client'
import { useState, useEffect } from 'react'
import { Reflection } from './types'
import { MOCK_REFLECTIONS } from './mockData'
import { createClient } from './supabase/client'

// Shape returned by the reflections table. activity_id is a bigint column
// (Strava activity id), which PostgREST serializes as a JS number.
interface DbReflection {
  id: string
  activity_id: string | number
  current_state: string
  energy: string
  mind_topic: string
  note: string
  route_label: string
  captured_at: string
  updated_at: string
}

function fromDb(row: DbReflection): Reflection {
  return {
    id: row.id,
    activityId: String(row.activity_id),
    currentState: row.current_state,
    energy: row.energy as Reflection['energy'],
    mindTopic: row.mind_topic,
    note: row.note,
    routeLabel: row.route_label,
    capturedAt: row.captured_at,
    updatedAt: row.updated_at,
  }
}

export function useReflections() {
  const [reflections, setReflections] = useState<Record<string, Reflection>>(MOCK_REFLECTIONS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    supabase
      .from('reflections')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data) {
          const saved: Record<string, Reflection> = {}
          for (const row of data as DbReflection[]) {
            saved[row.activity_id] = fromDb(row)
          }
          setReflections({ ...MOCK_REFLECTIONS, ...saved })
        }
        setLoading(false)
      })
  }, [])

  async function saveReflection(reflection: Reflection) {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const row = {
      user_id: user.id,
      activity_id: reflection.activityId,
      current_state: reflection.currentState,
      energy: reflection.energy,
      mind_topic: reflection.mindTopic,
      note: reflection.note,
      route_label: reflection.routeLabel,
      captured_at: reflection.capturedAt,
      updated_at: reflection.updatedAt,
    }

    const { error } = await supabase
      .from('reflections')
      .upsert(row, { onConflict: 'user_id,activity_id' })

    if (!error) {
      setReflections(prev => ({ ...prev, [reflection.activityId]: reflection }))
    }
  }

  return { reflections, saveReflection, loading }
}
