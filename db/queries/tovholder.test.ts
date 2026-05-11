// db/queries/tovholder.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      tovholder: {
        findMany: vi.fn().mockResolvedValue([{ id: 'th1', navn: 'Anders', email: 'anders@k.dk', kommuneId: 'k1', aktiv: true }]),
        findFirst: vi.fn().mockResolvedValue({ id: 'th1', navn: 'Anders' }),
      },
      tovholderTiltag: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'th2', navn: 'Bo' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'th1' }]) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({ tovholder: {}, tovholderTiltag: {} }));

describe('getAllTovholdere', () => {
  it('returns list for kommuneId', async () => {
    const { getAllTovholdere } = await import('./tovholder');
    const result = await getAllTovholdere('k1');
    expect(result[0].navn).toBe('Anders');
  });
});

describe('getTovholderById', () => {
  it('returns a single tovholder by id', async () => {
    const { getTovholderById } = await import('./tovholder');
    const result = await getTovholderById('th1');
    expect(result?.id).toBe('th1');
    expect(result?.navn).toBe('Anders');
  });
});

describe('createTovholder', () => {
  it('inserts and returns new tovholder', async () => {
    const { createTovholder } = await import('./tovholder');
    const result = await createTovholder({ kommuneId: 'k1', navn: 'Bo', email: 'bo@k.dk' });
    expect(result.id).toBe('th2');
    expect(result.navn).toBe('Bo');
  });
});

describe('updateTovholder', () => {
  it('updates and returns tovholder', async () => {
    const { updateTovholder } = await import('./tovholder');
    const result = await updateTovholder('th1', { navn: 'Anders Opdateret' });
    expect(result.id).toBe('th1');
  });
});

describe('assignTiltagToTovholder', () => {
  it('inserts new assignment when none exists', async () => {
    const { assignTiltagToTovholder } = await import('./tovholder');
    const result = await assignTiltagToTovholder('th1', 't1');
    expect(result.id).toBe('th2');
  });

  it('returns existing assignment without inserting', async () => {
    const { db } = await import('@/db');
    const existingRecord = { id: 'tt1', tovholderId: 'th1', tiltagId: 't1' };
    vi.mocked(db.query.tovholderTiltag.findFirst).mockResolvedValueOnce(existingRecord);

    const { assignTiltagToTovholder } = await import('./tovholder');
    const result = await assignTiltagToTovholder('th1', 't1');
    expect(result.id).toBe('tt1');
  });
});

describe('removeTiltagFromTovholder', () => {
  it('calls delete without throwing', async () => {
    const { removeTiltagFromTovholder } = await import('./tovholder');
    await expect(removeTiltagFromTovholder('th1', 't1')).resolves.toBeUndefined();
  });
});
