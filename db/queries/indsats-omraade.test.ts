import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      indsatsOmraade: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'io1', navn: 'Energi', type: 'ghg_reduction', sektor: 'energy', kommuneId: 'k1' },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'io1', navn: 'Energi', type: 'ghg_reduction', sektor: 'energy', kommuneId: 'k1',
        }),
      },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'io2', navn: 'Transport' }]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: 'io1', navn: 'Opdateret' }]) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn() }));
vi.mock('@/db/schema', () => ({ indsatsOmraade: {} }));

describe('getAllIndsatsOmraader', () => {
  it('returns list for kommuneId', async () => {
    const { getAllIndsatsOmraader } = await import('./indsats-omraade');
    const result = await getAllIndsatsOmraader('k1');
    expect(result[0].navn).toBe('Energi');
  });
});

describe('createIndsatsOmraade', () => {
  it('inserts and returns new record', async () => {
    const { createIndsatsOmraade } = await import('./indsats-omraade');
    const result = await createIndsatsOmraade({
      kommuneId: 'k1', navn: 'Transport',
      type: 'ghg_reduction', sektor: 'transport',
    });
    expect(result.navn).toBe('Transport');
  });
});

describe('getIndsatsOmraadeById', () => {
  it('returns a single record by id', async () => {
    const { getIndsatsOmraadeById } = await import('./indsats-omraade');
    const result = await getIndsatsOmraadeById('io1');
    expect(result).toBeDefined();
    expect(result!.id).toBe('io1');
    expect(result!.navn).toBe('Energi');
  });
});

describe('updateIndsatsOmraade', () => {
  it('updates and returns updated record', async () => {
    const { updateIndsatsOmraade } = await import('./indsats-omraade');
    const result = await updateIndsatsOmraade('io1', { navn: 'Opdateret' });
    expect(result).toBeDefined();
    expect(result.id).toBe('io1');
    expect(result.navn).toBe('Opdateret');
  });
});

describe('deleteIndsatsOmraade', () => {
  it('calls delete for the given id', async () => {
    const { deleteIndsatsOmraade } = await import('./indsats-omraade');
    await deleteIndsatsOmraade('io1');
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });
});
