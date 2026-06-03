import { db } from '@/db';
import { indikatorMaaling } from '@/db/schema';
import {
  getActiveKommuneIndikatorer,
  updateSidstHentet,
  updateSidsteFejl,
  type ActiveKommuneIndikator,
} from '@/db/queries/kommune-indikator';
import { ensureAarligCyklus } from '@/db/queries/monitorering';
import { sleep, withRetry } from './fetch-utils';

const DST_API_URL = 'https://api.statbank.dk/v1/data';
const RATE_LIMIT_MS = 600;
const MISSING_CODES = new Set(['', '..', '-', 'x']);

type DstApiQuery = {
  tabel: string;
  variabler: Record<string, string>;
  felt: string;
};

export function parseDstCsv(csv: string, felt: string): Record<number, number | null> {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return {};
  const headers = lines[0].split(';').map((h) => h.trim().replace(/"/g, ''));
  const feltIdx = headers.indexOf(felt);
  const tidIdx = headers.indexOf('TID');
  if (feltIdx === -1 || tidIdx === -1) return {};

  const result: Record<number, number | null> = {};
  for (const line of lines.slice(1)) {
    const cols = line.split(';').map((c) => c.trim().replace(/"/g, ''));
    const tidRaw = cols[tidIdx];
    const vaerdiRaw = cols[feltIdx];
    const aar = Number(tidRaw?.slice(0, 4));
    if (!aar) continue;
    if (MISSING_CODES.has(vaerdiRaw)) {
      result[aar] = null;
    } else {
      result[aar] = Number(vaerdiRaw.replace(',', '.'));
    }
  }
  return result;
}

async function fetchDstTable(
  kommunekode: string,
  query: DstApiQuery,
): Promise<string> {
  const payload = {
    table: query.tabel,
    format: 'CSV',
    variables: [
      ...Object.entries(query.variabler).map(([code, values]) => ({
        code,
        values: [values],
      })),
      // DST bruger kommunekoden uden ledende nul (f.eks. 657, ikke 0657)
      { code: 'OMRÅDE', values: [String(Number(kommunekode))] },
    ],
  };

  const res = await withRetry(() =>
    fetch(DST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    }),
  );
  return res.text();
}

export async function handleFetchDst(options?: {
  kommuneIndikatorId?: string;
}): Promise<void> {
  const all: ActiveKommuneIndikator[] = await getActiveKommuneIndikatorer('dst');
  const targets = options?.kommuneIndikatorId
    ? all.filter((ki) => ki.id === options.kommuneIndikatorId)
    : all;
  if (targets.length === 0) return;

  for (const ki of targets) {
    let query: DstApiQuery;
    try {
      query = JSON.parse(ki.template.apiQuery) as DstApiQuery;
    } catch {
      console.error(`[fetch-dst] Invalid apiQuery for ${ki.id}`);
      await updateSidsteFejl(ki.id, 'Invalid apiQuery JSON');
      continue;
    }

    try {
      const csv = await fetchDstTable(ki.kommune.kommunekode, query);
      const byYear = parseDstCsv(csv, query.felt);

      for (const [yearStr, vaerdi] of Object.entries(byYear)) {
        if (vaerdi === null) continue;
        const aar = Number(yearStr);
        const cyklus = await ensureAarligCyklus(ki.kommuneId, aar);
        await db.insert(indikatorMaaling).values({
          indikatorId: ki.indikatorId,
          monitoreringscyklusId: cyklus.id,
          aar,
          vaerdi,
          kilde: 'dst',
          autoHentet: true,
        }).onConflictDoUpdate({
          target: [indikatorMaaling.indikatorId, indikatorMaaling.monitoreringscyklusId],
          set: { vaerdi, kilde: 'dst' },
        });
      }
      await updateSidstHentet(ki.id, new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fetch-dst] Error for ${ki.kommune.kommunekode}: ${msg}`);
      await updateSidsteFejl(ki.id, msg);
    }

    if (targets.length > 1) await sleep(RATE_LIMIT_MS);
  }
}
