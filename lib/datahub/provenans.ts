// lib/datahub/provenans.ts
// Datahub-provenance: gør lokal-styring vs national-kontekst læsbar. Ren logik.

export type DataProvenans = 'top_down' | 'bottom_up';
export type DataKarakter = 'aggregeret' | 'operationel';

export const PROVENANS_LABEL: Record<DataProvenans, string> = {
  top_down: 'National kontekst',
  bottom_up: 'Lokal styring',
};

export const KARAKTER_LABEL: Record<DataKarakter, string> = {
  aggregeret: 'Aggregeret',
  operationel: 'Operationel',
};

/** Kommunens værdi som procent af national målværdi. Null ved manglende/0-data (ingen falsk procent). */
export function benchmarkProcent(vaerdi: number | null, maalvaerdi: number | null): number | null {
  if (vaerdi == null || maalvaerdi == null || maalvaerdi === 0) return null;
  return Math.round((vaerdi / maalvaerdi) * 100);
}
