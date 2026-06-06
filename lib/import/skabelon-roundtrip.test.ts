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
function lasSomServerAction(csvMedBom: string) {
  const buffer = new TextEncoder().encode(csvMedBom).buffer;
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raekker = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
  return parseHandlingskatalog(raekker);
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
