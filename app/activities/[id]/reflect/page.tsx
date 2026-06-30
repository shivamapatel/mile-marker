'use client'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useReflections } from '@/lib/useReflections'
import { useActivities } from '@/lib/useActivities'
import { formatShortDate } from '@/lib/utils'
import type { EnergyLevel, Reflection } from '@/lib/types'

export default function ReflectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { reflections, saveReflection } = useReflections()
  const { activities, loading } = useActivities()

  const existing = reflections[id] ?? null

  const [currentState, setCurrentState] = useState(existing?.currentState ?? '')
  const [energy, setEnergy] = useState<EnergyLevel | ''>(existing?.energy ?? '')
  const [mindTopic, setMindTopic] = useState(existing?.mindTopic ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [saving, setSaving] = useState(false)

  const activity = activities.find(a => a.id === id)

  if (loading && !activity) {
    return <p className="text-sm text-mocha">Loading…</p>
  }
  if (!activity) notFound()

  const handleSave = async () => {
    setSaving(true)
    const now = new Date().toISOString()
    const reflection: Reflection = {
      id: existing?.id ?? `ref-${id}-${Date.now()}`,
      activityId: id,
      currentState: currentState.trim(),
      energy: energy as EnergyLevel,
      mindTopic: mindTopic.trim(),
      note: note.trim(),
      routeLabel: '',
      capturedAt: existing?.capturedAt ?? now,
      updatedAt: now,
    }

    await saveReflection(reflection)
    router.push(`/activities/${id}`)
  }

  const isEditMode = !!existing

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <Link
          href={`/activities/${id}`}
          className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso transition-colors mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
          {activity.name}
        </Link>

        <p className="text-xs text-mocha mb-1">{formatShortDate(activity.startDate)}</p>
        <h1 className="text-xl font-semibold text-espresso">
          {isEditMode ? 'Edit reflection' : 'Capture your reflection'}
        </h1>
      </div>

      {/* Post run feeling */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-espresso">Post run feeling</label>
        <input
          type="text"
          value={currentState}
          onChange={e => setCurrentState(e.target.value)}
          placeholder="weirdly calm, anxious but clearer, still annoyed but less stuck..."
          className="w-full bg-ivory border border-sand rounded-xl px-4 py-3 text-sm text-espresso placeholder:text-mocha/60 focus:outline-none focus:border-sienna transition-colors"
        />
      </div>

      {/* Energy */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-espresso">Energy</label>
        <div className="flex gap-2">
          {(['Drained', 'Steady', 'Charged'] as EnergyLevel[]).map(level => (
            <button
              key={level}
              onClick={() => setEnergy(energy === level ? '' : level)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                energy === level
                  ? 'bg-sienna-light text-sienna-dark border-sienna'
                  : 'bg-ivory text-espresso border-sand hover:border-sienna'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* What was on your mind */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-espresso">What was on your mind?</label>
        <input
          type="text"
          value={mindTopic}
          onChange={e => setMindTopic(e.target.value)}
          placeholder="Career, a conversation, an idea, a feeling..."
          className="w-full bg-ivory border border-sand rounded-xl px-4 py-3 text-sm text-espresso placeholder:text-mocha/60 focus:outline-none focus:border-sienna transition-colors"
        />
      </div>

      {/* Deeper note */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-espresso">
          Anything else worth remembering?
          <span className="text-mocha font-normal ml-1.5">Optional</span>
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          placeholder="More detail, a specific moment, something you want to come back to..."
          className="w-full bg-ivory border border-sand rounded-xl px-4 py-3 text-sm text-espresso placeholder:text-mocha/60 focus:outline-none focus:border-sienna transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-medium transition-colors bg-sienna-dark text-ivory hover:bg-sienna disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save reflection'}
        </button>
        <Link
          href={`/activities/${id}`}
          className="block w-full py-3 text-center rounded-xl text-sm text-mocha hover:text-espresso transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
