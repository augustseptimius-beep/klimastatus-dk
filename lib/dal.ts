import 'server-only';
import { cookies } from 'next/headers';
import { decrypt } from './session';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { user } from '@/db/schema';
import type { SessionPayload } from './definitions';

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  const payload = await decrypt(token);
  if (!payload || !payload.userId) return null;
  return payload;
}

/**
 * Kræver en gyldig admin-session. Kastes der ikke, er kalderen admin.
 * Bruges i server actions — layout-/proxy-checks beskytter IKKE actions,
 * da de er selvstændige POST-endpoints der kan kaldes udenom siden.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session || session.role !== 'admin') {
    throw new Error('Ikke autoriseret');
  }
  return session;
}

export async function getCurrentUser() {
  const session = await verifySession();
  if (!session) return null;
  return db.query.user.findFirst({
    where: eq(user.id, session.userId),
    columns: { passwordHash: false },
  });
}
