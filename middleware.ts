import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/', '/api/auth/login', '/api/auth/signup'];
  const isPublicPath = publicPaths.includes(pathname);

  // If user is not logged in and trying to access protected route
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is logged in and trying to access login/signup page
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
