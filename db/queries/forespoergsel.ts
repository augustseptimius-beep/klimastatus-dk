import { db } from '@/db';
import { forespoergsel, tiltag, tovholder, tovholderTiltag } from '@/db/schema';
import { and, eq, desc, asc } from 'drizzle-orm';

export type ForespoergselRow = {
  id: string;
  status: 'sendt' | 'besvaret' | 'forfalden';
  sendtAt: string;
  besvaretAt: string | null;
};

export type AabenForespoergsel = {
  id: string;
  tiltagId: string;
  tiltagTitel: string;
  spoergsmaal: string | null;
  sendtAt: string;
};

export type TovholderKort = { id: string; navn: string; email: string };

function toISO(v: Date | string): string {
  return typeof v === 'string' ? v : v.toISOString();
}

/** Opretter én forespørgsel scopet til (tovholder, tiltag). */
export async function createForespoergsel(data: {
  kommuneId: string;
  tovholderId: string;
  tiltagId: string;
  spoergsmaal?: string | null;
  monitoreringscyklusId?: string | null;
}) {
  const [created] = await db
    .insert(forespoergsel)
    .values({
      kommuneId: data.kommuneId,
      tovholderId: data.tovholderId,
      tiltagId: data.tiltagId,
      spoergsmaal: data.spoergsmaal ?? null,
      monitoreringscyklusId: data.monitoreringscyklusId ?? null,
    })
    .returning();
  return created;
}

/** Åbne (status='sendt') forespørgsler for én tovholder, ældste først. */
export async function getAabneForespoergslerForTovholder(tovholderId: string): Promise<AabenForespoergsel[]> {
  const rows = await db
    .select({
      id: forespoergsel.id,
      tiltagId: forespoergsel.tiltagId,
      tiltagTitel: tiltag.titel,
      spoergsmaal: forespoergsel.spoergsmaal,
      sendtAt: forespoergsel.sendtAt,
    })
    .from(forespoergsel)
    .innerJoin(tiltag, eq(forespoergsel.tiltagId, tiltag.id))
    .where(and(eq(forespoergsel.tovholderId, tovholderId), eq(forespoergsel.status, 'sendt')))
    .orderBy(asc(forespoergsel.sendtAt));
  return rows.map((r) => ({ ...r, sendtAt: toISO(r.sendtAt) }));
}

/** Alle forespørgsler for ét tiltag, nyeste først (til "sidst anmodet" + åbne-antal). */
export async function getForespoergslerForTiltag(tiltagId: string): Promise<ForespoergselRow[]> {
  const rows = await db
    .select({
      id: forespoergsel.id,
      status: forespoergsel.status,
      sendtAt: forespoergsel.sendtAt,
      besvaretAt: forespoergsel.besvaretAt,
    })
    .from(forespoergsel)
    .where(eq(forespoergsel.tiltagId, tiltagId))
    .orderBy(desc(forespoergsel.sendtAt));
  return rows.map((r) => ({
    ...r,
    sendtAt: toISO(r.sendtAt),
    besvaretAt: r.besvaretAt == null ? null : toISO(r.besvaretAt),
  }));
}

/** Tovholdere knyttet til et tiltag (via tovholder_tiltag). */
export async function getTovholdereForTiltag(tiltagId: string): Promise<TovholderKort[]> {
  return db
    .select({ id: tovholder.id, navn: tovholder.navn, email: tovholder.email })
    .from(tovholder)
    .innerJoin(
      tovholderTiltag,
      and(eq(tovholderTiltag.tovholderId, tovholder.id), eq(tovholderTiltag.tiltagId, tiltagId)),
    )
    .orderBy(asc(tovholder.navn));
}

/** Slår én forespørgsel op (til scope-tjek ved besvarelse). */
export async function getForespoergselById(id: string) {
  return db.query.forespoergsel.findFirst({ where: eq(forespoergsel.id, id) });
}

/** Markér en forespørgsel som besvaret. */
export async function markForespoergselBesvaret(id: string) {
  await db
    .update(forespoergsel)
    .set({ status: 'besvaret', besvaretAt: new Date() })
    .where(eq(forespoergsel.id, id));
}
