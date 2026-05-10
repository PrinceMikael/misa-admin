import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = [
  '/dashboard',
  '/schedules',
  '/intentions',
  '/notices',
  '/parish',
  '/settings',
  '/onboarding',
  '/super',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isProtected) return NextResponse.next();

  // Cookie set by AuthContext on the client after Firebase Auth resolves.
  // This is a fast nav-hint layer; Firestore rules + ProtectedRoute enforce real auth.
  if (!request.cookies.has('__firebase_auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)'],
};
