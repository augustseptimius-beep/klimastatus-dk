// Tests for datakomplethed-queries: effekt-skøn på tiltag og ufuldstændige mål.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Resultater til .where()-kald, i kaldsrækkefølge.
const whereResults: unknown[] = [];
const makeChain = () => {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => whereResults.shift());
  return chain;
};
const selectDistinct = vi.fn(() => makeChain());

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => makeChain()),
    selectDistinct: (...a: unknown[]) => selectDistinct(...(a as [])),
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), asc: vi.fn(), and: vi.fn(), desc: vi.fn(), sql: vi.fn(), inArray: vi.fn(),
}));
vi.mock('@/db/schema', () => ({
  tiltag: {}, tovholderTiltag: {}, tiltagEffekt: {}, maal: {}, indsatsOmraade: {},
}));

beforeEach(() => {
  whereResults.length = 0;
});

describe('getEffektKomplethed', () => {
  it('tæller aktive tiltag uden effekt-skøn (udgåede ignoreres)', async () => {
    whereResults.push([
      { id: 't1', status: 'planned' },
      { id: 't2', status: 'in_progress' },
      { id: 't3', status: 'completed' },
      { id: 't4', status: 'discontinued' },
    ]);
    whereResults.push([{ tiltagId: 't1' }]);
    const { getEffektKomplethed } = await import('./tiltag');
    const result = await getEffektKomplethed('k1');
    expect(result).toEqual({ aktiveTiltag: 3, tiltagUdenEffekt: 2 });
  });

  it('returnerer 0/0 for kommune uden tiltag', async () => {
    whereResults.push([]);
    const { getEffektKomplethed } = await import('./tiltag');
    const result = await getEffektKomplethed('k1');
    expect(result).toEqual({ aktiveTiltag: 0, tiltagUdenEffekt: 0 });
  });
});

describe('getUfuldstaendigeReduktionsMaal', () => {
  it('returnerer tom liste når alle mål er komplette', async () => {
    whereResults.push([
      { id: 'm1', beskrivelse: '70% reduktion', maalAar: 2030, maalVaerdi: 225000, baselineAar: 2018, baselineVaerdi: 750000 },
    ]);
    const { getUfuldstaendigeReduktionsMaal } = await import('./maal');
    expect(await getUfuldstaendigeReduktionsMaal('k1')).toEqual([]);
  });

  it('lister mål med manglende felter og navngiver hullerne', async () => {
    whereResults.push([
      { id: 'm1', beskrivelse: 'Mangler baseline', maalAar: 2030, maalVaerdi: 225000, baselineAar: null, baselineVaerdi: null },
      { id: 'm2', beskrivelse: 'Komplet', maalAar: 2030, maalVaerdi: 1, baselineAar: 2018, baselineVaerdi: 2 },
    ]);
    const { getUfuldstaendigeReduktionsMaal } = await import('./maal');
    const result = await getUfuldstaendigeReduktionsMaal('k1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
    expect(result[0].mangler).toEqual(['baselineværdi', 'baselineår']);
  });
});
