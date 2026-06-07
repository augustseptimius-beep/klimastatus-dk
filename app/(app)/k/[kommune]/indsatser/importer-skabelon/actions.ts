'use server';

import * as XLSX from 'xlsx';
import { requireKommuneContext } from '@/lib/kommune-context';
import { parseHandlingskatalog, type ParseResultat } from '@/lib/import/parse-handlingskatalog';

export type SkabelonPreview = ParseResultat & { fejl?: string };

/** Parser en CSV-buffer med UTF-8 TextDecoder — undgår XLSX's encoding-problemer med æøå. */
function parseCsvBuffer(buffer: ArrayBuffer): Record<string, string>[] {
  const text = new TextDecoder('utf-8').decode(buffer).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] ?? '';
  const sep = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  const headers = firstLine.split(sep).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const vals = line.split(sep);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (vals[j] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

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
    let raekker: Record<string, string>[];

    if (ext === 'csv') {
      // Brug TextDecoder direkte — XLSX misfortolker UTF-8 æøå uden BOM
      raekker = parseCsvBuffer(buffer);
    } else {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) return { indsatser: [], advarsler: [], fejl: 'Filen indeholder ingen ark' };
      raekker = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
    }

    return parseHandlingskatalog(raekker);
  } catch (e: unknown) {
    return { indsatser: [], advarsler: [], fejl: `Kunne ikke læse filen: ${e instanceof Error ? e.message : e}` };
  }
}
