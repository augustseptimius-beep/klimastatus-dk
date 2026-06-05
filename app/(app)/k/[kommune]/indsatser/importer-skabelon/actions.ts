'use server';

import * as XLSX from 'xlsx';
import { requireKommuneContext } from '@/lib/kommune-context';
import { parseHandlingskatalog, type ParseResultat } from '@/lib/import/parse-handlingskatalog';

export type SkabelonPreview = ParseResultat & { fejl?: string };

/** Læser en udfyldt Excel/CSV-skabelon og returnerer en forhåndsvisning (ingen DB-skrivning). */
export async function parseSkabelonAction(slug: string, formData: FormData): Promise<SkabelonPreview> {
  await requireKommuneContext(slug); // auth-guard — kaster hvis ikke autoriseret

  const file = formData.get('file') as File | null;
  if (!file) return { indsatser: [], advarsler: [], fejl: 'Ingen fil modtaget' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    return { indsatser: [], advarsler: [], fejl: `Filtype .${ext} understøttes ikke — brug CSV, XLSX eller XLS` };
  }

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { indsatser: [], advarsler: [], fejl: 'Filen indeholder ingen ark' };
    const raekker = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
    return parseHandlingskatalog(raekker);
  } catch (e: unknown) {
    return { indsatser: [], advarsler: [], fejl: `Kunne ikke læse filen: ${e instanceof Error ? e.message : e}` };
  }
}
