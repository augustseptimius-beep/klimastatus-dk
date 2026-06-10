import { db } from '@/db';
import { indikator, indikatorTiltag, indikatorMaaling, tovholderRapport, tovholder, laeringspost, tiltag, indsatsOmraade } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCo2SumForTiltag } from './tiltag';
import { getForespoergslerForTiltag, getTovholdereForTiltag, type ForespoergselRow, type TovholderKort } from './forespoergsel';

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

export type TiltagDetalje = {
  tiltag: typeof tiltag.$inferSelect;
  indsatsomraadeNavn: string | null;
  indikatorer: IndikatorMedMaaling[];
  rapporter: RapportForTiltag[];
  laering: LaeringForTiltag[];
  effektSum: number;
  forespoergsler: ForespoergselRow[];
  tovholdere: TovholderKort[];
};

/** Alt om ét tiltag, batchet i parallel. Returnerer null hvis ikke fundet eller forkert kommune. */
export async function getTiltagDetalje(kommuneId: string, tiltagId: string): Promise<TiltagDetalje | null> {
  const [rows, indikatorer, rapporter, laering, co2Map, forespoergsler, tovholdere] = await Promise.all([
    db.select({ t: tiltag, ioNavn: indsatsOmraade.navn })
      .from(tiltag)
      .leftJoin(indsatsOmraade, eq(tiltag.indsatsOmraadeId, indsatsOmraade.id))
      .where(eq(tiltag.id, tiltagId))
      .limit(1),
    getIndikatorerForTiltag(tiltagId),
    getRapporterForTiltag(tiltagId),
    getLaeringsposterForTiltag(kommuneId, tiltagId),
    getCo2SumForTiltag([tiltagId]),
    getForespoergslerForTiltag(tiltagId),
    getTovholdereForTiltag(tiltagId),
  ]);

  const row = rows[0];
  if (!row || row.t.kommuneId !== kommuneId) return null;

  return {
    tiltag: row.t,
    indsatsomraadeNavn: row.ioNavn,
    indikatorer,
    rapporter,
    laering,
    effektSum: co2Map.get(tiltagId) ?? 0,
    forespoergsler,
    tovholdere,
  };
}
