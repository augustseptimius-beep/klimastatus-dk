import { db } from '@/db';
import {
  tiltag,
  indsatsOmraade,
  indikatorMaaling,
  kommuneIndikator,
  indikatorTemplate,
  tovholderRapport,
} from '@/db/schema';
import { eq, and, asc, desc, ne, inArray } from 'drizzle-orm';

export type Co2eDataPoint = { aar: number | null; vaerdi: number };

export type PublicHighlight = {
  kommuneIndikatorId: string;
  label: string;
  enhed: string;
  senesteAar: number | null;
  senesteVaerdi: number | null;
};

export type StagnertTiltag = {
  id: string;
  titel: string;
  indsatsOmraadeId: string;
};

export type TiltagStatusOversigt = {
  planned: number;
  in_progress: number;
  completed: number;
  stagneret: number;
};

export type IndsatsomraadeMedCount = {
  id: string;
  navn: string;
  sektor: string;
  type: string;
  aktiveTiltagCount: number;
};

export type ActiveKommuneIndikatorOption = {
  id: string;
  label: string;
  enhed: string;
};

/** Ren funktion — kan testes uden DB-mock. */
export function filterStagnerede(
  igangvaerende: StagnertTiltag[],
  latestRapportByTiltagId: Map<string, Date>,
  cutoff: Date,
): StagnertTiltag[] {
  return igangvaerende.filter((t) => {
    const latest = latestRapportByTiltagId.get(t.id);
    return !latest || latest < cutoff;
  });
}

export async function getCo2eSeries(kommuneId: string): Promise<Co2eDataPoint[]> {
  return db
    .select({ aar: indikatorMaaling.aar, vaerdi: indikatorMaaling.vaerdi })
    .from(indikatorMaaling)
    .innerJoin(kommuneIndikator, eq(indikatorMaaling.indikatorId, kommuneIndikator.indikatorId))
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(
      and(
        eq(kommuneIndikator.kommuneId, kommuneId),
        eq(kommuneIndikator.aktiv, true),
        eq(indikatorTemplate.kilde, 'klimaregnskab'),
      ),
    )
    .orderBy(asc(indikatorMaaling.aar));
}

export async function getPublicHighlights(
  kommuneId: string,
  highlightIds: string[],
): Promise<PublicHighlight[]> {
  if (highlightIds.length === 0) return [];

  const rows = await db
    .select({
      kiId: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      titel: indikatorTemplate.titel,
      enhed: indikatorTemplate.enhed,
      indikatorId: kommuneIndikator.indikatorId,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(
      and(
        eq(kommuneIndikator.kommuneId, kommuneId),
        inArray(kommuneIndikator.id, highlightIds),
      ),
    );

  return Promise.all(
    rows.map(async (row) => {
      const [latest] = await db
        .select({ aar: indikatorMaaling.aar, vaerdi: indikatorMaaling.vaerdi })
        .from(indikatorMaaling)
        .where(eq(indikatorMaaling.indikatorId, row.indikatorId))
        .orderBy(desc(indikatorMaaling.aar))
        .limit(1);

      return {
        kommuneIndikatorId: row.kiId,
        label: row.visningsnavn ?? row.titel,
        enhed: row.enhed,
        senesteAar: latest?.aar ?? null,
        senesteVaerdi: latest?.vaerdi != null && Number.isFinite(latest.vaerdi) ? latest.vaerdi : null,
      };
    }),
  );
}

export async function getStagnerteTiltag(
  kommuneId: string,
  staleDays: number,
): Promise<StagnertTiltag[]> {
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const igangvaerende = await db
    .select({ id: tiltag.id, titel: tiltag.titel, indsatsOmraadeId: tiltag.indsatsOmraadeId })
    .from(tiltag)
    .where(and(eq(tiltag.kommuneId, kommuneId), eq(tiltag.status, 'in_progress')));

  if (igangvaerende.length === 0) return [];

  const tiltagIds = igangvaerende.map((t) => t.id);
  const rapporter = await db
    .select({ tiltagId: tovholderRapport.tiltagId, createdAt: tovholderRapport.createdAt })
    .from(tovholderRapport)
    .where(inArray(tovholderRapport.tiltagId, tiltagIds));

  const latestByTiltag = new Map<string, Date>();
  for (const r of rapporter) {
    const ts = new Date(r.createdAt);
    const existing = latestByTiltag.get(r.tiltagId);
    if (!existing || ts > existing) latestByTiltag.set(r.tiltagId, ts);
  }

  return filterStagnerede(igangvaerende, latestByTiltag, cutoff);
}

export async function getTiltagStatusOversigt(
  kommuneId: string,
  staleDays: number,
): Promise<TiltagStatusOversigt> {
  const alleTiltag = await db
    .select({ id: tiltag.id, status: tiltag.status })
    .from(tiltag)
    .where(and(eq(tiltag.kommuneId, kommuneId), ne(tiltag.status, 'discontinued')));

  const stagnerede = await getStagnerteTiltag(kommuneId, staleDays);
  const stagneredeIds = new Set(stagnerede.map((t) => t.id));

  const oversigt: TiltagStatusOversigt = { planned: 0, in_progress: 0, completed: 0, stagneret: 0 };
  for (const t of alleTiltag) {
    if (t.status === 'in_progress' && stagneredeIds.has(t.id)) oversigt.stagneret++;
    else if (t.status === 'planned') oversigt.planned++;
    else if (t.status === 'in_progress') oversigt.in_progress++;
    else if (t.status === 'completed') oversigt.completed++;
  }
  return oversigt;
}

export async function getIndsatsomraaderMedTiltagCount(
  kommuneId: string,
): Promise<IndsatsomraadeMedCount[]> {
  const indsatser = await db
    .select({
      id: indsatsOmraade.id,
      navn: indsatsOmraade.navn,
      sektor: indsatsOmraade.sektor,
      type: indsatsOmraade.type,
    })
    .from(indsatsOmraade)
    .where(and(eq(indsatsOmraade.kommuneId, kommuneId), eq(indsatsOmraade.aktiv, true)))
    .orderBy(asc(indsatsOmraade.navn));

  return Promise.all(
    indsatser.map(async (io) => {
      const rows = await db
        .select({ id: tiltag.id })
        .from(tiltag)
        .where(and(eq(tiltag.indsatsOmraadeId, io.id), ne(tiltag.status, 'discontinued')));
      return { ...io, aktiveTiltagCount: rows.length };
    }),
  );
}

export async function getAktiveKommuneIndikatorer(
  kommuneId: string,
): Promise<ActiveKommuneIndikatorOption[]> {
  const rows = await db
    .select({
      id: kommuneIndikator.id,
      visningsnavn: kommuneIndikator.visningsnavn,
      titel: indikatorTemplate.titel,
      enhed: indikatorTemplate.enhed,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(eq(kommuneIndikator.kommuneId, kommuneId), eq(kommuneIndikator.aktiv, true)))
    .orderBy(asc(indikatorTemplate.titel));

  return rows.map((r) => ({ id: r.id, label: r.visningsnavn ?? r.titel, enhed: r.enhed }));
}
