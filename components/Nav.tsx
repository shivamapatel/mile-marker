'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isActivities = pathname.startsWith('/activities')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-ivory border-t border-sand">
      <div className="max-w-md mx-auto flex">
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
            isHome ? 'text-espresso' : 'text-mocha'
          }`}
        >
          <HomeIcon bold={isHome} />
          Home
        </Link>
        <Link
          href="/activities"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
            isActivities ? 'text-espresso' : 'text-mocha'
          }`}
        >
          <ListIcon bold={isActivities} />
          Activities
        </Link>
      </div>
    </nav>
  )
}

function HomeIcon({ bold }: { bold: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={bold ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function ListIcon({ bold }: { bold: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={bold ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="0.5" fill="currentColor" />
      <circle cx="3" cy="12" r="0.5" fill="currentColor" />
      <circle cx="3" cy="18" r="0.5" fill="currentColor" />
    </svg>
  )
}
