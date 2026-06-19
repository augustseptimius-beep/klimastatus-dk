// lib/datahub/provenans.test.ts
import { describe, it, expect } from 'vitest';
import { PROVENANS_LABEL, KARAKTER_LABEL, benchmarkProcent } from './provenans';

describe('provenans-labels', () => {
  it('mapper provenance til dansk', () => {
    expect(PROVENANS_LABEL.top_down).toBe('National kontekst');
    expect(PROVENANS_LABEL.bottom_up).toBe('Lokal styring');
  });
  it('mapper karakter til dansk', () => {
    expect(KARAKTER_LABEL.aggregeret).toBe('Aggregeret');
    expect(KARAKTER_LABEL.operationel).toBe('Operationel');
  });
});

describe('benchmarkProcent', () => {
  it('beregner procent af national målværdi', () => {
    expect(benchmarkProcent(18200, 27000)).toBe(67);
  });
  it('returnerer null ved manglende data (ingen falsk procent)', () => {
    expect(benchmarkProcent(null, 27000)).toBeNull();
    expect(benchmarkProcent(100, null)).toBeNull();
  });
  it('returnerer null ved målværdi 0 (ingen division med 0)', () => {
    expect(benchmarkProcent(100, 0)).toBeNull();
  });
});
