import { describe, it, expect } from 'vitest';
import { lavMergePlan, beregnImportDiff, normaliserNavn, type EksisterendeKatalog } from './merge-katalog';
import type { ImportIndsats } from './types';

const handling = (titel: string): ImportIndsats['handlinger'][number] => ({
  titel,
  type: 'reduction',
  status: 'planned',
});

const indsats = (navn: string, titler: string[]): ImportIndsats => ({
  navn,
  type: 'ghg_reduction',
  sektor: 'energy',
  handlinger: titler.map(handling),
});

const tomtKatalog: EksisterendeKatalog = { indsatser: [], tiltagTitler: new Map() };

describe('normaliserNavn', () => {
  it('ignorerer case og overflødigt whitespace', () => {
    expect(normaliserNavn('  Vedvarende   Energi ')).toBe('vedvarende energi');
  });
});

describe('lavMergePlan', () => {
  it('opretter alt ved import til tom kommune', () => {
    const plan = lavMergePlan(tomtKatalog, [indsats('Vedvarende Energi', ['Solpark', 'Vindmøller'])]);
    expect(plan.antalNyeIndsatser).toBe(1);
    expect(plan.antalFlettedeIndsatser).toBe(0);
    expect(plan.antalNyeHandlinger).toBe(2);
    expect(plan.antalSprungetOver).toBe(0);
  });

  it('re-import af samme katalog opretter intet', () => {
    const eksisterende: EksisterendeKatalog = {
      indsatser: [{ id: 'io1', navn: 'Vedvarende Energi' }],
      tiltagTitler: new Map([['io1', ['Solpark', 'Vindmøller']]]),
    };
    const plan = lavMergePlan(eksisterende, [indsats('Vedvarende Energi', ['Solpark', 'Vindmøller'])]);
    expect(plan.antalNyeIndsatser).toBe(0);
    expect(plan.antalFlettedeIndsatser).toBe(1);
    expect(plan.antalNyeHandlinger).toBe(0);
    expect(plan.antalSprungetOver).toBe(2);
    expect(plan.indsatser[0].eksisterendeId).toBe('io1');
  });

  it('matcher indsatsnavn uafhængigt af case og whitespace', () => {
    const eksisterende: EksisterendeKatalog = {
      indsatser: [{ id: 'io1', navn: 'Vedvarende Energi' }],
      tiltagTitler: new Map([['io1', ['Solpark']]]),
    };
    const plan = lavMergePlan(eksisterende, [indsats('  vedvarende   energi', ['solpark', 'Ny handling'])]);
    expect(plan.antalNyeIndsatser).toBe(0);
    expect(plan.antalNyeHandlinger).toBe(1);
    expect(plan.indsatser[0].sprungetOver).toEqual(['solpark']);
    expect(plan.indsatser[0].nyeHandlinger.map((h) => h.titel)).toEqual(['Ny handling']);
  });

  it('fletter nye handlinger ind i eksisterende indsatsområde', () => {
    const eksisterende: EksisterendeKatalog = {
      indsatser: [{ id: 'io1', navn: 'Transport' }],
      tiltagTitler: new Map([['io1', ['Elbusser']]]),
    };
    const plan = lavMergePlan(eksisterende, [indsats('Transport', ['Elbusser', 'Ladestandere'])]);
    expect(plan.antalFlettedeIndsatser).toBe(1);
    expect(plan.antalNyeHandlinger).toBe(1);
    expect(plan.antalSprungetOver).toBe(1);
  });

  it('folder dubletter inden for samme import', () => {
    const plan = lavMergePlan(tomtKatalog, [
      indsats('Transport', ['Elbusser']),
      indsats('transport', ['Elbusser', 'Ladestandere']),
    ]);
    expect(plan.indsatser).toHaveLength(1);
    expect(plan.antalNyeIndsatser).toBe(1);
    expect(plan.antalNyeHandlinger).toBe(2);
    expect(plan.antalSprungetOver).toBe(1);
  });

  it('samme titel i to forskellige indsatsområder er ikke en dublet', () => {
    const plan = lavMergePlan(tomtKatalog, [
      indsats('Transport', ['Kampagne']),
      indsats('Energi', ['Kampagne']),
    ]);
    expect(plan.antalNyeHandlinger).toBe(2);
    expect(plan.antalSprungetOver).toBe(0);
  });
});

describe('beregnImportDiff', () => {
  it('er indeks-justeret med input og markerer eksisterende', () => {
    const eksisterende: EksisterendeKatalog = {
      indsatser: [{ id: 'io1', navn: 'Transport' }],
      tiltagTitler: new Map([['io1', ['Elbusser']]]),
    };
    const diff = beregnImportDiff(eksisterende, [
      indsats('Energi', ['Solpark']),
      indsats('transport', ['elbusser', 'Ladestandere']),
    ]);
    expect(diff.indsatser).toHaveLength(2);
    expect(diff.indsatser[0]).toEqual({ findes: false, handlingerFindes: [false] });
    expect(diff.indsatser[1]).toEqual({ findes: true, handlingerFindes: [true, false] });
  });
});
