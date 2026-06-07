import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { byggSkabelonCsv } from './handlingskatalog-skabelon';
import { parseHandlingskatalog } from './parse-handlingskatalog';

/**
 * Integrationstest for HELE upload-stien: download-skabelon → xlsx-parsing → parser.
 *
 * Unit-testene for parseren sender Record-objekter direkte og springer dermed
 * xlsx-grænsen over. Denne test dækker det reelle hul: at BOM'en (som download-
 * ruten tilføjer for Excels æøå-kompatibilitet) bliver strippet korrekt af xlsx,
 * så den første header-nøgle ("Indsatsområde") stadig matcher HEADER_ALIAS.
 * Hvis BOM'en overlevede ind i nøglen, ville HVER række blive sprunget over.
 */
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

function lasSomServerAction(csvMedBom: string) {
  const buffer = new TextEncoder().encode(csvMedBom).buffer;
  return parseHandlingskatalog(parseCsvBuffer(buffer));
}

describe('skabelon round-trip: download → xlsx → parse', () => {
  it('strejf BOM: første header-nøgle matcher trods BOM-præfiks', () => {
    const csv = '﻿' + 'Indsatsområde,Indsats-type,Sektor,Indsats-beskrivelse,Tiltag-titel,Tiltag-type,Tiltag-status,Tiltag-beskrivelse\n'
      + 'Energi,Drivhusgasreduktion,Energi,,Solceller,Reduktion,Planlagt,';
    const res = lasSomServerAction(csv);
    // Hvis BOM'en ikke blev strippet, ville indsatsområde-kolonnen ikke matche
    // og rækken ville blive sprunget over med en advarsel.
    expect(res.advarsler).toHaveLength(0);
    expect(res.indsatser).toHaveLength(1);
    expect(res.indsatser[0].navn).toBe('Energi');
  });

  it('den downloadede skabelons eksempel-rækker parser til 1 indsats med 2 handlinger', () => {
    const csv = '﻿' + byggSkabelonCsv();
    const res = lasSomServerAction(csv);
    expect(res.advarsler).toHaveLength(0);
    expect(res.indsatser).toHaveLength(1);
    expect(res.indsatser[0].navn).toBe('Energirenovering af kommunale bygninger');
    expect(res.indsatser[0].handlinger).toHaveLength(2);
  });

  it('semikolon-delimiter (dansk Excel) parses korrekt med æøå bevaret', () => {
    const csv = 'Indsatsområde;Indsats-type;Sektor;Indsats-beskrivelse;Tiltag-titel;Tiltag-type;Tiltag-status;Tiltag-beskrivelse\n'
      + 'Energirenovering af kommunale bygninger;Drivhusgasreduktion;Bygninger;Reduktion af energiforbrug;3% energioptimering om året;Reduktion;Igangværende;\n'
      + 'Energirenovering af kommunale bygninger;Drivhusgasreduktion;Bygninger;;Solceller på kommunale tage;Reduktion;Planlagt;Undersøge potentialer';
    const res = lasSomServerAction(csv);
    expect(res.advarsler).toHaveLength(0);
    expect(res.indsatser).toHaveLength(1);
    expect(res.indsatser[0].navn).toBe('Energirenovering af kommunale bygninger');
    expect(res.indsatser[0].handlinger).toHaveLength(2);
  });

  it('udfyldt skabelon med æøå-værdier grupperer flere indsatsområder korrekt', () => {
    const csv = '﻿' + 'Indsatsområde,Indsats-type,Sektor,Indsats-beskrivelse,Tiltag-titel,Tiltag-type,Tiltag-status,Tiltag-beskrivelse\n'
      + 'Energi,Drivhusgasreduktion,Energi,,Solceller,Reduktion,Planlagt,\n'
      + 'Energi,Drivhusgasreduktion,Energi,,Varmepumper,Reduktion,Igangværende,\n'
      + 'Tilpasning,Klimatilpasning,Klimatilpasning,,Regnvandsbede,Tilpasning,Planlagt,';
    const res = lasSomServerAction(csv);
    expect(res.advarsler).toHaveLength(0);
    expect(res.indsatser).toHaveLength(2);
    expect(res.indsatser[0].handlinger).toHaveLength(2);
    expect(res.indsatser[1].handlinger).toHaveLength(1);
  });
});
