import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbSelect = vi.fn();
vi.mock('@/db', () => ({ db: { select: (...a: unknown[]) => dbSelect(...a) } }));
vi.mock('@/db/schema', () => ({
  indikator: {}, indikatorTiltag: {}, indikatorMaaling: {},
  tovholderRapport: {}, tovholder: {}, laeringspost: {}, tiltag: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), inArray: vi.fn(),
}));

import { getIndikatorerForTiltag } from './tiltag-detalje';

beforeEach(() => vi.clearAllMocks());

function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (res: (v: unknown) => void) => res(rows);
  return chain;
}

describe('getIndikatorerForTiltag', () => {
  it('returnerer indikatorer med seneste måling-værdi', async () => {
    dbSelect
      .mockReturnValueOnce(mockChain([{ id: 'i1', niveau: 'output', beskrivelse: 'X', enhed: 'stk' }]))
      .mockReturnValueOnce(mockChain([{ indikatorId: 'i1', vaerdi: 42, dato: '2026-05-01', aar: 2026 }]));

    const result = await getIndikatorerForTiltag('t1');

    expect(result).toEqual([
      { id: 'i1', niveau: 'output', beskrivelse: 'X', enhed: 'stk', senesteVaerdi: 42, senesteDato: '2026-05-01', senesteAar: 2026 },
    ]);
  });

  it('returnerer tom liste når tiltaget ingen indikatorer har', async () => {
    dbSelect.mockReturnValueOnce(mockChain([]));
    const result = await getIndikatorerForTiltag('t1');
    expect(result).toEqual([]);
  });
});
