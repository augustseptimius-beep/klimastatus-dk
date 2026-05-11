// db/queries/rapport.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      tovholderRapport: {
        findMany: vi.fn().mockResolvedValue([{ id: 'r1', tiltagId: 't1', tovholderId: 'th1', dato: '2026-05-11' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'r2' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'r1' }]) })) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn() }));
vi.mock('@/db/schema', () => ({ tovholderRapport: {} }));

describe('getLatestRapporterForTovholder', () => {
  it('returns rapporter for tovholder', async () => {
    const { getLatestRapporterForTovholder } = await import('./rapport');
    const result = await getLatestRapporterForTovholder('th1');
    expect(result[0].tiltagId).toBe('t1');
  });

  it('returns empty array when no rapporter exist', async () => {
    const { db } = await import('@/db');
    vi.mocked(db.query.tovholderRapport.findMany).mockResolvedValueOnce([]);
    const { getLatestRapporterForTovholder } = await import('./rapport');
    const result = await getLatestRapporterForTovholder('th999');
    expect(result).toHaveLength(0);
  });
});

describe('upsertRapport', () => {
  it('inserts new rapport when none exists for dato', async () => {
    const { upsertRapport } = await import('./rapport');
    const result = await upsertRapport('th1', 't1', '2026-05-11', { statusImplementering: 'Igangværende' });
    expect(result.id).toBe('r2');
  });

  it('updates existing rapport when findFirst returns one', async () => {
    const { db } = await import('@/db');
    vi.mocked(db.query.tovholderRapport.findFirst).mockResolvedValueOnce({ id: 'r1', tiltagId: 't1', tovholderId: 'th1', dato: '2026-05-11' });

    const { upsertRapport } = await import('./rapport');
    const result = await upsertRapport('th1', 't1', '2026-05-11', { statusImplementering: 'Afsluttet' });
    expect(result.id).toBe('r1');
  });

  it('passes data fields through to update', async () => {
    const { db } = await import('@/db');
    vi.mocked(db.query.tovholderRapport.findFirst).mockResolvedValueOnce({ id: 'r1', tiltagId: 't1', tovholderId: 'th1', dato: '2026-05-11' });

    const { upsertRapport } = await import('./rapport');
    const rapportData = { statusImplementering: 'Afsluttet', barrierer: 'Ingen' };
    await upsertRapport('th1', 't1', '2026-05-11', rapportData);

    const updateMock = vi.mocked(db.update);
    expect(updateMock).toHaveBeenCalled();
    const lastCallIndex = updateMock.mock.results.length - 1;
    const setMock = updateMock.mock.results[lastCallIndex].value.set;
    expect(setMock).toHaveBeenCalledWith(rapportData);
  });
});
