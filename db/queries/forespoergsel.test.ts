import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbSelect = vi.fn();
vi.mock('@/db', () => ({ db: { select: (...a: unknown[]) => dbSelect(...a) } }));
vi.mock('@/db/schema', () => ({
  forespoergsel: {}, tiltag: {}, tovholder: {}, tovholderTiltag: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), asc: vi.fn(),
}));

import {
  getAabneForespoergslerForTovholder,
  getForespoergslerForTiltag,
  getTovholdereForTiltag,
} from './forespoergsel';

beforeEach(() => vi.clearAllMocks());

function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (res: (v: unknown) => void) => res(rows);
  return chain;
}

describe('getAabneForespoergslerForTovholder', () => {
  it('returnerer åbne forespørgsler med tiltag-titel', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'f1', tiltagId: 't1', tiltagTitel: 'El-busser', spoergsmaal: 'Hvor langt?', sendtAt: '2026-06-01T00:00:00Z' },
    ]));
    const result = await getAabneForespoergslerForTovholder('th1');
    expect(result).toEqual([
      { id: 'f1', tiltagId: 't1', tiltagTitel: 'El-busser', spoergsmaal: 'Hvor langt?', sendtAt: '2026-06-01T00:00:00Z' },
    ]);
  });
});

describe('getForespoergslerForTiltag', () => {
  it('returnerer forespørgsler for et tiltag (nyeste først)', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'f2', status: 'sendt', sendtAt: '2026-06-05T00:00:00Z', besvaretAt: null },
      { id: 'f1', status: 'besvaret', sendtAt: '2026-05-01T00:00:00Z', besvaretAt: '2026-05-03T00:00:00Z' },
    ]));
    const result = await getForespoergslerForTiltag('t1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('f2');
  });
});

describe('getTovholdereForTiltag', () => {
  it('returnerer tovholdere knyttet til et tiltag', async () => {
    dbSelect.mockReturnValueOnce(mockChain([
      { id: 'th1', navn: 'Anna', email: 'anna@x.dk' },
    ]));
    const result = await getTovholdereForTiltag('t1');
    expect(result).toEqual([{ id: 'th1', navn: 'Anna', email: 'anna@x.dk' }]);
  });
});
