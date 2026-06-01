import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      limit: vi.fn().mockResolvedValue([]),
    })),
  },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), asc: vi.fn(), desc: vi.fn(), ne: vi.fn(), inArray: vi.fn(),
}));
vi.mock('@/db/schema', () => ({
  tiltag: {}, indsatsOmraade: {}, indikatorMaaling: {},
  kommuneIndikator: {}, indikatorTemplate: {}, tovholderRapport: {},
}));

describe('filterStagnerede', () => {
  const tiltag = [
    { id: 't1', titel: 'Transport', indsatsOmraadeId: 'io1' },
    { id: 't2', titel: 'Varme',     indsatsOmraadeId: 'io1' },
    { id: 't3', titel: 'Affald',    indsatsOmraadeId: 'io2' },
  ];
  const cutoff = new Date('2026-01-01');

  it('flagger alle tiltag uden rapport', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    const result = filterStagnerede(tiltag, new Map(), cutoff);
    expect(result).toHaveLength(3);
  });

  it('flagger tiltag med rapport ældre end cutoff', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    const map = new Map([['t1', new Date('2025-06-01')]]);
    const result = filterStagnerede(tiltag, map, cutoff);
    expect(result.map((t) => t.id)).toContain('t1');
  });

  it('udelukker tiltag med nylig rapport', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    const map = new Map([['t2', new Date('2026-02-01')]]);
    const result = filterStagnerede(tiltag, map, cutoff);
    expect(result.map((t) => t.id)).not.toContain('t2');
  });

  it('returnerer tom liste hvis ingen igangværende', async () => {
    const { filterStagnerede } = await import('./public-dashboard');
    expect(filterStagnerede([], new Map(), cutoff)).toHaveLength(0);
  });
});

describe('getCo2eSeries', () => {
  it('returnerer data-array fra db', async () => {
    const { db } = await import('@/db');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { aar: 2022, vaerdi: 12.5 },
        { aar: 2023, vaerdi: 11.8 },
      ]),
    });
    const { getCo2eSeries } = await import('./public-dashboard');
    const result = await getCo2eSeries('kommune-1');
    expect(result).toHaveLength(2);
    expect(result[0].aar).toBe(2022);
    expect(result[1].vaerdi).toBe(11.8);
  });
});
