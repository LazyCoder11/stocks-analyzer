import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  const { pathname } = req.nextUrl;

  // Paths that are public
  const isPublicPage = pathname === '/login' || pathname === '/register';
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isStaticFile = pathname.includes('.') || pathname.startsWith('/_next');

  // Skip static files and auth API routes
  if (isStaticFile || isApiAuthRoute) {
    return NextResponse.next();
  }

  // If no token and trying to access private page/api
  if (!token && !isPublicPage) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If token exists and trying to access login/register
  if (token && isPublicPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

// Config to specify matching routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - static files (e.g. favicon.ico, images, robots.txt, etc.)
     * - next internal files (_next/static, _next/image)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
