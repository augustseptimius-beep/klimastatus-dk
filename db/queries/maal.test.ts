import { describe, it, expect, vi, beforeEach } from 'vitest';

const where = vi.fn();
const orderBy = vi.fn();
const innerJoin = vi.fn(() => ({ where }));
const from = vi.fn(() => ({ innerJoin }));
const select = vi.fn(() => ({ from }));

vi.mock('@/db', () => ({ db: { select: (...a: unknown[]) => select(...a) } }));

import { getReduktionsMaal } from './maal';

beforeEach(() => {
  vi.clearAllMocks();
  where.mockReturnValue({ orderBy });
});

describe('getReduktionsMaal', () => {
  it('returnerer det første mål med komplette baseline/mål-felter', async () => {
    orderBy.mockResolvedValueOnce([
      { maalAar: 2030, maalVaerdi: 225000, baselineAar: 2018, baselineVaerdi: 750000, enhed: 'ton CO₂e/år' },
    ]);
    const result = await getReduktionsMaal('k1');
    expect(result).toEqual({
      maalAar: 2030, maalVaerdi: 225000, baselineAar: 2018, baselineVaerdi: 750000, enhed: 'ton CO₂e/år',
    });
  });

  it('returnerer null når intet mål har komplette felter', async () => {
    orderBy.mockResolvedValueOnce([
      { maalAar: null, maalVaerdi: null, baselineAar: null, baselineVaerdi: null, enhed: null },
    ]);
    const result = await getReduktionsMaal('k1');
    expect(result).toBeNull();
  });

  it('returnerer null når ingen mål findes', async () => {
    orderBy.mockResolvedValueOnce([]);
    expect(await getReduktionsMaal('k1')).toBeNull();
  });
});
