import { describe, it, expect } from 'vitest';
import {
  normaliserHeader,
  INDSATS_TYPE_ALIAS,
  SEKTOR_ALIAS,
  TILTAG_TYPE_ALIAS,
  TILTAG_STATUS_ALIAS,
  byggSkabelonCsv,
  SKABELON_KOLONNER,
} from './handlingskatalog-skabelon';

describe('normaliserHeader', () => {
  it('genkender danske overskrifter uanset store/små bogstaver og mellemrum', () => {
    expect(normaliserHeader('Indsatsområde')).toBe('indsatsomraade');
    expect(normaliserHeader('  TILTAG-TITEL ')).toBe('tiltag_titel');
    expect(normaliserHeader('Status')).toBe('tiltag_status');
    expect(normaliserHeader('Sektor')).toBe('sektor');
  });
  it('returnerer null for ukendte overskrifter', () => {
    expect(normaliserHeader('Pris i kroner')).toBeNull();
  });
});

describe('enum-aliaser', () => {
  it('oversætter danske labels til enum-værdier', () => {
    expect(INDSATS_TYPE_ALIAS['drivhusgasreduktion']).toBe('ghg_reduction');
    expect(SEKTOR_ALIAS['bygninger']).toBe('buildings');
    expect(TILTAG_TYPE_ALIAS['reduktion']).toBe('reduction');
    expect(TILTAG_STATUS_ALIAS['igangværende']).toBe('in_progress');
  });
  it('accepterer også de rå enum-værdier', () => {
    expect(TILTAG_STATUS_ALIAS['completed']).toBe('completed');
    expect(SEKTOR_ALIAS['energy']).toBe('energy');
  });
});

describe('byggSkabelonCsv', () => {
  it('starter med overskriftsrækken i defineret rækkefølge', () => {
    const csv = byggSkabelonCsv();
    const førsteLinje = csv.split('\n')[0];
    expect(førsteLinje).toBe(SKABELON_KOLONNER.map((k) => k.overskrift).join(','));
  });
  it('indeholder mindst én eksempel-række', () => {
    expect(byggSkabelonCsv().split('\n').length).toBeGreaterThanOrEqual(2);
  });
});
