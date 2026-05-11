import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    query: {
      kommune: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'k1', navn: 'Thisted', subdomain: 'thisted' },
        ]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'k1', navn: 'Thisted', subdomain: 'thisted',
        }),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'k2', navn: 'Aalborg', subdomain: 'aalborg' }]),
      })),
    })),
  },
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn() }));
vi.mock('@/db/schema', () => ({ kommune: {} }));

describe('getAllKommuner', () => {
  it('returns list of kommuner', async () => {
    const { getAllKommuner } = await import('./kommune');
    const result = await getAllKommuner();
    expect(result).toHaveLength(1);
    expect(result[0].navn).toBe('Thisted');
  });
});
