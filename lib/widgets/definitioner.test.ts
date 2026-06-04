import { describe, it, expect } from 'vitest';
import { DEFINITIONER, definitionListe } from './definitioner';

describe('DEFINITIONER', () => {
  it('indeholder de fire Fase 1-widgets', () => {
    expect(Object.keys(DEFINITIONER).sort()).toEqual(
      ['co2e-udvikling', 'klimamaal-hero', 'noegletal', 'tekstblok'],
    );
  });
  it('hver definitions type matcher dens nøgle', () => {
    for (const [key, def] of Object.entries(DEFINITIONER)) {
      expect(def.type).toBe(key);
      expect(def.tilladteBredder).toContain(def.standardBredde);
    }
  });
  it('definitionListe er et array af alle definitioner', () => {
    expect(definitionListe()).toHaveLength(4);
  });
});
