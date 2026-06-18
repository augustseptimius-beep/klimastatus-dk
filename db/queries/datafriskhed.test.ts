import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/datafriskhed/motor', async (orig) => {
  const actual = await orig<typeof import('@/lib/datafriskhed/motor')>();
  return {
    ...actual,
    beregnIndsigter: vi.fn(() => [{ type: 'emissionsdata', niveau: 'forældet', besked: 'x' }]),
  };
});

// Db-mock: chain er både await-bar (returnerer []) og viderechain-bar.
// - select().from().innerJoin().where() — awaited som [] (aktive + reduktionsMaal)
// - select().from().where().orderBy().limit(1) — limit() returnerer Promise.resolve([])
vi.mock('@/db', () => {
  // Et chain-objekt der er thenable (await giver []) og har alle metoder der returnerer sig selv,
  // undtagen limit() der eksplicit returnerer et nyt Promise.
  const makeChain = (): any => {
    const c: any = {
      then: (resolve: (v: any[]) => void) => Promise.resolve([]).then(resolve),
      select: () => makeChain(),
      from: () => makeChain(),
      innerJoin: () => makeChain(),
      leftJoin: () => makeChain(),
      where: () => makeChain(),
      orderBy: () => makeChain(),
      limit: () => Promise.resolve([]),
    };
    return c;
  };
  const chain = makeChain();
  return {
    db: {
      ...chain,
      query: {
        kommune: {
          findFirst: vi.fn(() =>
            Promise.resolve({ id: 'k1', indhentningsKadence: 'aarlig' }),
          ),
        },
      },
    },
  };
});

describe('getDatafriskhed', () => {
  it('kalder motoren og returnerer indsigter som array', async () => {
    const { getDatafriskhed } = await import('./datafriskhed');
    const out = await getDatafriskhed('k1', new Date('2026-06-17'));
    expect(Array.isArray(out)).toBe(true);
  });

  it('returnerer tom array for ukendt kommune', async () => {
    const { db } = await import('@/db');
    (db.query.kommune.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const { getDatafriskhed } = await import('./datafriskhed');
    const out = await getDatafriskhed('ukendt', new Date('2026-06-17'));
    expect(out).toEqual([]);
  });
});
