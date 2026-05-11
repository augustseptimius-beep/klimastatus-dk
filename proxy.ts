import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

const publicRoutes = ['/', '/login'];
const adminRoutes = ['/admin'];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = publicRoutes.includes(path);
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
    return NextResponse.redirect(
      new URL(session.role === 'admin' ? '/admin/kommuner' : '/dashboard', req.nextUrl),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
