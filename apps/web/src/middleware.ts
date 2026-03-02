import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users to login
  // Note: we intentionally do NOT redirect authenticated users away from /login
  // because the cookie may be stale (session expired server-side). The login page
  // itself handles redirecting already-authenticated users after sign-in.
  if (!sessionCookie && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest\\.webmanifest|manifest\\.json|icons).*)'],
};
