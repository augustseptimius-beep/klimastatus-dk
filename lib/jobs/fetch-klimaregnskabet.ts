import { db } from '@/db';
import { indikatorMaaling, drivhusgasregnskabPost } from '@/db/schema';
import {
  getActiveKommuneIndikatorer,
  updateSidstHentet,
  updateSidsteFejl,
  type ActiveKommuneIndikator,
} from '@/db/queries/kommune-indikator';
import { ensureAarligCyklus } from '@/db/queries/monitorering';
import { sleep, withRetry } from './fetch-utils';

const API_URL = 'https://klimaregnskabet.dk/api/municipality-data';
const RATE_LIMIT_MS = 200;

type KlimaregnskabRecord = {
  year: number;
  sector: string;
  value: number;
  unit: string;
};

export function parseSamletCo2e(data: KlimaregnskabRecord[]): Record<number, number> {
  const byYear: Record<number, number> = {};
  for (const row of data) {
    if (row.sector === 'Samlet' && row.unit === 'Ton CO2e') {
      byYear[row.year] = Math.max(byYear[row.year] ?? 0, row.value);
    }
  }
  return byYear;
}

async function fetchKlimaregnskabetForKommune(
  kommunekode: string,
  year: number,
): Promise<KlimaregnskabRecord[]> {
  // Klimaregnskabet.dk forventer koden uden ledende nul (f.eks. 657, ikke 0657)
  const url = `${API_URL}?municipality=${Number(kommunekode)}&year=${year}&type=Nøgletal`;
  const res = await withRetry(() =>
    fetch(url, {
      headers: { 'x-api-key': process.env.KLIMAREGNSKABET_API_KEY! },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    }),
  );
  const json = await res.json();
  // API returnerer danske feltnavne — map til KlimaregnskabRecord-strukturen
  return (json.data ?? []).map((r: Record<string, unknown>) => ({
    year,
    sector: r['sektor'] as string,
    value: (r['værdi'] as number) ?? 0,
    unit: (r['enhed'] as string) ?? '',
  }));
}

async function processKommuneIndikator(ki: ActiveKommuneIndikator, fromYear?: number) {
  const currentYear = new Date().getFullYear();
  const isFirstFetch = !ki.sidstHentet;
  const startYear = fromYear ?? (isFirstFetch ? currentYear - 4 : currentYear - 1);
  const years: number[] = [];
  for (let y = startYear; y <= currentYear - 1; y++) years.push(y);

  const allRecords: KlimaregnskabRecord[] = [];
  for (const year of years) {
    const records = await fetchKlimaregnskabetForKommune(ki.kommune.kommunekode, year);
    allRecords.push(...records);
    await sleep(RATE_LIMIT_MS);
  }

  const co2eByYear = parseSamletCo2e(allRecords);
  for (const [yearStr, vaerdi] of Object.entries(co2eByYear)) {
    const aar = Number(yearStr);
    const cyklus = await ensureAarligCyklus(ki.kommuneId, aar);
    await db.insert(indikatorMaaling).values({
      indikatorId: ki.indikatorId,
      monitoreringscyklusId: cyklus.id,
      aar,
      vaerdi,
      kilde: 'klimaregnskab',
      autoHentet: true,
    }).onConflictDoUpdate({
      target: [indikatorMaaling.indikatorId, indikatorMaaling.monitoreringscyklusId],
      set: { vaerdi, kilde: 'klimaregnskab' },
    });
  }

  // Write sector breakdown to drivhusgasregnskabPost
  const sectorByYear: Record<number, KlimaregnskabRecord[]> = {};
  for (const row of allRecords) {
    if (!sectorByYear[row.year]) sectorByYear[row.year] = [];
    sectorByYear[row.year].push(row);
  }
  for (const [yearStr, rows] of Object.entries(sectorByYear)) {
    const aar = Number(yearStr);
    for (const row of rows) {
      await db.insert(drivhusgasregnskabPost).values({
        kommuneId: ki.kommuneId,
        aar,
        gpcSektor: row.sector,
        udledningTonCo2e: row.value,
        datakilde: 'klimaregnskab',
        gpcKompatibel: true,
      }).onConflictDoNothing();
    }
  }

  await updateSidstHentet(ki.id, new Date());
}

export async function handleFetchKlimaregnskabet(options?: {
  kommuneIndikatorId?: string;
  fromYear?: number;
}): Promise<void> {
  let targets: ActiveKommuneIndikator[];
  if (options?.kommuneIndikatorId) {
    const all = await getActiveKommuneIndikatorer('klimaregnskab');
    targets = all.filter((k) => k.id === options.kommuneIndikatorId);
    if (targets.length === 0) {
      console.error(`[fetch-klimaregnskabet] kommuneIndikator not active: ${options.kommuneIndikatorId}`);
      return;
    }
  } else {
    targets = await getActiveKommuneIndikatorer('klimaregnskab');
  }

  for (const ki of targets) {
    try {
      await processKommuneIndikator(ki, options?.fromYear);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-klimaregnskabet] Error for ${ki.kommune.kommunekode}: ${msg}`);
      await updateSidsteFejl(ki.id, msg);
    }
    if (targets.length > 1) await sleep(RATE_LIMIT_MS);
  }
}
