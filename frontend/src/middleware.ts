import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We can't access sessionStorage from edge middleware reliably since it's on the client.
  // We can check for the existence of the refreshToken cookie as a heuristic 
  // to protect the /dashboard routes from server-side.
  const hasRefreshToken = request.cookies.has('refreshToken');

  if (pathname.startsWith('/dashboard')) {
    if (!hasRefreshToken) {
      // Redirect to login if no refresh token cookie is present
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
