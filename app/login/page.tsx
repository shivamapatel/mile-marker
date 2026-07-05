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
    <main className="min-h-screen bg-espresso flex flex-col items-center justify-center px-6 text-center">
      <img
        src="/brand/logo-light.png"
        alt="Mile Marker"
        className="w-[280px] max-w-[80%] h-auto mb-7"
      />
      <h1 className="font-serif font-semibold text-[34px] text-cream mb-2.5">Mile Marker</h1>
      <p className="text-[15px] text-mocha max-w-[340px] leading-relaxed mb-10">
        A private place to reflect on every run.
      </p>

      <div className="w-full max-w-sm">
        {sent ? (
          <div className="bg-ivory rounded-2xl border border-sand p-6 space-y-2 text-left">
            <p className="text-sm font-medium text-espresso">Check your email</p>
            <p className="text-sm text-mocha">
              We sent a sign-in link to <span className="text-espresso">{email}</span>.
              Click it to continue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
              <p className="text-xs text-sienna-light">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-ivory text-espresso text-sm font-medium rounded-xl py-3 hover:bg-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
