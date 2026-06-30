'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        <div>
          <h1 className="text-2xl font-semibold text-espresso font-serif">Mile Marker</h1>
          <p className="text-sm text-mocha mt-1">Your private post-run journal.</p>
        </div>

        {sent ? (
          <div className="bg-ivory rounded-2xl border border-sand p-6 space-y-2">
            <p className="text-sm font-medium text-espresso">Check your email</p>
            <p className="text-sm text-mocha">
              We sent a sign-in link to <span className="text-espresso">{email}</span>.
              Click it to continue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs text-mocha">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-ivory border border-sand rounded-xl px-4 py-3 text-sm text-espresso placeholder:text-mocha focus:outline-none focus:border-sienna transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-sienna">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-sienna-dark text-ivory text-sm font-medium rounded-xl py-3 hover:bg-sienna transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
