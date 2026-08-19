import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // If Supabase isn't configured yet (no .env.local), pass through without auth
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  // The Strava webhook is called by Strava's servers with no user session. It
  // must bypass the auth guard entirely, or the session check below would
  // redirect Strava's request to /login and the events would never arrive.
  if (
    request.nextUrl.pathname.startsWith('/api/strava/webhook') ||
    request.nextUrl.pathname.startsWith('/api/cron/monthly-digests')
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() for fast optimistic redirect check (no network call).
  // Real security is enforced by Supabase RLS on every data query.
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
