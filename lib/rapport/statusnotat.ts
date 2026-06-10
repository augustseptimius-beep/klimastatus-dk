// Samler alle data til statusnotatet — deles af HTML-siden og DOCX-eksporten,
// så de to formater aldrig viser forskellige tal.
import { db } from '@/db';
import { kommuneIndikator, indikatorTemplate, indikatorMaaling, tiltagEffekt } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getAllIndsatsOmraader, getAllTovholdere } from '@/db/queries';
import { getAllTiltag, getCo2SumForTiltag } from '@/db/queries/tiltag';
import { getUfuldstaendigeReduktionsMaal, getReduktionsMaal, type ReduktionsMaal } from '@/db/queries/maal';
import { getLatestRapporterForTovholder } from '@/db/queries/rapport';
import { getBarriereInbox, getLaeringsposter, type BarriereRapport } from '@/db/queries/laeringspost';
import { beslutningLabel, type LaeringsBeslutning } from '@/lib/merl/laeringspost-types';

export type StatusFordeling = {
  planned: number;
  in_progress: number;
  completed: number;
  discontinued: number;
};

export function beregnStatusFordeling(statuses: string[]): StatusFordeling {
  const f: StatusFordeling = { planned: 0, in_progress: 0, completed: 0, discontinued: 0 };
  for (const s of statuses) {
    if (s in f) f[s as keyof StatusFordeling]++;
  }
  return f;
}

export type IndsatsStatusRow = {
  id: string;
  navn: string;
  fordeling: StatusFordeling;
  antalAktive: number;
  co2SumTon: number;
  tiltagUdenEffekt: number;
};

export type KpiRow = {
  titel: string;
  vaerdi: number;
  enhed: string | null;
  aar: number;
};

export type BeslutningRow = {
  dato: string;
  observation: string;
  beslutning: string;
};

export type StatusnotatData = {
  genereret: Date;
  indsatser: IndsatsStatusRow[];
  totaler: {
    antalAktive: number;
    fordeling: StatusFordeling;
    co2SumTon: number;
    tiltagUdenEffekt: number;
  };
  tovholderRunde: { aktive: number; harSvaret: number };
  kpi: KpiRow[];
  barrierer: BarriereRapport[];
  antalBarrierer: number;
  beslutninger: BeslutningRow[];
  ufuldstaendigeMaalAntal: number;
  reduktionsMaal: ReduktionsMaal | null;
};

const MAX_BARRIERER = 10;
const MAX_BESLUTNINGER = 8;

export async function hentStatusnotatData(kommuneId: string): Promise<StatusnotatData> {
  const [indsatser, alleTiltag, tovholdere, barriereInbox, laeringsposter, ufuldstaendigeMaal, reduktionsMaal] =
    await Promise.all([
      getAllIndsatsOmraader(kommuneId),
      getAllTiltag(kommuneId),
      getAllTovholdere(kommuneId),
      getBarriereInbox(kommuneId),
      getLaeringsposter(kommuneId),
      getUfuldstaendigeReduktionsMaal(kommuneId),
      getReduktionsMaal(kommuneId),
    ]);

  const aktiveTiltag = alleTiltag.filter((t) => t.status !== 'discontinued');
  const aktiveIds = aktiveTiltag.map((t) => t.id);

  const [co2Sum, medEffektRows] = await Promise.all([
    getCo2SumForTiltag(aktiveIds),
    aktiveIds.length > 0
      ? db
          .selectDistinct({ tiltagId: tiltagEffekt.tiltagId })
          .from(tiltagEffekt)
          .where(inArray(tiltagEffekt.tiltagId, aktiveIds))
      : Promise.resolve([] as { tiltagId: string }[]),
  ]);
  const harEffekt = new Set(medEffektRows.map((r) => r.tiltagId));

  const indsatsRows: IndsatsStatusRow[] = indsatser.map((io) => {
    const egne = alleTiltag.filter((t) => t.indsatsOmraadeId === io.id);
    const egneAktive = egne.filter((t) => t.status !== 'discontinued');
    return {
      id: io.id,
      navn: io.navn,
      fordeling: beregnStatusFordeling(egne.map((t) => t.status)),
      antalAktive: egneAktive.length,
      co2SumTon: egneAktive.reduce((sum, t) => sum + (co2Sum.get(t.id) ?? 0), 0),
      tiltagUdenEffekt: egneAktive.filter((t) => !harEffekt.has(t.id)).length,
    };
  });

  // Tovholder-svar inden for de seneste 30 dage (samme definition som dashboard)
  const aktiveTovholdere = tovholdere.filter((t) => t.aktiv);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rapporter = await Promise.all(
    aktiveTovholdere.map((t) => getLatestRapporterForTovholder(t.id)),
  );
  const harSvaret = rapporter.filter((rs) => rs.some((r) => new Date(r.createdAt) > cutoff)).length;

  // Seneste måling pr. aktiv indikator
  const aktiveKI = await db
    .select({
      indikatorId: kommuneIndikator.indikatorId,
      visningsnavn: kommuneIndikator.visningsnavn,
      titel: indikatorTemplate.titel,
      enhed: indikatorTemplate.enhed,
    })
    .from(kommuneIndikator)
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(eq(kommuneIndikator.kommuneId, kommuneId), eq(kommuneIndikator.aktiv, true)));

  const kpi: KpiRow[] = [];
  for (const ki of aktiveKI) {
    const [seneste] = await db
      .select({ vaerdi: indikatorMaaling.vaerdi, aar: indikatorMaaling.aar })
      .from(indikatorMaaling)
      .where(eq(indikatorMaaling.indikatorId, ki.indikatorId))
      .orderBy(desc(indikatorMaaling.aar))
      .limit(1);
    if (seneste?.aar != null) {
      kpi.push({
        titel: ki.visningsnavn ?? ki.titel,
        vaerdi: seneste.vaerdi,
        enhed: ki.enhed,
        aar: seneste.aar,
      });
    }
  }

  return {
    genereret: new Date(),
    indsatser: indsatsRows,
    totaler: {
      antalAktive: aktiveTiltag.length,
      fordeling: beregnStatusFordeling(alleTiltag.map((t) => t.status)),
      co2SumTon: indsatsRows.reduce((sum, r) => sum + r.co2SumTon, 0),
      tiltagUdenEffekt: aktiveTiltag.filter((t) => !harEffekt.has(t.id)).length,
    },
    tovholderRunde: { aktive: aktiveTovholdere.length, harSvaret },
    kpi,
    barrierer: barriereInbox.slice(0, MAX_BARRIERER),
    antalBarrierer: barriereInbox.length,
    beslutninger: laeringsposter.slice(0, MAX_BESLUTNINGER).map((lp) => ({
      dato: lp.dato,
      observation: lp.observation,
      beslutning: beslutningLabel(lp.beslutning as LaeringsBeslutning),
    })),
    ufuldstaendigeMaalAntal: ufuldstaendigeMaal.length,
    reduktionsMaal,
  };
}
