import { NextResponse } from 'next/server'

// Layer 1 (the gate): no token cookie -> go to /login.
// It only checks the cookie EXISTS. Real checks happen in lib/session.js.
export function proxy(request) {
  if (!request.cookies.has('token')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
