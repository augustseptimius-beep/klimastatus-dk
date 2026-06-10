// db/queries/magic-link.ts
import { db } from '@/db';
import { magicLink, tovholder, tovholderRapport } from '@/db/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
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

/**
 * Genbrug et eksisterende link til en rykker: nyt token og ny udløbsdato på
 * samme række, så rykker-tælleren følger runden i stedet for at nulstilles.
 */
export async function refreshMagicLink(linkId: string, expiresInDays = 14) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await db
    .update(magicLink)
    .set({
      tokenHash,
      expiresAt,
      sidstRykketAt: new Date(),
      rykkerAntal: sql`${magicLink.rykkerAntal} + 1`,
    })
    .where(eq(magicLink.id, linkId));
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

/** Markér alle åbne links for en tovholder som brugt — kaldes når rapporten indsendes. */
export async function markMagicLinksUsedForTovholder(tovholderId: string) {
  await db
    .update(magicLink)
    .set({ used: true })
    .where(and(eq(magicLink.tovholderId, tovholderId), eq(magicLink.used, false)));
}

export type TovholderRundeStatus = {
  linkSendtAt: Date;
  rykkerAntal: number;
  sidstRykketAt: Date | null;
  harSvaret: boolean;
};

/**
 * Status pr. tovholder for den seneste runde: hvornår blev linket sendt,
 * hvor mange rykkere er afsendt, og er der svaret siden linket blev sendt.
 */
export async function getRundeStatusForKommune(
  kommuneId: string,
): Promise<Map<string, TovholderRundeStatus>> {
  const tovholdere = await db
    .select({ id: tovholder.id })
    .from(tovholder)
    .where(eq(tovholder.kommuneId, kommuneId));
  const tovholderIds = tovholdere.map((t) => t.id);
  if (tovholderIds.length === 0) return new Map();

  const links = await db
    .select({
      tovholderId: magicLink.tovholderId,
      createdAt: magicLink.createdAt,
      rykkerAntal: magicLink.rykkerAntal,
      sidstRykketAt: magicLink.sidstRykketAt,
    })
    .from(magicLink)
    .where(inArray(magicLink.tovholderId, tovholderIds))
    .orderBy(desc(magicLink.createdAt));

  const senesteRapporter = await db
    .select({
      tovholderId: tovholderRapport.tovholderId,
      senest: sql<string>`max(${tovholderRapport.createdAt})`,
    })
    .from(tovholderRapport)
    .where(inArray(tovholderRapport.tovholderId, tovholderIds))
    .groupBy(tovholderRapport.tovholderId);
  const senestSvarAt = new Map(
    senesteRapporter.map((r) => [r.tovholderId, new Date(r.senest)]),
  );

  const result = new Map<string, TovholderRundeStatus>();
  for (const link of links) {
    if (result.has(link.tovholderId)) continue; // links er sorteret nyeste først
    const svarAt = senestSvarAt.get(link.tovholderId);
    result.set(link.tovholderId, {
      linkSendtAt: link.createdAt,
      rykkerAntal: link.rykkerAntal,
      sidstRykketAt: link.sidstRykketAt,
      harSvaret: svarAt != null && svarAt > link.createdAt,
    });
  }
  return result;
}
