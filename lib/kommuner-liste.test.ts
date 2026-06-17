import { describe, it, expect } from 'vitest';
import { ALLE_KOMMUNER, findKommune } from './kommuner-liste';
import { KOMMUNETYPER } from './kataloger/kommunetype';

describe('ALLE_KOMMUNER', () => {
  it('indeholder alle 98 kommuner', () => {
    expect(ALLE_KOMMUNER).toHaveLength(98);
  });

  it('inkluderer Morsø (773)', () => {
    expect(findKommune('773')?.navn).toBe('Morsø');
  });

  it('har en gyldig kommunetype på hver kommune', () => {
    for (const k of ALLE_KOMMUNER) {
      expect(KOMMUNETYPER).toContain(k.type);
    }
  });

  it('har korrekt typefordeling (31/24/16/3/24)', () => {
    const count = (t: string) => ALLE_KOMMUNER.filter((k) => k.type === t).length;
    expect(count('land')).toBe(31);
    expect(count('oplands')).toBe(24);
    expect(count('provinsby')).toBe(16);
    expect(count('storby')).toBe(3);
    expect(count('hovedstad')).toBe(24);
  });
});
