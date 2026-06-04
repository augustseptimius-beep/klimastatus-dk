import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const publicRoutes = ['/', '/login'];
const publicPrefixes = ['/rapport'];
const adminRoutes = ['/admin'];

const reservedSegments = new Set([
  'k', 'login', 'admin', 'rapport', 'dashboard', 'tiltag',
  'indsatser', 'tovholdere', 'data', 'selvevaluering',
  'indstillinger', 'laering', 'api', '_next', 'favicon.ico',
]);

function isPublicSlug(path: string): boolean {
  const match = path.match(/^\/([a-z][a-z0-9-]*)$/);
  return match !== null && !reservedSegments.has(match[1]);
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic =
    publicRoutes.includes(path) ||
    publicPrefixes.some((p) => path.startsWith(p)) ||
    isPublicSlug(path);
  const isAdmin = adminRoutes.some((r) => path.startsWith(r));

  const token = req.cookies.get('session')?.value;
  const session = token ? await decrypt(token) : null;

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  if (isAdmin && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  if (path === '/login' && session) {
    let destination: string;
    if (session.role === 'admin') {
      destination = '/admin/kommuner';
    } else if (session.kommuneSlug) {
      destination = `/k/${session.kommuneSlug}/dashboard`;
    } else {
      destination = '/dashboard';
    }
    return NextResponse.redirect(new URL(destination, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
