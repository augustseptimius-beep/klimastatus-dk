import { db } from '@/db';
import { indikatorMaaling } from '@/db/schema';
import {
  getActiveKommuneIndikatorer,
  updateSidstHentet,
  updateSidsteFejl,
  type ActiveKommuneIndikator,
} from '@/db/queries/kommune-indikator';
import { ensureAarligCyklus } from '@/db/queries/monitorering';
import { withRetry } from './fetch-utils';

const API_URL =
  'https://api.energidataservice.dk/dataset/CapacityPerMunicipality?limit=0&sort=Month%20desc';

type EdsRecord = {
  MunicipalityNo: number;
  Month: string;
  OnshoreWindMW: number;
  SolarPowerMW: number;
};

export function getLatestByMunicipality(
  records: EdsRecord[],
): Record<number, EdsRecord> {
  const latest: Record<number, EdsRecord> = {};
  for (const row of records) {
    const existing = latest[row.MunicipalityNo];
    if (!existing || row.Month > existing.Month) {
      latest[row.MunicipalityNo] = row;
    }
  }
  return latest;
}

export async function handleFetchEnergidataservice(options?: {
  kommuneIndikatorId?: string;
}): Promise<void> {
  const targets: ActiveKommuneIndikator[] = await getActiveKommuneIndikatorer('energidataservice');
  if (targets.length === 0) return;

  const filtered = options?.kommuneIndikatorId
    ? targets.filter((ki) => ki.id === options.kommuneIndikatorId)
    : targets;
  if (filtered.length === 0) return;

  let records: EdsRecord[];
  try {
    const res = await withRetry(() =>
      fetch(API_URL).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }),
    );
    const json = await res.json();
    records = json.records ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fetch-energidataservice] Failed to fetch: ${msg}`);
    for (const ki of filtered) await updateSidsteFejl(ki.id, msg);
    return;
  }

  const latestByMunicipalityNo = getLatestByMunicipality(records);

  for (const ki of filtered) {
    const kommunekode = Number(ki.kommune.kommunekode);
    const latest = latestByMunicipalityNo[kommunekode];
    if (!latest) {
      console.warn(`[fetch-energidataservice] No data for kommunekode ${kommunekode}`);
      continue;
    }
    const aar = Number(latest.Month.slice(0, 4));
    const totalMW = latest.OnshoreWindMW + latest.SolarPowerMW;

    try {
      const cyklus = await ensureAarligCyklus(ki.kommuneId, aar);
      await db.insert(indikatorMaaling).values({
        indikatorId: ki.indikatorId,
        monitoreringscyklusId: cyklus.id,
        aar,
        vaerdi: totalMW,
        kilde: 'energidataservice',
        autoHentet: true,
      }).onConflictDoUpdate({
        target: [indikatorMaaling.indikatorId, indikatorMaaling.monitoreringscyklusId],
        set: { vaerdi: totalMW, kilde: 'energidataservice' },
      });
      await updateSidstHentet(ki.id, new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-energidataservice] Error for ${kommunekode}: ${msg}`);
      await updateSidsteFejl(ki.id, msg);
    }
  }
}
