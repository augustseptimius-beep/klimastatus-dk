import { db } from '@/db';
import { indikator, indikatorTiltag, indikatorMaaling, tovholderRapport, tovholder, laeringspost } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export type IndikatorMedMaaling = {
  id: string;
  niveau: 'output' | 'outcome' | 'impact';
  beskrivelse: string;
  enhed: string | null;
  senesteVaerdi: number | null;
  senesteDato: string | null;
  senesteAar: number | null;
};

/** Indikatorer koblet til tiltaget, hver med sin seneste måling (hvis nogen). */
export async function getIndikatorerForTiltag(tiltagId: string): Promise<IndikatorMedMaaling[]> {
  const inds = await db
    .select({
      id: indikator.id,
      niveau: indikator.niveau,
      beskrivelse: indikator.beskrivelse,
      enhed: indikator.enhed,
    })
    .from(indikator)
    .innerJoin(indikatorTiltag, eq(indikatorTiltag.indikatorId, indikator.id))
    .where(eq(indikatorTiltag.tiltagId, tiltagId));

  if (inds.length === 0) return [];

  const ids = inds.map((i) => i.id);
  const maalinger = await db
    .select({
      indikatorId: indikatorMaaling.indikatorId,
      vaerdi: indikatorMaaling.vaerdi,
      dato: indikatorMaaling.dato,
      aar: indikatorMaaling.aar,
    })
    .from(indikatorMaaling)
    .where(inArray(indikatorMaaling.indikatorId, ids))
    .orderBy(desc(indikatorMaaling.aar), desc(indikatorMaaling.dato));

  const senesteFor = new Map<string, { vaerdi: number; dato: string | null; aar: number | null }>();
  for (const m of maalinger) {
    if (!senesteFor.has(m.indikatorId)) {
      senesteFor.set(m.indikatorId, { vaerdi: m.vaerdi, dato: m.dato, aar: m.aar });
    }
  }

  return inds.map((i) => {
    const s = senesteFor.get(i.id);
    return {
      id: i.id,
      niveau: i.niveau as IndikatorMedMaaling['niveau'],
      beskrivelse: i.beskrivelse,
      enhed: i.enhed,
      senesteVaerdi: s?.vaerdi ?? null,
      senesteDato: s?.dato ?? null,
      senesteAar: s?.aar ?? null,
    };
  });
}

export type RapportForTiltag = {
  id: string;
  dato: string;
  statusImplementering: string | null;
  barrierer: string | null;
  naesteSkrid: string | null;
  effektRealiseret: string | null;
  tovholderNavn: string;
};

/** Tovholder-rapporter for tiltaget, nyeste først, med tovholderens navn. */
export async function getRapporterForTiltag(tiltagId: string): Promise<RapportForTiltag[]> {
  return db
    .select({
      id: tovholderRapport.id,
      dato: tovholderRapport.dato,
      statusImplementering: tovholderRapport.statusImplementering,
      barrierer: tovholderRapport.barrierer,
      naesteSkrid: tovholderRapport.naesteSkrid,
      effektRealiseret: tovholderRapport.effektRealiseret,
      tovholderNavn: tovholder.navn,
    })
    .from(tovholderRapport)
    .innerJoin(tovholder, eq(tovholderRapport.tovholderId, tovholder.id))
    .where(eq(tovholderRapport.tiltagId, tiltagId))
    .orderBy(desc(tovholderRapport.dato));
}

export type LaeringForTiltag = {
  id: string;
  observation: string;
  fortolkning: string | null;
  beslutning: string;
  beslutningstager: string | null;
  dato: string;
};

/** Læringsposter knyttet specifikt til dette tiltag (polymorf type='tiltag'). */
export async function getLaeringsposterForTiltag(kommuneId: string, tiltagId: string): Promise<LaeringForTiltag[]> {
  return db
    .select({
      id: laeringspost.id,
      observation: laeringspost.observation,
      fortolkning: laeringspost.fortolkning,
      beslutning: laeringspost.beslutning,
      beslutningstager: laeringspost.beslutningstager,
      dato: laeringspost.dato,
    })
    .from(laeringspost)
    .where(and(
      eq(laeringspost.kommuneId, kommuneId),
      eq(laeringspost.knyttetTilType, 'tiltag'),
      eq(laeringspost.knyttetTilId, tiltagId),
    ))
    .orderBy(desc(laeringspost.dato), desc(laeringspost.createdAt));
}
