// db/queries/laeringspost.ts
import { db } from '@/db';
import {
  laeringspost,
  cctfKriterieMapping,
  tovholderRapport,
  tovholder,
  tiltag,
} from '@/db/schema';
import { eq, and, desc, isNotNull, ne, notInArray } from 'drizzle-orm';
import type { LaeringsBeslutning, LaeringsKnytning } from '@/lib/merl/laeringspost-types';

const KRITERIE_LAERING = 15;

export type NyLaeringspost = {
  kommuneId: string;
  knyttetTilType: LaeringsKnytning;
  knyttetTilId: string;
  observation: string;
  fortolkning: string | null;
  beslutning: LaeringsBeslutning;
  beslutningstager: string | null;
  dato: string; // ISO yyyy-mm-dd
  tovholderRapportId: string | null;
};

/**
 * Opret en læringspost og dens CCTF-mapping mod kriterie 15 i én transaktion.
 * Mapping-rækken gør at posten dukker op i selvevalueringens dokumentationshenvisninger.
 */
export async function createLaeringspost(input: NyLaeringspost): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(laeringspost).values(input).returning({ id: laeringspost.id });
    await tx.insert(cctfKriterieMapping).values({
      entitetType: 'laeringspost',
      entitetId: row.id,
      kriterieNr: KRITERIE_LAERING,
      dokumentationsstyrke: 'primary',
      bemaerkning: input.observation.slice(0, 120),
    });
    return row.id;
  });
}

/** Slet en læringspost og dens CCTF-mapping (polymorf mapping har ingen FK-cascade). */
export async function deleteLaeringspost(id: string, kommuneId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: laeringspost.id })
      .from(laeringspost)
      .where(and(eq(laeringspost.id, id), eq(laeringspost.kommuneId, kommuneId)))
      .limit(1);
    if (!row) return; // ejes ikke af kommunen — no-op
    await tx.delete(cctfKriterieMapping).where(
      and(
        eq(cctfKriterieMapping.entitetType, 'laeringspost'),
        eq(cctfKriterieMapping.entitetId, id),
      ),
    );
    await tx.delete(laeringspost).where(and(eq(laeringspost.id, id), eq(laeringspost.kommuneId, kommuneId)));
  });
}

export type LaeringspostRow = typeof laeringspost.$inferSelect;

/** Alle læringsposter for kommunen, nyeste først. */
export async function getLaeringsposter(kommuneId: string): Promise<LaeringspostRow[]> {
  return db
    .select()
    .from(laeringspost)
    .where(eq(laeringspost.kommuneId, kommuneId))
    .orderBy(desc(laeringspost.dato), desc(laeringspost.createdAt));
}

export type BarriereRapport = {
  rapportId: string;
  tiltagId: string;
  tiltagTitel: string;
  barrierer: string;
  dato: string;
};

/**
 * Barriere-indbakke: tovholder-rapporter med ikke-tom barriere, der endnu IKKE
 * er omsat til en læringspost. Joiner via tovholder for at sikre kommune-ejerskab.
 */
export async function getBarriereInbox(kommuneId: string): Promise<BarriereRapport[]> {
  // Rapport-ID'er der allerede har en læringspost
  const brugte = await db
    .select({ id: laeringspost.tovholderRapportId })
    .from(laeringspost)
    .where(and(eq(laeringspost.kommuneId, kommuneId), isNotNull(laeringspost.tovholderRapportId)));
  const brugteIds = brugte.map((b) => b.id).filter((x): x is string => x !== null);

  const base = db
    .select({
      rapportId: tovholderRapport.id,
      tiltagId: tovholderRapport.tiltagId,
      tiltagTitel: tiltag.titel,
      barrierer: tovholderRapport.barrierer,
      dato: tovholderRapport.dato,
    })
    .from(tovholderRapport)
    .innerJoin(tovholder, eq(tovholderRapport.tovholderId, tovholder.id))
    .innerJoin(tiltag, eq(tovholderRapport.tiltagId, tiltag.id));

  const rows = await (brugteIds.length > 0
    ? base.where(and(
        eq(tovholder.kommuneId, kommuneId),
        isNotNull(tovholderRapport.barrierer),
        ne(tovholderRapport.barrierer, ''),
        notInArray(tovholderRapport.id, brugteIds),
      ))
    : base.where(and(
        eq(tovholder.kommuneId, kommuneId),
        isNotNull(tovholderRapport.barrierer),
        ne(tovholderRapport.barrierer, ''),
      )));

  return (rows as (typeof rows[number] & { barrierer: string })[]).map((r) => ({
    rapportId: r.rapportId,
    tiltagId: r.tiltagId,
    tiltagTitel: r.tiltagTitel,
    barrierer: r.barrierer,
    dato: r.dato,
  }));
}
