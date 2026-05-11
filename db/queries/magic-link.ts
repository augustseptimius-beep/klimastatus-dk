// db/queries/magic-link.ts
import { db } from '@/db';
import { magicLink } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createMagicLink(tovholderId: string, expiresInDays = 14) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await db.insert(magicLink).values({ tokenHash, tovholderId, expiresAt });
  return token;
}

export async function getMagicLinkByTokenHash(tokenHash: string) {
  return db.query.magicLink.findFirst({
    where: eq(magicLink.tokenHash, tokenHash),
  });
}

export async function markMagicLinkUsed(id: string) {
  await db.update(magicLink).set({ used: true }).where(eq(magicLink.id, id));
}
