'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DigestConsentCard({ initialOptedIn }: { initialOptedIn: boolean }) {
  const router = useRouter()
  const [optedIn, setOptedIn] = useState(initialOptedIn)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function updatePreference(nextValue: boolean) {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/monthly-digest/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optedIn: nextValue }),
      })

      if (!response.ok) throw new Error('Preference update failed')
      const result = await response.json() as {
        generation?: { status?: 'completed' | 'skipped' | 'failed'; reason?: string }
      }

      setOptedIn(nextValue)
      if (!nextValue) {
        setMessage('Monthly Digest is off.')
      } else if (result.generation?.status === 'completed') {
        setMessage('Monthly Digest is on. Your latest digest is ready.')
      } else if (result.generation?.reason === 'ineligible') {
        setMessage('Monthly Digest is on. You’ll receive one after an eligible month.')
      } else {
        setMessage('Monthly Digest is on.')
      }
      router.refresh()
    } catch {
      setMessage('Couldn’t update your preference. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-ivory rounded-2xl border border-sand p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-espresso">
          {optedIn ? 'Monthly Digest is on' : 'Create my Monthly Digest'}
        </h2>
        <p className="text-sm text-mocha mt-1 leading-relaxed">
          {optedIn
            ? 'Your eligible reflections will be privately processed once at the end of each month.'
            : 'Allow Mile Marker to privately process your reflections with an AI model at month’s end.'}
        </p>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => updatePreference(!optedIn)}
        className={`w-full rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
          optedIn
            ? 'border border-sand text-mocha hover:text-espresso'
            : 'bg-sienna-dark text-ivory hover:bg-sienna'
        }`}
      >
        {saving ? 'Saving…' : optedIn ? 'Turn off Monthly Digest' : 'Turn on Monthly Digest'}
      </button>

      {message ? <p className="text-xs text-mocha">{message}</p> : null}
    </section>
  )
}
