import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/', '/api/auth/login', '/api/auth/signup'];
  const isPublicPath = publicPaths.includes(pathname);

  // Les routes API gèrent leur propre authentification
  const isApiRoute = pathname.startsWith('/api/');

  // If user is not logged in and trying to access protected route (but not API routes)
  if (!session && !isPublicPath && !isApiRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si user connecté et sur la page de login, rediriger vers dashboard-entry
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard-entry', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|logo.*\\.png|icon.*\\.png).*)'],
};
