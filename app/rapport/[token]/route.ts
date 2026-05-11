import { NextRequest, NextResponse } from 'next/server';
import { getMagicLinkByTokenHash, markMagicLinkUsed, hashToken } from '@/db/queries/magic-link';
import { getTovholderById } from '@/db/queries/tovholder';
import { encryptTovholder } from '@/lib/tovholder-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // If they already have a valid tovholder session, skip verification
  const existingSession = request.cookies.get('tovholder-session')?.value;
  if (existingSession) {
    return NextResponse.redirect(new URL('/rapport', request.nextUrl));
  }

  const tokenHash = hashToken(token);
  const link = await getMagicLinkByTokenHash(tokenHash);

  if (!link || link.used || new Date(link.expiresAt) < new Date()) {
    return NextResponse.redirect(new URL('/rapport/udloebet', request.nextUrl));
  }

  const tovholder = await getTovholderById(link.tovholderId);
  if (!tovholder) {
    return NextResponse.redirect(new URL('/rapport/udloebet', request.nextUrl));
  }

  await markMagicLinkUsed(link.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionToken = await encryptTovholder({
    tovholderId: tovholder.id,
    kommuneId: tovholder.kommuneId,
    expiresAt,
  });

  const response = NextResponse.redirect(new URL('/rapport', request.nextUrl));
  response.cookies.set('tovholder-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
