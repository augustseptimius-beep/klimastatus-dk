import { describe, it, expect } from 'vitest';
import { KOMMUNETYPER, KOMMUNETYPE_LABEL } from './kommunetype';

describe('kommunetype', () => {
  it('har præcis de 5 Danmarks-Statistik-typer', () => {
    expect([...KOMMUNETYPER]).toEqual(['land', 'oplands', 'provinsby', 'storby', 'hovedstad']);
  });

  it('har en dansk label for hver type', () => {
    for (const t of KOMMUNETYPER) {
      expect(KOMMUNETYPE_LABEL[t]).toBeTruthy();
    }
  });
});
