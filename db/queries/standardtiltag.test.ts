import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = vi.fn();
vi.mock('@/db', () => ({ db: { query: { standardtiltag: { findMany } } } }));

beforeEach(() => { findMany.mockReset(); findMany.mockResolvedValue([]); });

describe('getStandardtiltagKatalog', () => {
  it('henter aktive tiltag sorteret', async () => {
    const { getStandardtiltagKatalog } = await import('./standardtiltag');
    await getStandardtiltagKatalog();
    expect(findMany).toHaveBeenCalledOnce();
  });

  it('filtrerer på kategori når angivet', async () => {
    const { getStandardtiltagKatalog } = await import('./standardtiltag');
    await getStandardtiltagKatalog('energi');
    const arg = findMany.mock.calls[0][0];
    expect(arg.where).toBeDefined();
  });
});
