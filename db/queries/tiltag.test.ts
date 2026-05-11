import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      tiltag: {
        findMany: vi.fn().mockResolvedValue([
          { id: 't1', titel: 'Solceller', type: 'reduction', status: 'planned', kommuneId: 'k1', indsatsOmraadeId: 'io1' },
        ]),
        findFirst: vi.fn().mockResolvedValue({ id: 't1', titel: 'Solceller' }),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([
            { id: 't1', titel: 'Solceller', type: 'reduction', status: 'planned', indsatsOmraadeId: 'io1', beskrivelse: null },
          ]),
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 't2', titel: 'Ny' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 't1', titel: 'Opdateret' }]) })) })) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn(), and: vi.fn() }));
vi.mock('@/db/schema', () => ({ tiltag: {}, tovholderTiltag: {} }));

describe('getAllTiltag', () => {
  it('returns tiltag for kommune', async () => {
    const { getAllTiltag } = await import('./tiltag');
    const result = await getAllTiltag('k1');
    expect(result[0].titel).toBe('Solceller');
  });
});

describe('getTiltagById', () => {
  it('returns a single tiltag by id', async () => {
    const { getTiltagById } = await import('./tiltag');
    const result = await getTiltagById('t1');
    expect(result).toBeDefined();
    expect(result.id).toBe('t1');
    expect(result.titel).toBe('Solceller');
  });
});

describe('getTiltagForTovholder', () => {
  it('returns tiltag assigned to a tovholder', async () => {
    const { getTiltagForTovholder } = await import('./tiltag');
    const result = await getTiltagForTovholder('th1');
    expect(result[0].titel).toBe('Solceller');
  });
});

describe('createTiltag', () => {
  it('inserts and returns new record', async () => {
    const { createTiltag } = await import('./tiltag');
    const result = await createTiltag({
      kommuneId: 'k1', indsatsOmraadeId: 'io1',
      titel: 'Ny', type: 'reduction',
    });
    expect(result.titel).toBe('Ny');
  });
});

describe('updateTiltag', () => {
  it('updates and returns updated record', async () => {
    const { updateTiltag } = await import('./tiltag');
    const result = await updateTiltag('t1', { titel: 'Opdateret' });
    expect(result).toBeDefined();
    expect(result.id).toBe('t1');
    expect(result.titel).toBe('Opdateret');
  });
});
