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

export async function getCurrentUser() {
  const session = await verifySession();
  if (!session) return null;
  return db.query.user.findFirst({
    where: eq(user.id, session.userId),
    columns: { passwordHash: false },
  });
}
