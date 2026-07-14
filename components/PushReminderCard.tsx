'use client'

import { useEffect, useState } from 'react'

type ReminderStatus =
  | 'loading'
  | 'available'
  | 'enabled'
  | 'denied'
  | 'unsupported'
  | 'error'

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandaloneApp() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)))
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })

  if (!response.ok) throw new Error('Could not save notification subscription')
}

export default function PushReminderCard() {
  const [status, setStatus] = useState<ReminderStatus>('loading')
  const [modalOpen, setModalOpen] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      const ios = isIosDevice()
      const installed = isStandaloneApp()
      setIsIos(ios)
      setStandalone(installed)

      // iOS exposes Web Push to Home Screen apps. In ordinary Safari we still
      // show the installation walkthrough even when PushManager is unavailable.
      if (ios && !installed) {
        setStatus('available')
        return
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setStatus('unsupported')
        return
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        const existing = await registration.pushManager.getSubscription()

        if (cancelled) return

        if (Notification.permission === 'denied') {
          setStatus('denied')
          return
        }

        if (existing) {
          await saveSubscription(existing)
          if (!cancelled) setStatus('enabled')
          return
        }

        // A granted permission can outlive its browser subscription. Recreate
        // the subscription quietly when the app opens so reminders self-heal.
        if (Notification.permission === 'granted') {
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (!publicKey) throw new Error('Missing public notification key')

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          })
          await saveSubscription(subscription)
          if (!cancelled) setStatus('enabled')
          return
        }

        setStatus('available')
      } catch (error) {
        console.error('[push] initialization failed:', error)
        if (!cancelled) setStatus('error')
      }
    }

    initialize()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!modalOpen) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setModalOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [modalOpen])

  async function enableReminders() {
    setWorking(true)
    setMessage(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'available')
        return
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) throw new Error('Missing public notification key')

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      await saveSubscription(subscription)
      setStatus('enabled')
      setModalOpen(false)
    } catch (error) {
      console.error('[push] subscription failed:', error)
      setStatus('error')
      setMessage('Reminders could not be enabled. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  async function disableReminders() {
    setWorking(true)
    setMessage(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const response = await fetch('/api/push/subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        if (!response.ok) throw new Error('Could not remove notification subscription')
        await subscription.unsubscribe()
      }

      setStatus('available')
      setModalOpen(false)
    } catch (error) {
      console.error('[push] unsubscribe failed:', error)
      setMessage('Reminders could not be turned off. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  async function sendTest() {
    setWorking(true)
    setMessage(null)

    try {
      const response = await fetch('/api/push/test', { method: 'POST' })
      const result = await response.json()
      if (!response.ok || result.delivered < 1) throw new Error('Test notification was not delivered')
      setMessage('Test notification sent.')
    } catch (error) {
      console.error('[push] test failed:', error)
      setMessage('The test notification could not be delivered.')
    } finally {
      setWorking(false)
    }
  }

  if (status === 'loading' || status === 'unsupported') return null

  const needsInstallation = isIos && !standalone

  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-mocha mb-3">Reminders</p>
      <button
        type="button"
        onClick={() => { setMessage(null); setModalOpen(true) }}
        className="w-full bg-ivory rounded-2xl border border-sand p-5 flex items-center justify-between gap-4 text-left hover:border-sienna transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-espresso">Post-run reminders</p>
          <p className="text-xs text-mocha mt-0.5">
            {status === 'enabled'
              ? 'On · You’ll be notified when a new run arrives.'
              : status === 'denied'
                ? 'Off · Notifications are blocked in your settings.'
                : 'Get notified when Mile Marker detects a new run.'}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
          status === 'enabled'
            ? 'bg-sienna-light text-sienna-dark border-sienna'
            : 'bg-ivory text-mocha border-sand'
        }`}>
          {status === 'enabled' ? 'On' : 'Enable'}
        </span>
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-espresso/35 px-4 py-8 flex items-end sm:items-center justify-center"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModalOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="push-modal-title"
            className="w-full max-w-sm bg-ivory rounded-3xl border border-sand p-5 shadow-xl"
          >
            {needsInstallation ? (
              <InstallWalkthrough onClose={() => setModalOpen(false)} />
            ) : status === 'enabled' ? (
              <>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-mocha mb-1">Reminders on</p>
                    <h2 id="push-modal-title" className="text-xl font-semibold font-serif text-espresso">
                      Post-run reminders
                    </h2>
                  </div>
                  <CloseButton onClick={() => setModalOpen(false)} />
                </div>
                <p className="text-sm text-mocha leading-relaxed mb-5">
                  Mile Marker will notify you when Strava sends us a new run.
                </p>
                {message && <p className="text-xs text-mocha mb-3">{message}</p>}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={working}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-sienna-dark text-ivory hover:bg-sienna transition-colors disabled:opacity-60"
                  >
                    {working ? 'Sending…' : 'Send test notification'}
                  </button>
                  <button
                    type="button"
                    onClick={disableReminders}
                    disabled={working}
                    className="w-full py-3 rounded-xl text-sm text-mocha hover:text-espresso transition-colors disabled:opacity-60"
                  >
                    Turn off reminders
                  </button>
                </div>
              </>
            ) : status === 'denied' ? (
              <>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <h2 id="push-modal-title" className="text-xl font-semibold font-serif text-espresso">
                    Notifications are blocked
                  </h2>
                  <CloseButton onClick={() => setModalOpen(false)} />
                </div>
                <p className="text-sm text-mocha leading-relaxed mb-5">
                  Open your iPhone Settings, find Mile Marker under Notifications, and turn on Allow Notifications.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-full py-3 rounded-xl text-sm font-medium bg-sienna-dark text-ivory hover:bg-sienna transition-colors"
                >
                  Got it
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <img src="/brand/app-icon-192.png" alt="Mile Marker" className="w-12 h-12 rounded-xl mb-4" />
                    <h2 id="push-modal-title" className="text-xl font-semibold font-serif text-espresso">
                      Never miss a post-run reflection.
                    </h2>
                  </div>
                  <CloseButton onClick={() => setModalOpen(false)} />
                </div>
                <p className="text-sm text-mocha leading-relaxed mb-6">
                  Allow Mile Marker to send you notifications right after you upload to Strava.
                </p>
                {message && <p className="text-xs text-mocha mb-3">{message}</p>}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={enableReminders}
                    disabled={working}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-sienna-dark text-ivory hover:bg-sienna transition-colors disabled:opacity-60"
                  >
                    {working ? 'Enabling…' : 'Enable reminders'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="w-full py-3 rounded-xl text-sm text-mocha hover:text-espresso transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="shrink-0 w-8 h-8 rounded-full border border-sand text-mocha hover:text-espresso transition-colors"
    >
      ×
    </button>
  )
}

function InstallWalkthrough({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <img src="/brand/app-icon-192.png" alt="Mile Marker" className="w-12 h-12 rounded-xl mb-4" />
          <h2 id="push-modal-title" className="text-xl font-semibold font-serif text-espresso">
            Add Mile Marker to your Home Screen
          </h2>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <p className="text-sm text-mocha leading-relaxed mb-4">
        On iPhone, installing Mile Marker unlocks post-run notifications.
      </p>

      <div className="install-demo mb-5" aria-label="Tap Share, choose Add to Home Screen, then open Mile Marker">
        <div className="install-demo-step">
          <ShareIcon />
          <p><span>1</span> Tap Share in Safari</p>
        </div>
        <div className="install-demo-step">
          <AddToHomeIcon />
          <p><span>2</span> Choose Add to Home Screen</p>
        </div>
        <div className="install-demo-step">
          <img src="/brand/app-icon-192.png" alt="" className="w-14 h-14 rounded-xl" />
          <p><span>3</span> Open Mile Marker from its icon</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-3 rounded-xl text-sm font-medium bg-sienna-dark text-ivory hover:bg-sienna transition-colors"
      >
        Got it
      </button>
    </>
  )
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" width="56" height="56" viewBox="0 0 56 56" fill="none" className="text-sienna-dark">
      <rect x="11" y="19" width="34" height="29" rx="7" stroke="currentColor" strokeWidth="2.5" />
      <path d="M28 32V7M20 15l8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AddToHomeIcon() {
  return (
    <svg aria-hidden="true" width="56" height="56" viewBox="0 0 56 56" fill="none" className="text-sienna-dark">
      <rect x="8" y="8" width="40" height="40" rx="9" stroke="currentColor" strokeWidth="2.5" />
      <path d="M28 18v20M18 28h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
